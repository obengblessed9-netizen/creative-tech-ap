import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Radio, Send, Users, VideoOff, Video as VideoIcon, Mic, MicOff, MessageSquare, Trash2, ImagePlus, Link2, Eye, Copy, Share2, UserPlus, LogOut, Flag, Ban, MoreVertical, QrCode, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import type { RealtimeChannel } from "@supabase/supabase-js";
import HostStudio from "@/components/live/HostStudio";
import PreJoinPermissions from "@/components/live/PreJoinPermissions";
import { LinkPreviewList } from "@/components/LinkPreviewCard";
import { extractUrls, isBlockedUrl } from "@/lib/safeLink";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { QRCodeSVG } from "qrcode.react";

interface ChatMsg { id: string; user_id: string; message: string; created_at: string; }
interface StreamPost { id: string; user_id: string; content: string; image_url: string | null; link_url: string | null; views_count: number; created_at: string; }
interface Stream { id: string; host_id: string; title: string; description: string | null; status: string; viewer_count: number; }
interface Viewer { id: string; user_id: string; display_name: string | null; joined_at: string; left_at: string | null; }

const ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

const LiveStream = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  // Allow the host's account to join their own stream as a participant from a second device.
  // e.g. open the stream on a laptop with ?as=viewer while phone is hosting.
  const forceViewer = searchParams.get("as") === "viewer";
  const videoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const signalRef = useRef<RealtimeChannel | null>(null);
  // Host: peerId -> RTCPeerConnection (one per viewer)
  // Viewer: single connection keyed by "host"
  const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const myPeerIdRef = useRef<string>(crypto.randomUUID());
  const pendingViewersRef = useRef<Map<string, string>>(new Map()); // peerId -> name
  // Viewer's own outgoing camera (so the host can see their face)
  const viewerLocalStreamRef = useRef<MediaStream | null>(null);
  // Host: peerId -> {name, stream} of incoming viewer cams
  const peerStreamsRef = useRef<Map<string, { name: string; stream: MediaStream }>>(new Map());
  type PeerStatus = "connecting" | "connected" | "failed" | "disconnected";
  const peerStatusesRef = useRef<Map<string, PeerStatus>>(new Map());
  const [peerSourcesVersion, setPeerSourcesVersion] = useState(0);
  const bumpPeerSources = () => setPeerSourcesVersion((v) => v + 1);

  const [stream, setStream] = useState<Stream | null>(null);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [text, setText] = useState("");
  const [broadcasting, setBroadcasting] = useState(false);
  const [hasRemote, setHasRemote] = useState(false);
  const [posts, setPosts] = useState<StreamPost[]>([]);
  const [postContent, setPostContent] = useState("");
  const [postImage, setPostImage] = useState<File | null>(null);
  const [postLink, setPostLink] = useState("");
  const [posting, setPosting] = useState(false);
  const [joined, setJoined] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [permsOpen, setPermsOpen] = useState(false);
  const [hostPermsOpen, setHostPermsOpen] = useState(false);
  const [joinMode, setJoinMode] = useState<"full" | "listener">("full");
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [blockedIds, setBlockedIds] = useState<Set<string>>(new Set());
  const [reportTarget, setReportTarget] = useState<{ userId: string; reason: string } | null>(null);
  const [viewers, setViewers] = useState<Viewer[]>([]);
  const [hostStream, setHostStream] = useState<MediaStream | null>(null);
  const [qrOpen, setQrOpen] = useState(false);
  const [viewerConn, setViewerConn] = useState<"idle" | "signaling" | "connecting" | "connected" | "failed" | "disconnected">("idle");
  const [viewerError, setViewerError] = useState<string>("");
  const viewedPostsRef = useRef<Set<string>>(new Set());
  const participantUrl = stream ? `${window.location.origin}/live/${stream.id}?as=viewer` : "";

  const isHost = !!(stream && user && stream.host_id === user.id) && !forceViewer;

  // Load stream + chat + posts and subscribe to realtime DB changes
  useEffect(() => {
    if (!id) return;
    supabase.from("live_streams").select("*").eq("id", id).single().then(({ data }) => {
      if (data) setStream(data as Stream);
    });
    supabase.from("live_chat_messages").select("*").eq("stream_id", id).order("created_at").then(({ data }) => {
      setMessages((data as ChatMsg[]) || []);
    });
    supabase.from("live_stream_posts").select("*").eq("stream_id", id).order("created_at", { ascending: false }).then(({ data }) => {
      setPosts((data as StreamPost[]) || []);
    });

    const ch = supabase
      .channel(`live-db-${id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "live_chat_messages", filter: `stream_id=eq.${id}` },
        (p) => setMessages((m) => [...m, p.new as ChatMsg]))
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "live_streams", filter: `id=eq.${id}` },
        (p) => setStream(p.new as Stream))
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "live_stream_posts", filter: `stream_id=eq.${id}` },
        (p) => setPosts((x) => [p.new as StreamPost, ...x]))
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "live_stream_posts", filter: `stream_id=eq.${id}` },
        (p) => setPosts((x) => x.filter((y) => y.id !== (p.old as any).id)))
      .subscribe();

    return () => { supabase.removeChannel(ch); };
  }, [id]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ---- WebRTC signaling via Supabase broadcast channel ----
  const sendSignal = (event: string, payload: any) => {
    signalRef.current?.send({ type: "broadcast", event, payload });
  };

  const createHostPeerForViewer = async (viewerId: string, viewerName?: string) => {
    if (!localStreamRef.current) return;
    if (peersRef.current.has(viewerId)) {
      peersRef.current.get(viewerId)?.close();
    }
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    peersRef.current.set(viewerId, pc);
    peerStatusesRef.current.set(viewerId, "connecting");
    // Seed a placeholder so the host's Joined panel shows the participant immediately
    if (!peerStreamsRef.current.has(viewerId)) {
      peerStreamsRef.current.set(viewerId, { name: viewerName || viewerId.slice(0, 6), stream: null as any });
    }
    bumpPeerSources();

    localStreamRef.current.getTracks().forEach((t) => pc.addTrack(t, localStreamRef.current!));

    // Host receives viewer's outgoing camera (if they shared one)
    pc.ontrack = (e) => {
      const incoming = e.streams[0] || new MediaStream([e.track]);
      const existing = peerStreamsRef.current.get(viewerId);
      const name = viewerName || existing?.name || viewerId.slice(0, 6);
      peerStreamsRef.current.set(viewerId, { name, stream: incoming });
      bumpPeerSources();
    };

    pc.onicecandidate = (e) => {
      if (e.candidate) sendSignal("ice", { from: myPeerIdRef.current, to: viewerId, candidate: e.candidate });
    };
    pc.onconnectionstatechange = () => {
      const s = pc.connectionState;
      if (s === "connected") peerStatusesRef.current.set(viewerId, "connected");
      else if (s === "connecting" || s === "new") peerStatusesRef.current.set(viewerId, "connecting");
      else if (s === "failed" || s === "disconnected" || s === "closed") {
        pc.close();
        peerStatusesRef.current.delete(viewerId);
        peerStreamsRef.current.delete(viewerId);
        peersRef.current.delete(viewerId);
      }
      bumpPeerSources();
    };

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    sendSignal("offer", { from: myPeerIdRef.current, to: viewerId, sdp: offer });
  };


  const handleViewerOffer = async (from: string, sdp: RTCSessionDescriptionInit) => {
    const existing = peersRef.current.get("host");
    if (existing) existing.close();
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    peersRef.current.set("host", pc);
    setViewerConn("signaling");
    setViewerError("");

    // Send our own camera back to the host so they can see our face
    if (viewerLocalStreamRef.current) {
      viewerLocalStreamRef.current.getTracks().forEach((t) =>
        pc.addTrack(t, viewerLocalStreamRef.current!)
      );
    }

    const remote = new MediaStream();
    remoteStreamRef.current = remote;

    pc.ontrack = (e) => {
      e.streams[0]?.getTracks().forEach((t) => remote.addTrack(t));
      if (videoRef.current) {
        videoRef.current.srcObject = remote;
        videoRef.current.play().catch(() => {});
      }
      setHasRemote(true);
    };
    pc.onicecandidate = (e) => {
      if (e.candidate) sendSignal("ice", { from: myPeerIdRef.current, to: from, candidate: e.candidate });
    };
    pc.onconnectionstatechange = () => {
      const s = pc.connectionState;
      if (s === "connecting") setViewerConn("connecting");
      else if (s === "connected") setViewerConn("connected");
      else if (s === "failed") { setViewerConn("failed"); setViewerError("Connection failed. Check your network and reload."); }
      else if (s === "disconnected") setViewerConn("disconnected");
    };

    await pc.setRemoteDescription(sdp);
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    sendSignal("answer", { from: myPeerIdRef.current, to: from, sdp: answer });
  };

  // Set up signaling channel once stream is loaded
  useEffect(() => {
    if (!id || !stream) return;
    const ch = supabase.channel(`webrtc-${id}`, { config: { broadcast: { self: false } } });

    ch.on("broadcast", { event: "join" }, async ({ payload }) => {
      if (!isHost) return;
      const name = payload.name || payload.from?.slice(0, 6);
      if (!localStreamRef.current) {
        pendingViewersRef.current.set(payload.from, name);
        return;
      }
      await createHostPeerForViewer(payload.from, name);
    });

    // Host broadcasts readiness so viewers (already on the page) re-announce themselves
    ch.on("broadcast", { event: "host-ready" }, () => {
      if (isHost) return;
      ch.send({ type: "broadcast", event: "join", payload: { from: myPeerIdRef.current } });
    });

    ch.on("broadcast", { event: "offer" }, async ({ payload }) => {
      if (payload.to !== myPeerIdRef.current) return;
      // Only viewers handle offers
      if (isHost) return;
      await handleViewerOffer(payload.from, payload.sdp);
    });

    ch.on("broadcast", { event: "answer" }, async ({ payload }) => {
      if (payload.to !== myPeerIdRef.current) return;
      const pc = peersRef.current.get(payload.from);
      if (pc && pc.signalingState !== "stable") {
        await pc.setRemoteDescription(payload.sdp);
      }
    });

    ch.on("broadcast", { event: "ice" }, async ({ payload }) => {
      if (payload.to !== myPeerIdRef.current) return;
      const key = isHost ? payload.from : "host";
      const pc = peersRef.current.get(key);
      if (pc) {
        try { await pc.addIceCandidate(payload.candidate); } catch (e) { console.warn("ICE add failed", e); }
      }
    });

    ch.on("broadcast", { event: "leave" }, ({ payload }) => {
      if (!isHost) return;
      const viewerId = payload.from;
      if (peersRef.current.has(viewerId)) {
        peersRef.current.get(viewerId)?.close();
        peersRef.current.delete(viewerId);
      }
      peerStatusesRef.current.delete(viewerId);
      peerStreamsRef.current.delete(viewerId);
      bumpPeerSources();
    });

    ch.subscribe((status) => {
      if (status !== "SUBSCRIBED") return;
      if (isHost) {
        // Announce readiness so viewers reconnect
        ch.send({ type: "broadcast", event: "host-ready", payload: { from: myPeerIdRef.current } });
      } else {
        // Viewer announces presence so host opens a peer
        ch.send({ type: "broadcast", event: "join", payload: { from: myPeerIdRef.current } });
      }
    });

    signalRef.current = ch;
    return () => {
      supabase.removeChannel(ch);
      signalRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, stream?.id, isHost]);

  // Host: start camera
  const startBroadcast = async () => {
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        toast.error("Camera not supported. Use Chrome/Safari over HTTPS.");
        return;
      }
      const media = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: true,
      });
      localStreamRef.current = media;
      setHostStream(media);
      if (videoRef.current) {
        videoRef.current.srcObject = media;
        try { await videoRef.current.play(); } catch {}
      }
      setBroadcasting(true);
      toast.success("You're live");
      // Tell any viewers already on the page to (re)connect
      sendSignal("host-ready", { from: myPeerIdRef.current });
      // Flush any viewers that announced before the camera was ready
      const pending = Array.from(pendingViewersRef.current.entries());
      pendingViewersRef.current.clear();
      for (const [vId, vName] of pending) {
        try { await createHostPeerForViewer(vId, vName); } catch (e) { console.warn(e); }
      }
    } catch (e: any) {
      console.error(e);
      const name = e?.name || "";
      if (name === "NotAllowedError") toast.error("Camera permission denied.");
      else if (name === "NotFoundError") toast.error("No camera found.");
      else if (name === "NotReadableError") toast.error("Camera in use by another app.");
      else if (location.protocol !== "https:" && location.hostname !== "localhost") toast.error("Camera requires HTTPS.");
      else toast.error(e?.message || "Could not start camera");
    }
  };

  const stopBroadcast = async () => {
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    setHostStream(null);
    peersRef.current.forEach((pc) => pc.close());
    peersRef.current.clear();
    setBroadcasting(false);
  };

  const endStream = async () => {
    if (!stream) return;
    await stopBroadcast();
    await supabase.from("live_streams").update({ status: "ended", ended_at: new Date().toISOString() }).eq("id", stream.id);
    toast.success("Stream ended. Start a new one anytime.");
    navigate("/live?start=new");
  };

  const sendMessage = async () => {
    if (!user) return navigate("/auth");
    if (!text.trim() || !id) return;
    if (stream?.status === "ended") {
      toast.error("This stream has ended. Chat is closed.");
      return;
    }
    const msg = text;
    setText("");
    await supabase.from("live_chat_messages").insert({ stream_id: id, user_id: user.id, message: msg });
  };

  const submitPost = async () => {
    if (!user) return navigate("/auth");
    if (!postContent.trim() || !id) return;
    let linksJoined: string | null = null;
    if (postLink.trim()) {
      const urls = extractUrls(postLink);
      if (urls.length === 0) { toast.error("No valid links found"); return; }
      const blocked = urls.filter(isBlockedUrl);
      if (blocked.length) { toast.error(`Blocked domain: ${blocked[0]}`); return; }
      linksJoined = urls.join("\n");
    }
    setPosting(true);
    try {
      let imageUrl: string | null = null;
      if (postImage) {
        const ext = postImage.name.split(".").pop();
        const path = `${user.id}/live-${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("artwork-images").upload(path, postImage);
        if (upErr) throw upErr;
        imageUrl = supabase.storage.from("artwork-images").getPublicUrl(path).data.publicUrl;
      }
      const { error } = await supabase.from("live_stream_posts").insert({
        stream_id: id, user_id: user.id, content: postContent, image_url: imageUrl, link_url: linksJoined,
      });
      if (error) throw error;
      setPostContent("");
      setPostImage(null);
      setPostLink("");
    } catch (e: any) {
      toast.error(e.message || "Failed to post");
    } finally {
      setPosting(false);
    }
  };

  const deletePost = async (postId: string) => {
    await supabase.from("live_stream_posts").delete().eq("id", postId);
  };

  // Track post views once per session
  useEffect(() => {
    posts.forEach((p) => {
      if (viewedPostsRef.current.has(p.id)) return;
      viewedPostsRef.current.add(p.id);
      supabase.rpc("increment_post_views" as any, { _post_id: p.id });
    });
  }, [posts]);

  // Host pre-broadcast auth gate
  const [hostReady, setHostReady] = useState(false);

  // Auto-start camera for host once they pass the gate
  useEffect(() => {
    if (isHost && hostReady && !broadcasting && !localStreamRef.current) startBroadcast();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHost, hostReady]);

  // Restore joined state from sessionStorage to prevent double counting on refresh
  useEffect(() => {
    if (!id) return;
    if (sessionStorage.getItem(`joined-${id}`) === "1") setJoined(true);
    try {
      const raw = localStorage.getItem(`live-blocks-${id}`);
      if (raw) setBlockedIds(new Set(JSON.parse(raw)));
    } catch {}
  }, [id]);

  const persistBlocks = (next: Set<string>) => {
    setBlockedIds(new Set(next));
    if (id) localStorage.setItem(`live-blocks-${id}`, JSON.stringify([...next]));
  };

  const logModEvent = async (action: string, targetUserId: string | null, reason: string | null = null, metadata: any = {}) => {
    if (!user || !id) return;
    try {
      await supabase.from("live_moderation_events").insert({
        stream_id: id,
        actor_id: user.id,
        target_user_id: targetUserId,
        action,
        reason,
        metadata,
      });
    } catch (e) {
      console.warn("Failed to log moderation event", e);
    }
  };

  const blockUser = (userId: string, opts?: { silent?: boolean; reason?: string }) => {
    if (userId === user?.id) return;
    const next = new Set(blockedIds);
    next.add(userId);
    persistBlocks(next);
    logModEvent("block", userId, opts?.reason || null);
    if (!opts?.silent) toast.success("User blocked. Their messages and presence are hidden for you.");
  };

  const unblockUser = (userId: string) => {
    const next = new Set(blockedIds);
    next.delete(userId);
    persistBlocks(next);
    logModEvent("unblock", userId);
    toast.success("User unblocked.");
  };

  const submitReport = async () => {
    if (!reportTarget || !user || !id) return;
    const { reason, userId } = reportTarget;
    try {
      const { error } = await supabase.from("live_reports").insert({
        stream_id: id,
        reporter_id: user.id,
        reported_user_id: userId,
        reason: reason.trim() || null,
      });
      if (error) throw error;
      await logModEvent("report", userId, reason.trim() || null);
      toast.success("Report submitted. Our team will review it.");
      // Auto-block after report for the reporter's session
      blockUser(userId, { silent: true, reason: "auto-block after report" });
    } catch (e: any) {
      toast.error(e.message || "Could not submit report");
    } finally {
      setReportTarget(null);
    }
  };

  // Load + subscribe to viewers for everyone
  useEffect(() => {
    if (!stream?.id) return;
    supabase
      .from("live_stream_viewers")
      .select("*")
      .eq("stream_id", stream.id)
      .order("joined_at", { ascending: false })
      .then(({ data }) => setViewers((data as Viewer[]) || []));
    const ch = supabase
      .channel(`viewers-${stream.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "live_stream_viewers", filter: `stream_id=eq.${stream.id}` },
        (p) => {
          if (p.eventType === "INSERT") setViewers((v) => [p.new as Viewer, ...v.filter((x) => x.id !== (p.new as any).id)]);
          else if (p.eventType === "UPDATE") setViewers((v) => v.map((x) => x.id === (p.new as any).id ? p.new as Viewer : x));
          else if (p.eventType === "DELETE") setViewers((v) => v.filter((x) => x.id !== (p.old as any).id));
        })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [isHost, stream?.id]);

  // Actual join (after pre-join permissions + confirmation)
  const performJoin = async () => {
    if (!user) { navigate("/auth"); return; }
    if (!stream) return;
    if (sessionStorage.getItem(`joined-${stream.id}`) === "1") {
      setJoined(true);
      return;
    }
    sessionStorage.setItem(`joined-${stream.id}`, "1");
    setJoined(true);
    // Capture viewer's own camera so the host can see their face (full mode only)
    if (joinMode === "full" && !viewerLocalStreamRef.current) {
      try {
        const media = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 360 } },
          audio: true,
        });
        viewerLocalStreamRef.current = media;
        // Re-announce so host renegotiates and picks up our tracks
        sendSignal("join", {
          from: myPeerIdRef.current,
          name: user.email?.split("@")[0] || null,
        });
      } catch (e) {
        console.warn("Viewer camera unavailable", e);
      }
    }
    try {
      const { error: insErr } = await supabase.from("live_stream_viewers").insert({
        stream_id: stream.id,
        user_id: user.id,
        display_name: user.email?.split("@")[0] || null,
      });
      if (!insErr) {
        await supabase
          .from("live_streams")
          .update({ viewer_count: (stream.viewer_count || 0) + 1 })
          .eq("id", stream.id);
      }
    } catch {}
    if (videoRef.current) {
      videoRef.current.muted = false;
      try { await videoRef.current.play(); } catch {}
    }
    toast.success(joinMode === "listener" ? "You're in as a listener — enjoy the live!" : "You're in — enjoy the live!");
  };

  const leaveLive = async () => {
    if (!stream || !user) return;
    if (!joined) return;
    sessionStorage.removeItem(`joined-${stream.id}`);
    setJoined(false);
    try {
      await supabase
        .from("live_stream_viewers")
        .update({ left_at: new Date().toISOString() })
        .eq("stream_id", stream.id)
        .eq("user_id", user.id);
      await supabase
        .from("live_streams")
        .update({ viewer_count: Math.max(0, (stream.viewer_count || 1) - 1) })
        .eq("id", stream.id);
    } catch {}
    
    sendSignal("leave", { from: myPeerIdRef.current });
    peersRef.current.forEach((pc) => pc.close());
    peersRef.current.clear();
    setViewerConn("idle");
    setHasRemote(false);
    if (remoteStreamRef.current) {
      remoteStreamRef.current.getTracks().forEach((t) => t.stop());
      remoteStreamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.muted = true;
      videoRef.current.srcObject = null;
    }
    viewerLocalStreamRef.current?.getTracks().forEach((t) => t.stop());
    viewerLocalStreamRef.current = null;
    toast.success("You left the live session");
  };


  // Cleanup on unmount
  useEffect(() => () => {
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    viewerLocalStreamRef.current?.getTracks().forEach((t) => t.stop());
    peersRef.current.forEach((pc) => pc.close());
    peersRef.current.clear();
  }, []);

  if (!stream) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="pt-24 container">Loading...</main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-24 pb-20">
        <div className="container max-w-7xl grid gap-6 lg:grid-cols-[1.5fr_1fr]">
          <div>
            {/* videoRef is attached to the visible viewer video below; host renders inside HostStudio */}

            {isHost && !hostReady ? (
              <Card className="bg-card border-border p-0 overflow-hidden">
                <div className="bg-secondary/30 px-4 py-2 text-xs text-muted-foreground border-b border-border">
                  art.galleria/live · Host Sign In
                </div>
                <div className="px-6 py-10 flex flex-col items-center text-center">
                  <p className="font-display text-5xl font-bold tracking-tight" style={{ color: "hsl(217 91% 55%)" }}>
                    AGMS
                  </p>
                  <h2 className="mt-1 font-display text-3xl font-bold text-foreground">Live Studio</h2>
                  <p className="mt-2 text-sm text-muted-foreground max-w-xs">
                    Sign in to host this broadcast, switch accounts, or jump straight in.
                  </p>

                  <div className="mt-8 w-full max-w-sm space-y-3">
                    <Button
                      onClick={() => setHostReady(true)}
                      className="w-full h-12 text-base"
                      style={{ backgroundColor: "hsl(217 91% 55%)", color: "white" }}
                    >
                      Sign In as {user?.email?.split("@")[0] || "Host"}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => navigate("/auth")}
                      className="w-full h-12 text-base border-border"
                    >
                      Sign Up / Switch Account
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setHostReady(true)}
                      className="w-full h-12 text-base border-border"
                    >
                      Start Broadcast
                    </Button>
                  </div>

                  <div className="mt-10 flex items-center gap-3 text-xs text-muted-foreground">
                    <button className="hover:text-foreground">About AGMS</button>
                    <span className="opacity-40">|</span>
                    <button className="hover:text-foreground">English ▾</button>
                  </div>
                </div>
              </Card>
            ) : isHost ? (
              <HostStudio
                title={stream.title}
                hostName={user?.email?.split("@")[0] || "You"}
                hostStream={hostStream}
                viewers={viewers}
                peerStreams={(() => {
                  // touch the version state so this rebuilds when peer cams change
                  void peerSourcesVersion;
                  return Array.from(peerStreamsRef.current.entries()).map(([pid, v]) => ({
                    id: pid,
                    name: v.name,
                    stream: v.stream,
                    status: peerStatusesRef.current.get(pid) || "connecting",
                  }));
                })()}
                onEndStream={endStream}
              />
            ) : (
              <div className="aspect-video rounded-lg overflow-hidden bg-black border border-border relative">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  controls
                  className="w-full h-full object-cover"
                />
                {!hasRemote && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-4 text-center bg-black/70">
                    {viewerConn === "failed" || viewerConn === "disconnected" ? (
                      <>
                        <AlertTriangle className="h-10 w-10 text-destructive" />
                        <p className="text-sm font-semibold text-foreground">
                          {viewerConn === "failed" ? "Connection failed" : "Disconnected from host"}
                        </p>
                        <p className="text-xs text-muted-foreground max-w-xs">
                          {viewerError || "Check your network or ask the host to refresh, then reload this page."}
                        </p>
                        <Button size="sm" variant="outline" onClick={() => window.location.reload()}>
                          Reload
                        </Button>
                      </>
                    ) : viewerConn === "connected" ? (
                      <>
                        <CheckCircle2 className="h-10 w-10 text-primary" />
                        <p className="text-sm font-semibold text-foreground">Connected — waiting for video…</p>
                        <p className="text-xs text-muted-foreground">The host's camera will appear here in a moment.</p>
                      </>
                    ) : viewerConn === "signaling" || viewerConn === "connecting" ? (
                      <>
                        <Loader2 className="h-10 w-10 text-primary animate-spin" />
                        <p className="text-sm font-semibold text-foreground">Connecting to {stream.title}…</p>
                        <p className="text-xs text-muted-foreground">Negotiating video stream with the host.</p>
                      </>
                    ) : (
                      <>
                        <Radio className="h-10 w-10 text-primary animate-pulse" />
                        <p className="text-sm font-semibold text-foreground">
                          {joined ? `Waiting for ${stream.title} to start…` : "Tap Join Live to connect"}
                        </p>
                        <p className="text-xs text-muted-foreground max-w-xs">
                          {joined
                            ? "The host hasn't started their camera yet. You'll see them as soon as they go live."
                            : "You'll be asked for camera and microphone permission so the host can see and hear you."}
                        </p>
                      </>
                    )}
                  </div>
                )}
                {stream.status === "live" && (
                  <span className="absolute top-3 left-3 rounded bg-destructive px-2 py-1 text-xs font-bold text-destructive-foreground">● LIVE</span>
                )}
                <span className="absolute top-3 right-3 flex items-center gap-1 rounded bg-background/80 px-2 py-1 text-xs text-foreground">
                  <Users className="h-3 w-3" /> {stream.viewer_count}
                </span>
                <span className="absolute bottom-3 left-3 rounded bg-background/80 px-2 py-1 text-xs text-foreground">
                  Host feed · {stream.title}
                </span>
              </div>
            )}

            <div className="mt-4">
              <h1 className="font-display text-2xl font-bold text-foreground">{stream.title}</h1>
              {stream.description && <p className="mt-1 text-muted-foreground">{stream.description}</p>}
            </div>

            {/* Ended banner */}
            {stream.status === "ended" && (
              <div className="mt-4 rounded-lg border border-destructive/40 bg-destructive/10 p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                  <p className="font-display text-base font-semibold text-foreground flex items-center gap-2">
                    <VideoOff className="h-4 w-4 text-destructive" /> This live session has ended
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Joining, chat, and viewer interactions are disabled. Browse other sessions or start a new one.
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => navigate("/live/ended")}>
                    Past sessions
                  </Button>
                  {isHost && (
                    <Button size="sm" className="bg-gradient-gold text-primary-foreground" onClick={() => navigate("/live?start=new")}>
                      Start New Live
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* Visitor join / leave section */}
            {!isHost && stream.status !== "ended" && (
              <Card className="mt-4 p-4 bg-card border-border">
                <div className="flex items-center gap-2 border-b border-border pb-2">
                  <UserPlus className="h-5 w-5 text-primary" />
                  <h3 className="font-display text-lg font-semibold text-foreground">
                  {joined ? "You're in the Live Session" : "Join the Live Session"}
                  </h3>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  {joined
                    ? "You're connected. Leave anytime to mute and free up your viewer slot."
                    : "We'll check your camera and mic, then drop you straight into the room."}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {!joined ? (
                    <Button
                      type="button"
                      className="bg-gradient-gold text-primary-foreground"
                      onClick={() => setPermsOpen(true)}
                    >
                      <UserPlus className="mr-2 h-4 w-4" /> Join Live
                    </Button>
                  ) : (
                    <Button type="button" variant="destructive" onClick={leaveLive}>
                      <LogOut className="mr-2 h-4 w-4" /> Leave Live
                    </Button>
                  )}
                </div>
              </Card>
            )}

            {isHost && (
              <>
                <div className="mt-4 flex flex-wrap gap-2">
                  {!broadcasting ? (
                    <Button onClick={() => setHostPermsOpen(true)} className="bg-gradient-gold text-primary-foreground">
                      <Radio className="mr-2 h-4 w-4" /> Start Camera
                    </Button>
                  ) : (
                    <>
                      <Button
                        onClick={() => {
                          const s = localStreamRef.current;
                          if (!s) return;
                          const next = !micOn;
                          s.getAudioTracks().forEach((t) => (t.enabled = next));
                          setMicOn(next);
                          toast.success(next ? "Mic on" : "Mic muted");
                        }}
                        variant="outline"
                      >
                        {micOn ? <Mic className="mr-2 h-4 w-4" /> : <MicOff className="mr-2 h-4 w-4 text-destructive" />}
                        {micOn ? "Mute" : "Unmute"}
                      </Button>
                      <Button
                        onClick={() => {
                          const s = localStreamRef.current;
                          if (!s) return;
                          const next = !camOn;
                          s.getVideoTracks().forEach((t) => (t.enabled = next));
                          setCamOn(next);
                          toast.success(next ? "Camera on" : "Camera off");
                        }}
                        variant="outline"
                      >
                        {camOn ? <VideoIcon className="mr-2 h-4 w-4" /> : <VideoOff className="mr-2 h-4 w-4 text-destructive" />}
                        {camOn ? "Hide" : "Show"} Video
                      </Button>
                      <Button onClick={stopBroadcast} variant="outline">
                        <VideoOff className="mr-2 h-4 w-4" /> Stop Camera
                      </Button>
                    </>
                  )}
                  <Button
                    onClick={() => {
                      navigator.clipboard?.writeText(participantUrl).then(
                        () => toast.success("Participant link copied. Open it on your other device to join."),
                        () => toast.error("Could not copy. Link: " + participantUrl)
                      );
                    }}
                    variant="outline"
                  >
                    <Share2 className="mr-2 h-4 w-4" /> Join from another device
                  </Button>
                  <Button onClick={() => setQrOpen(true)} variant="outline">
                    <QrCode className="mr-2 h-4 w-4" /> Show QR code
                  </Button>
                  <Button onClick={endStream} variant="destructive">End Stream</Button>
                </div>

              </>
            )}

            {/* Viewer panel (visible to everyone) */}
            <Card className="mt-4 p-4 bg-card border-border">
              <div className="flex items-center gap-2 border-b border-border pb-2">
                <Users className="h-5 w-5 text-primary" />
                <h3 className="font-display text-lg font-semibold text-foreground">Viewers ({viewers.filter((v) => !v.left_at).length} active)</h3>
              </div>
              <ul className="mt-3 max-h-64 overflow-y-auto divide-y divide-border">
                {viewers.length === 0 && <li className="text-sm text-muted-foreground py-2">No viewers yet.</li>}
                {viewers.filter((v) => !blockedIds.has(v.user_id)).map((v) => (
                  <li key={v.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                    <div className="min-w-0">
                      <p className="text-foreground font-medium truncate">{v.display_name || v.user_id.slice(0, 8)}</p>
                      <p className="text-xs text-muted-foreground">
                        joined {new Date(v.joined_at).toLocaleTimeString()}
                        {v.left_at && ` · left ${new Date(v.left_at).toLocaleTimeString()}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className={`text-xs px-2 py-0.5 rounded ${v.left_at ? "bg-secondary text-muted-foreground" : "bg-primary/10 text-primary"}`}>
                        {v.left_at ? "Left" : "Live"}
                      </span>
                      {v.user_id !== user?.id && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="text-muted-foreground hover:text-foreground p-1">
                              <MoreVertical className="h-3.5 w-3.5" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-card border-border">
                            <DropdownMenuItem onClick={() => setReportTarget({ userId: v.user_id, reason: "" })}>
                              <Flag className="h-4 w-4 mr-2" /> Report
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {blockedIds.has(v.user_id) ? (
                              <DropdownMenuItem onClick={() => unblockUser(v.user_id)}>
                                <Ban className="h-4 w-4 mr-2" /> Unblock
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem onClick={() => blockUser(v.user_id)} className="text-destructive focus:text-destructive">
                                <Ban className="h-4 w-4 mr-2" /> Block
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
              {blockedIds.size > 0 && (
                <p className="mt-2 text-[11px] text-muted-foreground italic pt-2 border-t border-border">
                  {blockedIds.size} blocked user(s) hidden.{" "}
                  <button className="underline hover:text-foreground" onClick={() => persistBlocks(new Set())}>
                    Unblock all
                  </button>
                </p>
              )}
            </Card>

            {/* Pre-join permissions step (viewer) */}
            <PreJoinPermissions
              open={permsOpen}
              streamId={id}
              onClose={() => setPermsOpen(false)}
              onContinue={(opts) => {
                setJoinMode(opts.mode);
                setPermsOpen(false);
                setConfirmOpen(true);
              }}
            />

            {/* Host camera/mic permissions */}
            <PreJoinPermissions
              open={hostPermsOpen}
              streamId={`${id}-host`}
              onClose={() => setHostPermsOpen(false)}
              onContinue={() => {
                setHostPermsOpen(false);
                startBroadcast();
              }}
            />
            {/* Confirmation dialog */}
            <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
              <AlertDialogContent className="bg-card border-border">
                <AlertDialogHeader>
                  <AlertDialogTitle className="font-display">Join "{stream.title}"?</AlertDialogTitle>
                  <AlertDialogDescription>
                    You'll be added to the viewer list and the stream will unmute. You can leave anytime.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-gradient-gold text-primary-foreground"
                    onClick={(e) => {
                      e.preventDefault();
                      setConfirmOpen(false);
                      performJoin();
                    }}
                  >
                    Confirm & Join
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            {/* Report user dialog */}
            <AlertDialog open={!!reportTarget} onOpenChange={(o) => !o && setReportTarget(null)}>
              <AlertDialogContent className="bg-card border-border">
                <AlertDialogHeader>
                  <AlertDialogTitle className="font-display flex items-center gap-2">
                    <Flag className="h-4 w-4 text-destructive" /> Report participant
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    Tell us what's wrong. The user will be hidden from your view and our team will review the report.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <Textarea
                  placeholder="Reason (e.g. spam, harassment, inappropriate content)"
                  value={reportTarget?.reason || ""}
                  onChange={(e) => setReportTarget((r) => r ? { ...r, reason: e.target.value } : r)}
                  rows={3}
                  className="bg-secondary border-border text-foreground"
                />
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction className="bg-destructive text-destructive-foreground" onClick={(e) => { e.preventDefault(); submitReport(); }}>
                    Submit report
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <Dialog open={qrOpen} onOpenChange={setQrOpen}>
              <DialogContent className="bg-card border-border max-w-sm">
                <DialogHeader>
                  <DialogTitle className="font-display flex items-center gap-2">
                    <QrCode className="h-4 w-4 text-primary" /> Scan to join as viewer
                  </DialogTitle>
                  <DialogDescription>
                    Open your phone's camera and point it at this code to join this live session on your second device.
                  </DialogDescription>
                </DialogHeader>
                <div className="flex justify-center py-3">
                  <div className="rounded-lg bg-white p-4">
                    <QRCodeSVG value={participantUrl} size={224} level="M" includeMargin={false} />
                  </div>
                </div>
                <div className="rounded-md border border-border bg-secondary/40 p-3 text-xs text-muted-foreground break-all">
                  {participantUrl}
                </div>
                <div className="flex justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      navigator.clipboard?.writeText(participantUrl).then(
                        () => toast.success("Link copied"),
                        () => toast.error("Could not copy link")
                      );
                    }}
                  >
                    <Copy className="mr-2 h-4 w-4" /> Copy link
                  </Button>
                </div>
              </DialogContent>
            </Dialog>



            <Card className="mt-3 p-4 bg-zinc-900 border-zinc-800">
              <div className="flex items-center gap-2 border-b border-zinc-800 pb-2">
                <MessageSquare className="h-5 w-5 text-primary" />
                <h3 className="font-display text-lg font-semibold text-zinc-100">Posts for the People</h3>
              </div>

              {user && (
                <div className="mt-3 space-y-2">
                  <Textarea
                    placeholder="Share an update with viewers..."
                    value={postContent}
                    onChange={(e) => setPostContent(e.target.value)}
                    rows={2}
                    className="bg-zinc-950 border-zinc-800 text-zinc-100 placeholder:text-zinc-500"
                  />
                  <div className="flex items-start gap-2">
                    <Link2 className="h-4 w-4 text-zinc-500 shrink-0 mt-2.5" />
                    <Textarea
                      placeholder="Add one or more links (separate by space or new line)"
                      value={postLink}
                      onChange={(e) => setPostLink(e.target.value)}
                      rows={2}
                      className="bg-zinc-950 border-zinc-800 text-zinc-100 placeholder:text-zinc-500 resize-none"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-400 hover:text-primary">
                      <ImagePlus className="h-4 w-4" />
                      {postImage ? postImage.name.slice(0, 24) : "Add image"}
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => setPostImage(e.target.files?.[0] || null)} />
                    </label>
                    <Button onClick={submitPost} disabled={posting || !postContent.trim()} className="bg-gradient-gold text-primary-foreground">
                      {posting ? "Posting..." : "Post"}
                    </Button>
                  </div>
                </div>
              )}

              <div className="mt-4 space-y-3">
                {posts.length === 0 && <p className="text-sm text-zinc-500">No posts yet. Be the first to share!</p>}
                {posts.map((p) => (
                  <div key={p.id} className="rounded-md border border-zinc-800 bg-zinc-950/60 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="font-semibold text-primary text-sm">{p.user_id.slice(0, 6)}</span>
                        <span className="ml-2 text-xs text-zinc-500">{new Date(p.created_at).toLocaleTimeString()}</span>
                      </div>
                      {user?.id === p.user_id && (
                        <button onClick={() => deletePost(p.id)} className="text-zinc-500 hover:text-destructive">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-zinc-100 whitespace-pre-wrap">{p.content}</p>
                    {p.link_url && <LinkPreviewList urls={p.link_url.split(/\r?\n/).map((s) => s.trim()).filter(Boolean)} />}
                    {p.image_url && (
                      <img src={p.image_url} alt="post" className="mt-2 max-h-80 rounded-md object-contain" />
                    )}
                    <div className="mt-2 flex items-center gap-1 text-xs text-zinc-500">
                      <Eye className="h-3 w-3" /> {p.views_count ?? 0} views
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          <Card className="p-4 bg-card border-border flex flex-col h-[600px]">
            <h3 className="font-display text-lg font-semibold text-foreground border-b border-border pb-2">Live Chat</h3>
            <div className="flex-1 overflow-y-auto space-y-2 py-3">
              {messages.length === 0 && <p className="text-sm text-muted-foreground">No messages yet. Say hi!</p>}
              {messages.filter((m) => !blockedIds.has(m.user_id)).map((m) => {
                const mine = user?.id === m.user_id;
                return (
                  <div key={m.id} className="group flex items-start justify-between gap-2 text-sm">
                    <div className="min-w-0">
                      <span className="font-semibold text-primary">{m.user_id.slice(0, 6)}:</span>{" "}
                      <span className="text-foreground break-words">{m.message}</span>
                    </div>
                    {!mine && user && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground shrink-0">
                            <MoreVertical className="h-3.5 w-3.5" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-card border-border">
                          <DropdownMenuItem onClick={() => setReportTarget({ userId: m.user_id, reason: "" })}>
                            <Flag className="h-4 w-4 mr-2" /> Report
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => blockUser(m.user_id)} className="text-destructive focus:text-destructive">
                            <Ban className="h-4 w-4 mr-2" /> Block user
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                );
              })}
              {blockedIds.size > 0 && (
                <p className="text-[11px] text-muted-foreground italic pt-2 border-t border-border">
                  {blockedIds.size} user(s) hidden.{" "}
                  <button
                    className="underline hover:text-foreground"
                    onClick={() => { persistBlocks(new Set()); }}
                  >
                    Unblock all
                  </button>
                </p>
              )}
              <div ref={chatEndRef} />
            </div>
            {stream.status === "ended" ? (
              <div className="pt-2 border-t border-border text-center text-xs text-muted-foreground italic">
                Chat is closed — this live session has ended.
              </div>
            ) : (
              <div className="flex gap-2 pt-2 border-t border-border">
                <Input
                  placeholder="Type a message..."
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                  className="bg-secondary border-border"
                />
                <Button onClick={sendMessage} size="icon" className="bg-gradient-gold text-primary-foreground">
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            )}
          </Card>
        </div>
      </main>
    </div>
  );
};

export default LiveStream;

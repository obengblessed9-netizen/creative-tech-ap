import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { VideoTile } from "@/components/webinar/VideoTile";
import {
  Bell,
  Mic,
  Video as VideoIcon,
  Users,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  Radio,
  Settings,
  PhoneOff,
  Maximize2,
  Minimize2,
  Type,
} from "lucide-react";

export interface StudioViewer {
  id: string;
  user_id: string;
  display_name: string | null;
  joined_at: string;
  left_at: string | null;
}

export type PeerStatus = "connecting" | "connected" | "failed" | "disconnected";

interface Props {
  title: string;
  hostName: string;
  hostStream: MediaStream | null;
  viewers: StudioViewer[];
  peerStreams?: { id: string; name: string; stream: MediaStream | null; status?: PeerStatus }[];
  onEndStream?: () => void;
}

const GRADIENTS = [
  "from-rose-700 to-rose-900",
  "from-sky-700 to-sky-900",
  "from-emerald-700 to-emerald-900",
  "from-violet-700 to-violet-900",
  "from-fuchsia-700 to-fuchsia-900",
  "from-orange-700 to-orange-900",
  "from-teal-700 to-teal-900",
  "from-indigo-700 to-indigo-900",
  "from-yellow-700 to-yellow-900",
  "from-cyan-700 to-cyan-900",
];

export default function HostStudio({ title, hostName, hostStream, viewers, peerStreams = [], onEndStream }: Props) {
  const [showLowerThird, setShowLowerThird] = useState(true);
  const [speakerFullscreen, setSpeakerFullscreen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [sourcesZoomed, setSourcesZoomed] = useState(false);
  const [zoomedTile, setZoomedTile] = useState<null | { id: string; name: string; stream: MediaStream | null; gradient: string; isHost: boolean }>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const active = viewers.filter((v) => !v.left_at);
  // Peer cams from WebRTC (live faces). Map them to source tiles first.
  const peerSources = peerStreams.map((p, i) => ({
    id: `peer-${p.id}`,
    name: p.name,
    stream: p.stream,
    isHost: false,
    gradient: GRADIENTS[i % GRADIENTS.length],
    status: (p.status || "connecting") as PeerStatus,
  }));
  const sources = [
    { id: "host", name: hostName, stream: hostStream, isHost: true, gradient: "from-amber-700 to-amber-900", status: "connected" as PeerStatus },
    ...peerSources,
    // Show DB viewers without an active webcam as placeholder tiles
    ...active
      .filter((v) => !peerStreams.some((p) => p.name === (v.display_name || v.user_id.slice(0, 6))))
      .map((v, i) => ({
        id: v.id,
        name: v.display_name || v.user_id.slice(0, 6),
        stream: null as MediaStream | null,
        isHost: false,
        gradient: GRADIENTS[(peerSources.length + i) % GRADIENTS.length],
        status: "connecting" as PeerStatus,
      })),
  ];

  const STATUS_META: Record<PeerStatus, { label: string; cls: string }> = {
    connecting: { label: "Joining…", cls: "bg-amber-500/90 text-white" },
    connected: { label: "Connected", cls: "bg-emerald-600/90 text-white" },
    failed: { label: "Failed", cls: "bg-destructive text-destructive-foreground" },
    disconnected: { label: "Disconnected", cls: "bg-zinc-600/90 text-white" },
  };

  const toggleFullscreen = async () => {
    const el = containerRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      await el.requestFullscreen?.();
      setSpeakerFullscreen(true);
    } else {
      await document.exitFullscreen?.();
      setSpeakerFullscreen(false);
    }
  };

  useEffect(() => {
    const onFs = () => setSpeakerFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  // Speaker-only fullscreen view
  if (speakerFullscreen) {
    return (
      <div ref={containerRef} className="fixed inset-0 z-50 bg-black flex flex-col">
        <div className="flex-1 relative">
          <VideoTile
            stream={hostStream}
            fallbackGradient="from-amber-700 to-amber-900"
            name={hostName}
            showLive
            className="w-full h-full"
          />
          {showLowerThird && (
            <div className="absolute bottom-16 left-8 right-8 max-w-2xl">
              <div className="bg-gradient-to-r from-primary/90 to-primary/40 backdrop-blur px-5 py-3 rounded-md border-l-4 border-primary">
                <p className="text-white font-display text-2xl font-bold leading-tight">{title}</p>
                <p className="text-white/80 text-sm">{hostName} · Live</p>
              </div>
            </div>
          )}
          <div className="absolute top-4 right-4 flex gap-2">
            <Button size="sm" variant="secondary" onClick={() => setShowLowerThird((v) => !v)}>
              <Type className="mr-1 h-3 w-3" /> {showLowerThird ? "Hide" : "Show"} Title
            </Button>
            <Button size="sm" variant="secondary" onClick={toggleFullscreen}>
              <Minimize2 className="mr-1 h-3 w-3" /> Exit Fullscreen
            </Button>
            <Button size="sm" variant="destructive" onClick={onEndStream}>
              <PhoneOff className="mr-1 h-3 w-3" /> End
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Card ref={containerRef as any} className="bg-zinc-900 border-zinc-800 p-3 overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
        <div className="flex items-center gap-2">
          <Radio className="h-4 w-4 text-destructive animate-pulse" />
          <span className="text-xs text-zinc-300 font-medium">{title} · Production Studio Lite</span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 text-zinc-400"
            onClick={toggleFullscreen}
            title="Speaker Fullscreen"
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className={`h-7 w-7 ${sourcesZoomed ? "text-primary" : "text-zinc-400"}`}
            onClick={() => setSourcesZoomed((v) => !v)}
            title={sourcesZoomed ? "Collapse all sources" : "Zoom all sources"}
          >
            {sourcesZoomed ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
          </Button>
          <Button size="icon" variant="ghost" className="h-7 w-7 text-zinc-400"><Bell className="h-3.5 w-3.5" /></Button>
          <div className="relative">
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 text-zinc-400"
              onClick={() => setSettingsOpen((v) => !v)}
            >
              <Settings className="h-3.5 w-3.5" />
            </Button>
            {settingsOpen && (
              <div className="absolute right-0 mt-1 w-60 bg-zinc-950 border border-zinc-800 rounded-md p-3 z-20 space-y-2 shadow-xl">
                <div className="flex items-center justify-between text-xs text-zinc-200">
                  <span>Lower-third title overlay</span>
                  <Switch checked={showLowerThird} onCheckedChange={setShowLowerThird} />
                </div>
                <div className="flex items-center justify-between text-xs text-zinc-200">
                  <span>Zoom sources</span>
                  <Switch checked={sourcesZoomed} onCheckedChange={setSourcesZoomed} />
                </div>
              </div>
            )}
          </div>
          <Button size="icon" variant="ghost" className="h-7 w-7 text-zinc-400"><MoreHorizontal className="h-3.5 w-3.5" /></Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 mt-3">
        <div className="space-y-3">
          {/* Host source */}
          <div className="rounded-md bg-zinc-950 p-2 border border-zinc-800" role="region" aria-label="Host source">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Radio className="h-3.5 w-3.5 text-destructive" aria-hidden="true" />
                <span className="text-xs text-zinc-300 font-medium">Host</span>
                <span className="text-[10px] text-zinc-500">(on air)</span>
              </div>
            </div>
            <ul className={`grid ${sourcesZoomed ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2 md:grid-cols-3"} gap-3 list-none p-0 m-0`}>
              <li className="relative">
                <VideoTile
                  stream={hostStream}
                  fallbackGradient="from-amber-700 to-amber-900"
                  name={hostName}
                  showLive
                  className="aspect-video"
                  focusable
                  ariaLabel={`Host ${hostName}, on air. Click to zoom`}
                  onActivate={() => setZoomedTile({ id: "host", name: hostName, stream: hostStream, gradient: "from-amber-700 to-amber-900", isHost: true })}
                />
                <span className="absolute top-1 left-1 text-[9px] px-1.5 py-0.5 rounded font-semibold bg-destructive text-destructive-foreground" aria-hidden="true">
                  HOST · ON AIR
                </span>
              </li>
            </ul>
          </div>

          {/* Joined sources — only participants who joined */}
          <div className="rounded-md bg-zinc-950 p-2 border border-zinc-800" role="region" aria-label="Joined sources">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Users className="h-3.5 w-3.5 text-zinc-400" aria-hidden="true" />
                <span className="text-xs text-zinc-300 font-medium">Joined</span>
                <span className="text-[10px] text-zinc-500">
                  ({Math.max(sources.length - 1, 0)} participant{sources.length - 1 === 1 ? "" : "s"})
                </span>
              </div>
              <div className="flex gap-1">
                <Button size="icon" variant="ghost" className="h-6 w-6 text-zinc-400" aria-label="Previous sources page"><ChevronLeft className="h-3 w-3" /></Button>
                <Button size="icon" variant="ghost" className="h-6 w-6 text-zinc-400" aria-label="Next sources page"><ChevronRight className="h-3 w-3" /></Button>
              </div>
            </div>
            {sources.length > 1 ? (
              <ul className={`grid ${sourcesZoomed ? "grid-cols-1 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-2" : "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5"} gap-3 list-none p-0 m-0`}>
                {sources.filter((s) => !s.isHost).map((s) => {
                  const meta = STATUS_META[s.status];
                  return (
                    <li key={`joined-${s.id}`} className="relative">
                      <VideoTile
                        stream={s.stream}
                        fallbackGradient={s.gradient}
                        name={s.name}
                        className="aspect-video"
                        focusable
                        ariaLabel={`Joined participant ${s.name}, ${meta.label}. Click to zoom`}
                        onActivate={() => setZoomedTile({ id: s.id, name: s.name, stream: s.stream, gradient: s.gradient, isHost: false })}
                      />
                      <span className={`absolute top-1 left-1 text-[9px] px-1.5 py-0.5 rounded font-semibold ${meta.cls}`} aria-hidden="true">
                        {meta.label.toUpperCase()}
                      </span>
                      {!s.stream && s.status === "connecting" && (
                        <span className="absolute bottom-6 left-1 text-[9px] px-1.5 py-0.5 rounded bg-black/70 text-white" aria-hidden="true">
                          No camera yet
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-[11px] text-zinc-500 text-center py-3">Waiting for viewers to join...</p>
            )}
          </div>

          {/* Bottom controls */}
          <div className="flex items-center justify-center gap-2 pt-1">
            <Button size="icon" variant="ghost" className="h-8 w-8 text-zinc-300" aria-label="Toggle microphone"><Mic className="h-4 w-4" /></Button>
            <Button size="icon" variant="ghost" className="h-8 w-8 text-zinc-300" aria-label="Toggle camera"><VideoIcon className="h-4 w-4" /></Button>
            <Button size="icon" variant="ghost" className="h-8 w-8 text-zinc-300" aria-label="Participants"><Users className="h-4 w-4" /></Button>
            <Button size="icon" variant="ghost" className="h-8 w-8 text-zinc-300" onClick={toggleFullscreen} aria-label="Speaker fullscreen">
              <Maximize2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
      {zoomedTile && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label={`Zoomed view of ${zoomedTile.name}`}
          onClick={() => setZoomedTile(null)}
        >
          <div className="relative w-full max-w-5xl aspect-video" onClick={(e) => e.stopPropagation()}>
            <VideoTile
              stream={zoomedTile.stream}
              fallbackGradient={zoomedTile.gradient}
              name={zoomedTile.name}
              showLive={zoomedTile.isHost}
              className="w-full h-full"
            />
            <span
              className={`absolute top-3 left-3 text-xs px-2 py-1 rounded font-semibold ${
                zoomedTile.isHost
                  ? "bg-destructive text-destructive-foreground"
                  : "bg-emerald-600/90 text-white"
              }`}
            >
              {zoomedTile.isHost ? "HOST · ON AIR" : "JOINED"}
            </span>
            <Button
              size="sm"
              variant="secondary"
              className="absolute top-3 right-3"
              onClick={() => setZoomedTile(null)}
              aria-label="Close zoomed view"
            >
              <Minimize2 className="h-3.5 w-3.5 mr-1" /> Close
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}

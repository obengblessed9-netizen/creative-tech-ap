import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Video, VideoOff, AlertTriangle, CheckCircle2, Loader2, Headphones, SwitchCamera } from "lucide-react";
import { Capacitor } from "@capacitor/core";

export type JoinMode = "full" | "listener";

interface Props {
  open: boolean;
  streamId?: string;
  onClose: () => void;
  onContinue: (opts: { audio: boolean; video: boolean; mode: JoinMode }) => void;
}

type State = "idle" | "requesting" | "granted" | "denied" | "partial";

const prefKey = (id?: string) => `live-prejoin-${id || "default"}`;

export function getStoredJoinPref(streamId?: string): { mode: JoinMode; audio: boolean; video: boolean } | null {
  try {
    const raw = localStorage.getItem(prefKey(streamId));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

const PreJoinPermissions = ({ open, streamId, onClose, onContinue }: Props) => {
  const isNative = Capacitor.isNativePlatform();
  const [state, setState] = useState<State>("idle");
  const [audioOk, setAudioOk] = useState(false);
  const [videoOk, setVideoOk] = useState(false);
  const [mode, setMode] = useState<JoinMode>("full");
  const [facing, setFacing] = useState<"user" | "environment">(isNative ? "environment" : "user");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stopStream = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  const requestPerms = async (facingOverride?: "user" | "environment") => {
    setState("requesting");
    setErrorMsg("");
    const useFacing = facingOverride ?? facing;
    // Stop any prior stream before re-requesting (e.g. on camera flip)
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    let gotAudio = false;
    let gotVideo = false;
    let stream: MediaStream | null = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: useFacing } },
        audio: true,
      });
      gotAudio = stream.getAudioTracks().length > 0;
      gotVideo = stream.getVideoTracks().length > 0;
    } catch (e: any) {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: useFacing } } });
        gotVideo = true;
      } catch {}
      if (!stream) {
        try {
          stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          gotAudio = true;
        } catch (err: any) {
          setErrorMsg(err?.message || "Camera and microphone access were denied.");
        }
      }
    }
    streamRef.current = stream;
    setAudioOk(gotAudio);
    setVideoOk(gotVideo);
    if (videoRef.current && stream && gotVideo) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(() => {});
    }
    if (gotAudio && gotVideo) setState("granted");
    else if (gotAudio || gotVideo) setState("partial");
    else setState("denied");
  };

  // Restore last preference + auto-request when opened
  useEffect(() => {
    if (!open) return;
    const last = getStoredJoinPref(streamId);
    if (last?.mode === "listener") {
      setMode("listener");
      setState("idle");
    } else {
      setMode("full");
      requestPerms();
    }
    return () => stopStream();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, streamId]);

  const persist = (opts: { audio: boolean; video: boolean; mode: JoinMode }) => {
    try { localStorage.setItem(prefKey(streamId), JSON.stringify(opts)); } catch {}
  };

  const handleJoinFull = () => {
    const opts = { audio: audioOk, video: videoOk, mode: "full" as JoinMode };
    persist(opts);
    stopStream();
    onContinue(opts);
  };

  const handleJoinListener = () => {
    const opts = { audio: false, video: false, mode: "listener" as JoinMode };
    persist(opts);
    stopStream();
    onContinue(opts);
  };

  const handleClose = () => {
    stopStream();
    setState("idle");
    setAudioOk(false);
    setVideoOk(false);
    onClose();
  };

  const lastPref = getStoredJoinPref(streamId);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="bg-card border-border max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Camera & microphone check</DialogTitle>
          <DialogDescription>
            Pick how you want to join. We remember your choice for next time.
          </DialogDescription>
        </DialogHeader>

        {/* Mode toggle */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => { setMode("full"); if (state === "idle") requestPerms(); }}
            className={`rounded-md border p-3 text-left transition ${
              mode === "full" ? "border-primary bg-primary/10" : "border-border bg-secondary/40"
            }`}
          >
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Video className="h-4 w-4" /> Full join
            </div>
            <p className="text-xs text-muted-foreground mt-1">Camera + mic enabled</p>
          </button>
          <button
            type="button"
            onClick={() => { setMode("listener"); stopStream(); setState("idle"); }}
            className={`rounded-md border p-3 text-left transition ${
              mode === "listener" ? "border-primary bg-primary/10" : "border-border bg-secondary/40"
            }`}
          >
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Headphones className="h-4 w-4" /> Listener
            </div>
            <p className="text-xs text-muted-foreground mt-1">Watch only · no devices</p>
          </button>
        </div>

        {mode === "full" ? (
          <>
            <div className="aspect-video rounded-md overflow-hidden bg-secondary border border-border relative">
              {videoOk && (
                <button
                  type="button"
                  onClick={() => {
                    const next = facing === "user" ? "environment" : "user";
                    setFacing(next);
                    requestPerms(next);
                  }}
                  className="absolute top-2 right-2 z-10 rounded-full bg-black/60 hover:bg-black/80 text-white p-2 transition"
                  aria-label="Switch camera"
                  title={facing === "user" ? "Switch to back camera" : "Switch to front camera"}
                >
                  <SwitchCamera className="h-4 w-4" />
                </button>
              )}
              {videoOk ? (
                <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground text-sm gap-2">
                  {state === "requesting" ? (
                    <>
                      <Loader2 className="h-6 w-6 animate-spin" />
                      Requesting access…
                    </>
                  ) : (
                    <>
                      <VideoOff className="h-8 w-8" />
                      Camera off
                    </>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center justify-around text-sm">
              <div className={`flex items-center gap-1.5 ${videoOk ? "text-primary" : "text-muted-foreground"}`}>
                {videoOk ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
                Camera {videoOk ? "ready" : "off"}
              </div>
              <div className={`flex items-center gap-1.5 ${audioOk ? "text-primary" : "text-muted-foreground"}`}>
                {audioOk ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
                Mic {audioOk ? "ready" : "off"}
              </div>
            </div>

            {state === "denied" && (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-foreground flex gap-2">
                <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Permissions blocked</p>
                  <p className="text-muted-foreground text-xs mt-1">
                    {errorMsg || "Your browser blocked camera and mic access."} Open your browser site settings to allow them, or switch to <strong className="text-foreground">Listener</strong> mode above.
                  </p>
                </div>
              </div>
            )}

            {state === "partial" && (
              <div className="rounded-md border border-border bg-secondary/40 p-3 text-xs text-muted-foreground flex gap-2">
                <AlertTriangle className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                Some devices were blocked. You can join with what's available, retry, or pick Listener mode.
              </div>
            )}

            {state === "granted" && (
              <div className="rounded-md border border-primary/40 bg-primary/10 p-3 text-sm text-foreground flex gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                You're all set — camera and mic are ready.
              </div>
            )}
          </>
        ) : (
          <div className="rounded-md border border-border bg-secondary/40 p-4 text-sm text-muted-foreground flex gap-3">
            <Headphones className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-foreground">Listener mode</p>
              <p className="text-xs mt-1">
                You'll join silently — no camera or microphone is requested. You can still chat, react, and report participants.
              </p>
            </div>
          </div>
        )}

        {lastPref && (
          <p className="text-[11px] text-muted-foreground">
            Last time you joined as <strong className="text-foreground">{lastPref.mode === "listener" ? "Listener" : "Full"}</strong>.
          </p>
        )}

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {mode === "full" && state !== "granted" && (
            <Button variant="outline" onClick={() => requestPerms()} disabled={state === "requesting"} className="w-full sm:w-auto">
              {state === "requesting" ? "Requesting…" : "Retry permissions"}
            </Button>
          )}
          {mode === "full" ? (
            <Button
              onClick={handleJoinFull}
              disabled={state === "requesting"}
              className="bg-gradient-gold text-primary-foreground w-full sm:w-auto"
            >
              {audioOk || videoOk ? "Join with my devices" : "Join (no devices)"}
            </Button>
          ) : (
            <Button onClick={handleJoinListener} className="bg-gradient-gold text-primary-foreground w-full sm:w-auto">
              Join as listener
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PreJoinPermissions;

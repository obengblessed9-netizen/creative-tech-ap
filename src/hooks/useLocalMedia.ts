import { useCallback, useEffect, useRef, useState } from "react";

export type LocalMediaState = {
  stream: MediaStream | null;
  active: boolean;
  audioOn: boolean;
  videoOn: boolean;
  error: string | null;
};

export function useLocalMedia() {
  const [state, setState] = useState<LocalMediaState>({
    stream: null,
    active: false,
    audioOn: true,
    videoOn: true,
    error: null,
  });
  const streamRef = useRef<MediaStream | null>(null);

  const start = useCallback(async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720 },
        audio: true,
      });
      streamRef.current = s;
      setState((p) => ({ ...p, stream: s, active: true, error: null }));
    } catch (e) {
      setState((p) => ({
        ...p,
        error: (e as Error).message || "Camera/mic blocked",
        active: false,
      }));
    }
  }, []);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setState((p) => ({ ...p, stream: null, active: false }));
  }, []);

  const toggleAudio = useCallback(() => {
    const s = streamRef.current;
    if (!s) return;
    s.getAudioTracks().forEach((t) => (t.enabled = !t.enabled));
    setState((p) => ({ ...p, audioOn: s.getAudioTracks()[0]?.enabled ?? false }));
  }, []);

  const toggleVideo = useCallback(() => {
    const s = streamRef.current;
    if (!s) return;
    s.getVideoTracks().forEach((t) => (t.enabled = !t.enabled));
    setState((p) => ({ ...p, videoOn: s.getVideoTracks()[0]?.enabled ?? false }));
  }, []);

  useEffect(() => () => stop(), [stop]);

  return { ...state, start, stop, toggleAudio, toggleVideo };
}

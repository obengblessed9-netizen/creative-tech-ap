import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Upload, Save, Youtube, Captions, AlertCircle, CheckCircle2 } from "lucide-react";

interface TutorialSettings {
  videoUrl?: string;
  captionsUrl?: string;
  youtubeId?: string;
}

const SETTING_KEY = "become_artist_tutorial";

export default function AdminTutorial() {
  const { user, isAdmin, loading } = useAuth();
  const navigate = useNavigate();

  const [settings, setSettings] = useState<TutorialSettings>({});
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [captionsFile, setCaptionsFile] = useState<File | null>(null);
  const [captionsText, setCaptionsText] = useState<string>("");
  const [captionsError, setCaptionsError] = useState<string | null>(null);
  const [cueCount, setCueCount] = useState<number>(0);
  const [previewReady, setPreviewReady] = useState(false);
  const [youtubeInput, setYoutubeInput] = useState("");
  const [saving, setSaving] = useState(false);

  // Object URLs for preview
  const videoFileUrl = useMemo(
    () => (videoFile ? URL.createObjectURL(videoFile) : null),
    [videoFile],
  );
  const captionsDraftUrl = useMemo(
    () => (captionsFile ? URL.createObjectURL(captionsFile) : null),
    [captionsFile],
  );
  useEffect(() => {
    return () => {
      if (videoFileUrl) URL.revokeObjectURL(videoFileUrl);
      if (captionsDraftUrl) URL.revokeObjectURL(captionsDraftUrl);
    };
  }, [videoFileUrl, captionsDraftUrl]);

  // Validate VTT when a file is picked
  useEffect(() => {
    setPreviewReady(false);
    setCaptionsError(null);
    setCueCount(0);
    setCaptionsText("");
    if (!captionsFile) return;
    const isVtt =
      captionsFile.name.toLowerCase().endsWith(".vtt") ||
      captionsFile.type === "text/vtt";
    if (!isVtt) {
      setCaptionsError("File must be a .vtt (WebVTT) file.");
      return;
    }
    captionsFile.text().then((txt) => {
      setCaptionsText(txt);
      if (!/^WEBVTT/m.test(txt.trim())) {
        setCaptionsError('Invalid WebVTT: file must start with "WEBVTT".');
        return;
      }
      const cues = (txt.match(/\d{2}:\d{2}[:.]\d{2}[.,]\d{3}\s*-->\s*\d{2}:\d{2}[:.]\d{2}[.,]\d{3}/g) || []).length;
      setCueCount(cues);
      if (cues === 0) {
        setCaptionsError("No caption cues detected. Check your timestamps.");
      }
    });
  }, [captionsFile]);

  const previewVideoSrc =
    videoFileUrl || settings.videoUrl || "https://www.w3.org/2010/05/sintel/trailer.mp4";

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) navigate("/");
  }, [user, isAdmin, loading, navigate]);

  useEffect(() => {
    supabase
      .from("site_settings")
      .select("value")
      .eq("key", SETTING_KEY)
      .maybeSingle()
      .then(({ data }) => {
        const v = (data?.value as TutorialSettings) || {};
        setSettings(v);
        setYoutubeInput(v.youtubeId || "");
      });
  }, []);

  const persist = async (next: TutorialSettings) => {
    const { error } = await supabase
      .from("site_settings")
      .upsert({ key: SETTING_KEY, value: next as any, updated_by: user!.id });
    if (error) throw error;
    setSettings(next);
  };

  const handleUploadVideo = async () => {
    if (!videoFile) return toast.error("Pick a video file first");
    setSaving(true);
    try {
      const path = `tutorial/become-artist-${Date.now()}.${videoFile.name.split(".").pop()}`;
      const { error } = await supabase.storage
        .from("tutorials")
        .upload(path, videoFile, { upsert: true, contentType: videoFile.type });
      if (error) throw error;
      const { data: pub } = supabase.storage.from("tutorials").getPublicUrl(path);
      await persist({ ...settings, videoUrl: pub.publicUrl, youtubeId: undefined });
      toast.success("Tutorial video uploaded for all users");
      setVideoFile(null);
    } catch (e: any) {
      toast.error(e.message || "Upload failed");
    } finally {
      setSaving(false);
    }
  };

  const handleUploadCaptions = async () => {
    if (!captionsFile) return toast.error("Pick a .vtt captions file");
    setSaving(true);
    try {
      const path = `tutorial/become-artist-${Date.now()}.vtt`;
      const { error } = await supabase.storage
        .from("tutorials")
        .upload(path, captionsFile, { upsert: true, contentType: "text/vtt" });
      if (error) throw error;
      const { data: pub } = supabase.storage.from("tutorials").getPublicUrl(path);
      await persist({ ...settings, captionsUrl: pub.publicUrl });
      toast.success("Captions uploaded");
      setCaptionsFile(null);
    } catch (e: any) {
      toast.error(e.message || "Upload failed");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveYoutube = async () => {
    const id = extractYouTubeId(youtubeInput.trim());
    if (!id) return toast.error("Enter a valid YouTube URL or ID");
    setSaving(true);
    try {
      await persist({ ...settings, youtubeId: id, videoUrl: undefined });
      toast.success("YouTube tutorial saved");
    } catch (e: any) {
      toast.error(e.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-24 pb-20">
        <div className="container max-w-3xl space-y-6">
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground">
              Become an Artist – Tutorial Video
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Upload or replace the tutorial video shown to all users. Changes apply instantly.
            </p>
          </div>

          {/* Current */}
          <Card className="p-4 bg-card border-border">
            <h2 className="font-display text-lg mb-3">Current source</h2>
            {settings.videoUrl ? (
              <video
                src={settings.videoUrl}
                controls
                className="w-full rounded-md border border-border"
                crossOrigin="anonymous"
              >
                {settings.captionsUrl && (
                  <track kind="captions" src={settings.captionsUrl} srcLang="en" label="English" default />
                )}
              </video>
            ) : settings.youtubeId ? (
              <div className="relative w-full" style={{ paddingTop: "56.25%" }}>
                <iframe
                  className="absolute inset-0 h-full w-full rounded-md"
                  src={`https://www.youtube.com/embed/${settings.youtubeId}?cc_load_policy=1&hl=en&cc_lang_pref=en`}
                  title="Current tutorial"
                  allowFullScreen
                />
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Using built-in default video.</p>
            )}
          </Card>

          {/* Upload MP4 */}
          <Card className="p-4 bg-card border-border space-y-3">
            <h2 className="font-display text-lg flex items-center gap-2">
              <Upload className="h-4 w-4" /> Upload a video file (.mp4)
            </h2>
            <Input
              type="file"
              accept="video/mp4,video/webm"
              onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
              aria-label="Tutorial video file"
            />
            <Button onClick={handleUploadVideo} disabled={!videoFile || saving}>
              <Save className="mr-2 h-4 w-4" /> Replace tutorial video
            </Button>
          </Card>

          {/* Captions */}
          <Card className="p-4 bg-card border-border space-y-3">
            <h2 className="font-display text-lg flex items-center gap-2">
              <Captions className="h-4 w-4" /> Captions / subtitles (.vtt)
            </h2>
            <p className="text-xs text-muted-foreground">
              Upload a WebVTT (.vtt) file, preview it against the video, then save. Viewers can
              toggle captions from the player.
            </p>
            <Input
              type="file"
              accept=".vtt,text/vtt"
              onChange={(e) => setCaptionsFile(e.target.files?.[0] || null)}
              aria-label="Captions file"
            />

            {captionsFile && (
              <div
                className={`flex items-start gap-2 rounded-md border p-2 text-xs ${
                  captionsError
                    ? "border-destructive/40 bg-destructive/10 text-destructive"
                    : "border-primary/30 bg-primary/5 text-foreground"
                }`}
                role="status"
                aria-live="polite"
              >
                {captionsError ? (
                  <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
                )}
                <div>
                  <div className="font-medium">{captionsFile.name}</div>
                  <div>
                    {captionsError
                      ? captionsError
                      : `Valid WebVTT · ${cueCount} cue${cueCount === 1 ? "" : "s"} detected`}
                  </div>
                </div>
              </div>
            )}

            {captionsDraftUrl && !captionsError && (
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Preview</Label>
                <video
                  key={captionsDraftUrl}
                  src={previewVideoSrc}
                  controls
                  crossOrigin="anonymous"
                  className="w-full rounded-md border border-border bg-black"
                  onLoadedMetadata={(e) => {
                    const v = e.currentTarget;
                    const tracks = v.textTracks;
                    if (tracks && tracks.length) tracks[0].mode = "showing";
                    setPreviewReady(true);
                  }}
                  aria-label="Captions preview player"
                >
                  <track
                    kind="captions"
                    src={captionsDraftUrl}
                    srcLang="en"
                    label="English (draft)"
                    default
                  />
                </video>
                <p className="text-[11px] text-muted-foreground">
                  Tip: turn on CC in the player to confirm timing and text before saving.
                </p>
              </div>
            )}

            {captionsText && (
              <details className="text-xs">
                <summary className="cursor-pointer text-muted-foreground">
                  View raw .vtt contents
                </summary>
                <pre className="mt-2 max-h-48 overflow-auto rounded-md border border-border bg-muted/30 p-2 whitespace-pre-wrap">
                  {captionsText.slice(0, 4000)}
                  {captionsText.length > 4000 ? "\n…" : ""}
                </pre>
              </details>
            )}

            <Button
              onClick={handleUploadCaptions}
              disabled={!captionsFile || !!captionsError || !previewReady || saving}
              variant="outline"
            >
              <Save className="mr-2 h-4 w-4" /> Save captions
            </Button>
            {captionsFile && !captionsError && !previewReady && (
              <p className="text-[11px] text-muted-foreground">
                Loading preview… save will enable once playback is ready.
              </p>
            )}
          </Card>

          {/* YouTube */}
          <Card className="p-4 bg-card border-border space-y-3">
            <h2 className="font-display text-lg flex items-center gap-2">
              <Youtube className="h-4 w-4" /> Use a YouTube video instead
            </h2>
            <Label className="text-xs text-muted-foreground">YouTube URL or video ID</Label>
            <Input
              value={youtubeInput}
              onChange={(e) => setYoutubeInput(e.target.value)}
              placeholder="https://youtube.com/watch?v=ZK3pV2bcfPg"
            />
            <Button onClick={handleSaveYoutube} disabled={!youtubeInput || saving} variant="outline">
              <Save className="mr-2 h-4 w-4" /> Save YouTube tutorial
            </Button>
            <p className="text-xs text-muted-foreground">
              Captions are loaded automatically when the YouTube video has them.
            </p>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
}

function extractYouTubeId(input: string): string | null {
  if (!input) return null;
  if (/^[\w-]{11}$/.test(input)) return input;
  const m = input.match(/(?:v=|youtu\.be\/|embed\/)([\w-]{11})/);
  return m ? m[1] : null;
}

import { useRef, useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Camera, Upload, CheckCircle, XCircle, Loader2, ShieldCheck } from "lucide-react";
import { Capacitor } from "@capacitor/core";
import { Camera as CapCamera, CameraResultType, CameraSource } from "@capacitor/camera";

interface Props {
  open: boolean;
  onClose: () => void;
  onVerified: () => void;
}

type Step = "selfie" | "id" | "verifying" | "result";

const JoinVerificationDialog = ({ open, onClose, onVerified }: Props) => {
  const [step, setStep] = useState<Step>("selfie");
  const [selfie, setSelfie] = useState<string | null>(null);
  const [idCard, setIdCard] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);

  // Web camera state
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const startStream = useCallback(async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err: any) {
      const msg =
        err?.name === "NotAllowedError"
          ? "Camera permission denied. Please allow camera access and try again."
          : err?.name === "NotFoundError"
          ? "No camera found on this device."
          : err?.message || "Could not open camera.";
      setCameraError(msg);
      toast.error(msg);
    }
  }, []);

  useEffect(() => {
    if (cameraOpen) {
      startStream();
    } else {
      stopStream();
    }
    return () => stopStream();
  }, [cameraOpen, startStream, stopStream]);

  useEffect(() => {
    if (!open) {
      stopStream();
      setCameraOpen(false);
    }
  }, [open, stopStream]);

  const takeSelfie = async () => {
    if (Capacitor.isNativePlatform()) {
      try {
        const photo = await CapCamera.getPhoto({
          quality: 85,
          allowEditing: false,
          resultType: CameraResultType.DataUrl,
          source: CameraSource.Camera,
          direction: "FRONT" as any,
        });
        if (photo.dataUrl) {
          setSelfie(photo.dataUrl);
          toast.success("Photo captured");
        }
      } catch (err: any) {
        if (err?.message && !/cancel/i.test(err.message)) {
          toast.error(err.message || "Could not open camera");
        }
      }
      return;
    }
    // Web: open live camera overlay
    setCameraOpen(true);
  };

  const captureSnapshot = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    // Mirror the image so it matches what the user sees
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    setSelfie(dataUrl);
    setCameraOpen(false);
    toast.success("Photo captured");
  };

  const handleId = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 10 * 1024 * 1024) { toast.error("Max 10MB"); return; }
    const r = new FileReader();
    r.onload = () => setIdCard(r.result as string);
    r.readAsDataURL(f);
  };

  const verify = async () => {
    if (!selfie || !idCard) return;
    setStep("verifying");
    const sB64 = selfie.includes(",") ? selfie.split(",")[1] : selfie;
    const iB64 = idCard.includes(",") ? idCard.split(",")[1] : idCard;
    if (!sB64 || !iB64) { toast.error("Images empty, retake"); setStep("selfie"); return; }
    try {
      const { data, error } = await supabase.functions.invoke("verify-identity", {
        body: { selfie_base64: sB64, id_card_base64: iB64 },
      });
      if (error) throw error;
      setResult(data);
      setStep("result");
      if (data?.faces_match && data?.is_valid_id) {
        toast.success("Identity verified");
      }
    } catch (e: any) {
      toast.error(e.message || "Verification failed");
      setStep("id");
    }
  };

  const close = () => {
    stopStream();
    setCameraOpen(false);
    setStep("selfie");
    setSelfie(null);
    setIdCard(null);
    setResult(null);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent className="bg-card border-border max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display">
            <ShieldCheck className="h-5 w-5 text-primary" /> Verify Identity (Optional)
          </DialogTitle>
          <DialogDescription>
            Verify yourself before joining for a trusted experience. You can skip this anytime.
          </DialogDescription>
        </DialogHeader>

        {step === "selfie" && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Step 1 — Take a selfie using your camera</p>

            {/* Live camera overlay */}
            {cameraOpen ? (
              <div className="space-y-3">
                <div className="relative rounded-lg overflow-hidden bg-black aspect-video">
                  {cameraError ? (
                    <div className="flex h-full items-center justify-center text-center p-4">
                      <p className="text-sm text-destructive">{cameraError}</p>
                    </div>
                  ) : (
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover"
                      style={{ transform: "scaleX(-1)" }}
                    />
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={captureSnapshot}
                    disabled={!!cameraError}
                    className="flex-1 bg-gradient-gold text-primary-foreground"
                  >
                    <Camera className="mr-2 h-4 w-4" /> Capture
                  </Button>
                  <Button variant="outline" onClick={() => setCameraOpen(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <>
                {/* Preview box */}
                <div className="aspect-video rounded-md overflow-hidden bg-secondary border border-border">
                  {selfie ? (
                    <img src={selfie} alt="Captured selfie" className="w-full h-full object-cover" />
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center gap-2 text-muted-foreground text-sm">
                      <Camera className="h-8 w-8" />
                      No photo yet
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  {selfie ? (
                    <>
                      <Button onClick={() => setStep("id")} className="bg-gradient-gold text-primary-foreground">Use this photo</Button>
                      <Button variant="outline" onClick={() => { setSelfie(null); takeSelfie(); }}><Camera className="mr-2 h-4 w-4" />Retake</Button>
                    </>
                  ) : (
                    <Button onClick={takeSelfie} className="bg-gradient-gold text-primary-foreground">
                      <Camera className="mr-2 h-4 w-4" />Take Selfie
                    </Button>
                  )}
                  <Button variant="outline" onClick={close}>Skip</Button>
                </div>
              </>
            )}
          </div>
        )}

        {step === "id" && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Step 2 — Upload your ID</p>
            {selfie && <img src={selfie} alt="selfie" className="h-20 w-20 rounded-full object-cover border border-border" />}
            <label className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-border p-3 text-sm text-muted-foreground hover:border-primary">
              <Upload className="h-4 w-4" /> {idCard ? "ID uploaded — change" : "Upload ID image (max 10MB)"}
              <input type="file" accept="image/*" className="hidden" onChange={handleId} />
            </label>
            <div className="flex gap-2">
              <Button onClick={verify} disabled={!idCard} className="bg-gradient-gold text-primary-foreground">Verify</Button>
              <Button variant="outline" onClick={close}>Skip</Button>
            </div>
          </div>
        )}

        {step === "verifying" && (
          <div className="py-8 text-center">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
            <p className="mt-2 text-sm text-muted-foreground">Verifying…</p>
          </div>
        )}

        {step === "result" && (
          <div className="space-y-3 text-center py-4">
            {result?.faces_match && result?.is_valid_id ? (
              <>
                <CheckCircle className="mx-auto h-12 w-12 text-primary" />
                <p className="font-semibold text-foreground">You're verified!</p>
                <Button onClick={() => { onVerified(); close(); }} className="bg-gradient-gold text-primary-foreground w-full">Continue to Join</Button>
              </>
            ) : (
              <>
                <XCircle className="mx-auto h-12 w-12 text-destructive" />
                <p className="text-sm text-foreground">{result?.reason || "Could not verify"}</p>
                <div className="flex gap-2 justify-center">
                  <Button variant="outline" onClick={() => setStep("selfie")}>Retry</Button>
                  <Button onClick={close}>Close</Button>
                </div>
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default JoinVerificationDialog;

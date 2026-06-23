import { useState, useRef, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Camera, Upload, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { Capacitor } from "@capacitor/core";
import { Camera as CapCamera, CameraResultType, CameraSource } from "@capacitor/camera";

interface VerificationDialogProps {
  open: boolean;
  onClose: () => void;
  artistId: string;
  userId: string;
  onVerified: () => void;
}

type Step = "selfie" | "id_card" | "verifying" | "result";

const VerificationDialog = ({ open, onClose, artistId, userId, onVerified }: VerificationDialogProps) => {
  const [step, setStep] = useState<Step>("selfie");
  const [selfieData, setSelfieData] = useState<string | null>(null);
  const [idCardData, setIdCardData] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);

  // Web camera state
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Stop any running stream
  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  // Start the getUserMedia stream
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

  // When camera overlay opens, start stream
  useEffect(() => {
    if (cameraOpen) {
      startStream();
    } else {
      stopStream();
    }
    return () => stopStream();
  }, [cameraOpen, startStream, stopStream]);

  // Close stream when dialog closes
  useEffect(() => {
    if (!open) {
      stopStream();
      setCameraOpen(false);
    }
  }, [open, stopStream]);

  const takeSelfie = async () => {
    // Native: use Capacitor Camera (real phone camera, front-facing)
    if (Capacitor.isNativePlatform()) {
      try {
        const photo = await CapCamera.getPhoto({
          quality: 80,
          allowEditing: false,
          resultType: CameraResultType.DataUrl,
          source: CameraSource.Camera,
          direction: "FRONT" as any,
        });
        if (photo.dataUrl) setSelfieData(photo.dataUrl);
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
    // Mirror the image so it's not flipped
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    setSelfieData(dataUrl);
    setCameraOpen(false);
    toast.success("Photo captured!");
  };

  const handleIdCardUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File too large. Max 10MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setIdCardData(reader.result as string);
    reader.readAsDataURL(file);
  };

  const submitVerification = async () => {
    if (!selfieData || !idCardData) return;
    setStep("verifying");

    try {
      const selfieB64 = selfieData.includes(",") ? selfieData.split(",")[1] : selfieData;
      const idCardB64 = idCardData.includes(",") ? idCardData.split(",")[1] : idCardData;

      if (!selfieB64 || !idCardB64) {
        toast.error("Selfie or ID image is empty. Please retake/re-upload.");
        setStep("selfie");
        return;
      }

      const selfieBlob = await fetch(selfieData).then((r) => r.blob());
      const idCardBlob = await fetch(idCardData).then((r) => r.blob());

      const [selfieUpload, idCardUpload] = await Promise.all([
        supabase.storage.from("verification-docs").upload(`${userId}/selfie-${Date.now()}.jpg`, selfieBlob, { contentType: "image/jpeg" }),
        supabase.storage.from("verification-docs").upload(`${userId}/id-card-${Date.now()}.jpg`, idCardBlob, { contentType: "image/jpeg" }),
      ]);

      if (selfieUpload.error || idCardUpload.error) throw new Error("Failed to upload verification documents");

      const { data: aiResult, error: fnError } = await supabase.functions.invoke("verify-identity", {
        body: { selfie_base64: selfieB64, id_card_base64: idCardB64 },
      });

      if (fnError) throw fnError;

      const status = aiResult.faces_match && aiResult.is_valid_id ? "approved" : "rejected";
      await supabase.from("artist_verifications").insert({
        artist_id: artistId,
        user_id: userId,
        selfie_url: selfieUpload.data.path,
        id_card_url: idCardUpload.data.path,
        ai_result: aiResult,
        status,
      });

      if (status === "approved") {
        await supabase.from("artists").update({ verified: true, verification_status: "approved" }).eq("id", artistId);
      } else {
        await supabase.from("artists").update({ verification_status: "pending" }).eq("id", artistId);
      }

      setResult({ ...aiResult, status });
      setStep("result");

      if (status === "approved") {
        toast.success("Identity verified successfully!");
        onVerified();
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Verification failed");
      setStep("id_card");
    }
  };

  const handleClose = () => {
    stopStream();
    setCameraOpen(false);
    setStep("selfie");
    setSelfieData(null);
    setIdCardData(null);
    setResult(null);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg bg-card border-border">
        <DialogHeader>
          <DialogTitle className="font-display text-foreground">Identity Verification</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {step === "selfie" && "Step 1: Take a selfie using your camera"}
            {step === "id_card" && "Step 2: Upload your national ID card"}
            {step === "verifying" && "Verifying your identity..."}
            {step === "result" && "Verification complete"}
          </DialogDescription>
        </DialogHeader>

        {step === "selfie" && (
          <div className="space-y-4">
            {/* Live camera overlay */}
            {cameraOpen && (
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
                    className="flex-1 bg-gradient-gold text-primary-foreground shadow-gold"
                  >
                    <Camera className="mr-2 h-4 w-4" /> Capture
                  </Button>
                  <Button variant="outline" onClick={() => setCameraOpen(false)} className="border-border text-foreground">
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {/* Preview / take selfie buttons */}
            {!cameraOpen && (
              <>
                {selfieData ? (
                  <div className="space-y-3">
                    <img src={selfieData} alt="Selfie preview" className="w-full rounded-lg border border-border" />
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={() => { setSelfieData(null); takeSelfie(); }} className="flex-1 border-border text-foreground">
                        Retake
                      </Button>
                      <Button onClick={() => setStep("id_card")} className="flex-1 bg-gradient-gold text-primary-foreground shadow-gold">
                        Continue
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button onClick={takeSelfie} className="w-full bg-gradient-gold text-primary-foreground shadow-gold">
                    <Camera className="mr-2 h-4 w-4" /> Take Selfie
                  </Button>
                )}
              </>
            )}
          </div>
        )}

        {step === "id_card" && (
          <div className="space-y-4">
            {idCardData ? (
              <div className="space-y-3">
                <img src={idCardData} alt="ID Card preview" className="w-full rounded-lg border border-border object-contain max-h-64" />
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setIdCardData(null)} className="flex-1 border-border text-foreground">
                    Re-upload
                  </Button>
                  <Button onClick={submitVerification} className="flex-1 bg-gradient-gold text-primary-foreground shadow-gold">
                    Verify Identity
                  </Button>
                </div>
              </div>
            ) : (
              <label className="flex cursor-pointer flex-col items-center gap-3 rounded-lg border-2 border-dashed border-border p-8 transition-colors hover:border-primary">
                <Upload className="h-10 w-10 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Click to upload your national ID card</p>
                <p className="text-xs text-muted-foreground">JPG, PNG up to 10MB</p>
                <input type="file" accept="image/*" className="hidden" onChange={handleIdCardUpload} />
              </label>
            )}
          </div>
        )}

        {step === "verifying" && (
          <div className="flex flex-col items-center gap-4 py-8">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-muted-foreground">AI is comparing your selfie with your ID card...</p>
          </div>
        )}

        {step === "result" && result && (
          <div className="space-y-4 py-4">
            <div className="flex flex-col items-center gap-3">
              {result.status === "approved" ? (
                <CheckCircle className="h-16 w-16 text-green-500" />
              ) : (
                <XCircle className="h-16 w-16 text-destructive" />
              )}
              <p className="text-lg font-semibold text-foreground">
                {result.status === "approved" ? "Verified!" : "Verification Failed"}
              </p>
              <p className="text-center text-sm text-muted-foreground">{result.reason}</p>
              {result.name_on_id && (
                <p className="text-sm text-muted-foreground">Name on ID: {result.name_on_id}</p>
              )}
              <p className="text-xs text-muted-foreground">Confidence: {result.confidence}</p>
            </div>
            <Button onClick={handleClose} className="w-full" variant="outline">
              Close
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default VerificationDialog;

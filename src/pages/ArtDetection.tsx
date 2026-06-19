import { useState } from "react";
import { Shield, Upload, CheckCircle, AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

interface DetectionResult {
  is_ai_generated: boolean;
  confidence_score: number;
  analysis: string;
}

const ArtDetection = () => {
  const { user } = useAuth();
  const [imageUrl, setImageUrl] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<DetectionResult | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    const ext = file.name.split(".").pop();
    const path = `${user.id}/detection-${Date.now()}.${ext}`;

    const { data, error } = await supabase.storage.from("artwork-images").upload(path, file);
    if (error) {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
      return;
    }

    const { data: urlData } = supabase.storage.from("artwork-images").getPublicUrl(path);
    setImageUrl(urlData.publicUrl);
    setPreviewUrl(URL.createObjectURL(file));
    setResult(null);
  };

  const handleAnalyze = async () => {
    if (!imageUrl || !user) return;
    setAnalyzing(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke("detect-ai-art", {
        body: { image_url: imageUrl },
      });

      if (error) throw error;

      const detectionResult: DetectionResult = {
        is_ai_generated: data.is_ai_generated,
        confidence_score: data.confidence_score,
        analysis: data.analysis,
      };
      setResult(detectionResult);

      // Save result to DB
      await supabase.from("art_detection_results").insert({
        user_id: user.id,
        image_url: imageUrl,
        is_ai_generated: detectionResult.is_ai_generated,
        confidence_score: detectionResult.confidence_score,
        analysis_details: data,
      });
    } catch (err: any) {
      toast({ title: "Analysis failed", description: err.message || "Please try again", variant: "destructive" });
    }
    setAnalyzing(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container pt-24 pb-16 max-w-2xl">
        <div className="flex items-center gap-2 mb-2">
          <Shield className="h-7 w-7 text-primary" />
          <h1 className="font-display text-3xl font-bold text-gradient-gold">AI Art Detection</h1>
        </div>
        <p className="text-muted-foreground mb-8">Upload artwork to analyze whether it's human-made or AI-generated.</p>

        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="border-2 border-dashed border-border rounded-xl p-8 text-center">
              {previewUrl ? (
                <div className="space-y-4">
                  <img src={previewUrl} alt="Upload preview" className="max-h-64 mx-auto rounded-lg object-contain" />
                  <Button variant="outline" size="sm" onClick={() => { setPreviewUrl(""); setImageUrl(""); setResult(null); }}>
                    Remove
                  </Button>
                </div>
              ) : (
                <label className="cursor-pointer block">
                  <Upload className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
                  <p className="text-sm text-muted-foreground">Click to upload artwork image</p>
                  <p className="text-xs text-muted-foreground mt-1">PNG, JPG up to 10MB</p>
                  <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                </label>
              )}
            </div>

            {imageUrl && (
              <Button onClick={handleAnalyze} disabled={analyzing} className="w-full mt-4">
                {analyzing ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analyzing...</> : <><Shield className="mr-2 h-4 w-4" /> Analyze Artwork</>}
              </Button>
            )}
          </CardContent>
        </Card>

        {result && (
          <Card className={`border-2 ${result.is_ai_generated ? "border-destructive/50" : "border-avatar-ring/50"}`}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {result.is_ai_generated ? (
                  <><AlertTriangle className="h-5 w-5 text-destructive" /> AI-Generated Detected</>
                ) : (
                  <><CheckCircle className="h-5 w-5 text-avatar-ring" /> Likely Human-Made</>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-muted-foreground">Confidence</span>
                  <span className="font-semibold text-foreground">{Math.round(result.confidence_score * 100)}%</span>
                </div>
                <Progress value={result.confidence_score * 100} className="h-2" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground mb-1">Analysis</p>
                <p className="text-sm text-muted-foreground leading-relaxed">{result.analysis}</p>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default ArtDetection;

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Upload, ImagePlus, X, Plus } from "lucide-react";

const categoryGroups = [
  { label: "🖼️ Prints & Merchandise", options: ["T-Shirt Designs", "Sticker Designs", "Wall Art Prints"] },
];
const availabilityOptions = ["available", "sold", "commissioned"];

const SubmitArtwork = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [medium, setMedium] = useState("");
  const [category, setCategory] = useState("");
  const [dimensions, setDimensions] = useState("");
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [description, setDescription] = useState("");
  const [inspiration, setInspiration] = useState("");
  const [availabilityStatus, setAvailabilityStatus] = useState("available");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [additionalFiles, setAdditionalFiles] = useState<File[]>([]);
  const [additionalPreviews, setAdditionalPreviews] = useState<string[]>([]);
  const [certificateFile, setCertificateFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleAdditionalImages = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (additionalFiles.length + files.length > 5) {
      toast.error("Maximum 5 additional images");
      return;
    }
    setAdditionalFiles(prev => [...prev, ...files]);
    setAdditionalPreviews(prev => [...prev, ...files.map(f => URL.createObjectURL(f))]);
  };

  const removeAdditionalImage = (index: number) => {
    setAdditionalFiles(prev => prev.filter((_, i) => i !== index));
    setAdditionalPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSubmitting(true);

    try {
      let imageUrl: string | null = null;
      if (imageFile) {
        const ext = imageFile.name.split(".").pop();
        const path = `${user.id}/${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage.from("artwork-images").upload(path, imageFile);
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from("artwork-images").getPublicUrl(path);
        imageUrl = urlData.publicUrl;
      }

      // Upload additional images
      const additionalUrls: string[] = [];
      for (const file of additionalFiles) {
        const ext = file.name.split(".").pop();
        const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error } = await supabase.storage.from("artwork-images").upload(path, file);
        if (!error) {
          const { data } = supabase.storage.from("artwork-images").getPublicUrl(path);
          additionalUrls.push(data.publicUrl);
        }
      }

      // Upload certificate
      let certificateUrl: string | null = null;
      if (certificateFile) {
        const ext = certificateFile.name.split(".").pop();
        const path = `${user.id}/cert-${Date.now()}.${ext}`;
        const { error } = await supabase.storage.from("artwork-images").upload(path, certificateFile);
        if (!error) {
          const { data } = supabase.storage.from("artwork-images").getPublicUrl(path);
          certificateUrl = data.publicUrl;
        }
      }

      const { error } = await supabase.from("artworks").insert({
        title,
        price: parseFloat(price),
        medium: medium || null,
        category: category || null,
        dimensions: dimensions || null,
        year: year ? parseInt(year) : null,
        description: description || null,
        inspiration: inspiration || null,
        image_url: imageUrl,
        additional_images: additionalUrls.length > 0 ? additionalUrls : null,
        certificate_url: certificateUrl,
        availability_status: availabilityStatus,
        available: availabilityStatus === "available",
      });

      if (error) throw error;
      toast.success("Artwork submitted successfully!");
      navigate("/gallery");
    } catch (err: any) {
      toast.error(err.message || "Failed to submit artwork");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-24 pb-20">
        <div className="container max-w-2xl">
          <h1 className="font-display text-3xl font-bold text-foreground">Sell Your Artwork</h1>
          <p className="mt-1 text-muted-foreground">List your artwork for sale in the gallery.</p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-6">
            {/* Main Image */}
            <div>
              <Label className="text-foreground">Artwork Image *</Label>
              <label className="mt-2 flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border bg-secondary/50 p-8 transition-colors hover:border-primary/50 hover:bg-secondary">
                {imagePreview ? (
                  <img src={imagePreview} alt="Preview" className="max-h-64 rounded-md object-contain" />
                ) : (
                  <>
                    <ImagePlus className="h-10 w-10 text-muted-foreground" />
                    <p className="mt-2 text-sm text-muted-foreground">Click to upload main image</p>
                  </>
                )}
                <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
              </label>
            </div>

            {/* Additional Images */}
            <div>
              <Label className="text-foreground">Additional Images (different angles)</Label>
              <div className="mt-2 flex flex-wrap gap-3">
                {additionalPreviews.map((preview, i) => (
                  <div key={i} className="relative">
                    <img src={preview} alt={`Additional ${i + 1}`} className="h-20 w-20 rounded-md object-cover border border-border" />
                    <button type="button" onClick={() => removeAdditionalImage(i)} className="absolute -top-2 -right-2 rounded-full bg-destructive p-1">
                      <X className="h-3 w-3 text-destructive-foreground" />
                    </button>
                  </div>
                ))}
                {additionalFiles.length < 5 && (
                  <label className="flex h-20 w-20 cursor-pointer items-center justify-center rounded-md border-2 border-dashed border-border bg-secondary/50 hover:border-primary/50">
                    <Plus className="h-5 w-5 text-muted-foreground" />
                    <input type="file" accept="image/*" multiple onChange={handleAdditionalImages} className="hidden" />
                  </label>
                )}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="title" className="text-foreground">Title *</Label>
                <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required className="mt-1 bg-secondary border-border text-foreground" />
              </div>
              <div>
                <Label htmlFor="price" className="text-foreground">Price ($) *</Label>
                <Input id="price" type="number" min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} required className="mt-1 bg-secondary border-border text-foreground" />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="medium" className="text-foreground">Medium</Label>
                <Input id="medium" value={medium} onChange={(e) => setMedium(e.target.value)} placeholder="e.g. Oil on Canvas" className="mt-1 bg-secondary border-border text-foreground placeholder:text-muted-foreground" />
              </div>
              <div>
                <Label className="text-foreground">Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="mt-1 bg-secondary border-border text-foreground">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    {categoryGroups.map((group) => (
                      <div key={group.label}>
                        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">{group.label}</div>
                        {group.options.map((c) => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </div>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <Label htmlFor="dimensions" className="text-foreground">Dimensions</Label>
                <Input id="dimensions" value={dimensions} onChange={(e) => setDimensions(e.target.value)} placeholder='e.g. 36" × 48"' className="mt-1 bg-secondary border-border text-foreground placeholder:text-muted-foreground" />
              </div>
              <div>
                <Label htmlFor="year" className="text-foreground">Year</Label>
                <Input id="year" type="number" value={year} onChange={(e) => setYear(e.target.value)} className="mt-1 bg-secondary border-border text-foreground" />
              </div>
              <div>
                <Label className="text-foreground">Availability</Label>
                <Select value={availabilityStatus} onValueChange={setAvailabilityStatus}>
                  <SelectTrigger className="mt-1 bg-secondary border-border text-foreground">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availabilityOptions.map((o) => (
                      <SelectItem key={o} value={o} className="capitalize">{o}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="description" className="text-foreground">Description</Label>
              <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="Tell us about this artwork..." className="mt-1 bg-secondary border-border text-foreground placeholder:text-muted-foreground" />
            </div>

            <div>
              <Label htmlFor="inspiration" className="text-foreground">Inspiration / Story Behind the Piece</Label>
              <Textarea id="inspiration" value={inspiration} onChange={(e) => setInspiration(e.target.value)} rows={3} placeholder="What inspired this artwork?" className="mt-1 bg-secondary border-border text-foreground placeholder:text-muted-foreground" />
            </div>

            <div>
              <Label className="text-foreground">Certificate of Authenticity (optional)</Label>
              <Input type="file" accept="image/*,.pdf" onChange={(e) => setCertificateFile(e.target.files?.[0] || null)} className="mt-1 bg-secondary border-border text-foreground" />
            </div>

            <Button type="submit" disabled={submitting} className="w-full bg-gradient-gold text-primary-foreground shadow-gold hover:opacity-90">
              <Upload className="mr-2 h-4 w-4" />
              {submitting ? "Submitting..." : "Submit Artwork"}
            </Button>
          </form>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default SubmitArtwork;

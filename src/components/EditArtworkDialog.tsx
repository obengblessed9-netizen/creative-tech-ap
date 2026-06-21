import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface EditArtworkDialogProps {
  open: boolean;
  onClose: () => void;
  artworkId: string;
  onSaved: () => void;
}

export default function EditArtworkDialog({ open, onClose, artworkId, onSaved }: EditArtworkDialogProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    price: "",
    medium: "",
    category: "",
    dimensions: "",
    year: "",
    description: "",
  });

  useEffect(() => {
    if (open && artworkId) {
      fetchArtwork();
    }
  }, [open, artworkId]);

  const fetchArtwork = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("artworks")
      .select("*")
      .eq("id", artworkId)
      .single();
      
    if (data) {
      setFormData({
        title: data.title || "",
        price: data.price ? data.price.toString() : "",
        medium: data.medium || "",
        category: data.category || "",
        dimensions: data.dimensions || "",
        year: data.year ? data.year.toString() : "",
        description: data.description || "",
      });
    }
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("artworks")
      .update({
        title: formData.title,
        price: parseFloat(formData.price) || 0,
        medium: formData.medium,
        category: formData.category,
        dimensions: formData.dimensions,
        year: formData.year ? parseInt(formData.year) : null,
        description: formData.description,
      })
      .eq("id", artworkId);

    setSaving(false);
    if (error) {
      toast.error("Failed to update artwork");
    } else {
      toast.success("Artwork updated!");
      onSaved();
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Artwork</DialogTitle>
        </DialogHeader>
        {loading ? (
          <div className="py-4 text-center text-sm text-muted-foreground">Loading...</div>
        ) : (
          <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto px-1">
            <div className="grid gap-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="price">Price ($)</Label>
              <Input
                id="price"
                type="number"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="medium">Medium</Label>
                <Input
                  id="medium"
                  value={formData.medium}
                  onChange={(e) => setFormData({ ...formData, medium: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="category">Category</Label>
                <Input
                  id="category"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="dimensions">Dimensions</Label>
                <Input
                  id="dimensions"
                  value={formData.dimensions}
                  onChange={(e) => setFormData({ ...formData, dimensions: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="year">Year</Label>
                <Input
                  id="year"
                  type="number"
                  value={formData.year}
                  onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading || saving}>
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

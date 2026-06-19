import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Image, Users, Palette, ShieldCheck, Boxes, Receipt, UserSquare2, BarChart3, CalendarDays } from "lucide-react";
import AdminVerificationPanel from "@/components/AdminVerificationPanel";
import InventoryPanel from "@/components/agms/InventoryPanel";
import SalesPanel from "@/components/agms/SalesPanel";
import ClientsPanel from "@/components/agms/ClientsPanel";
import AnalyticsPanel from "@/components/agms/AnalyticsPanel";
import EventsPanel from "@/components/agms/EventsPanel";

interface DbArtwork {
  id: string;
  title: string;
  price: number;
  medium: string | null;
  dimensions: string | null;
  year: number | null;
  category: string | null;
  image_url: string | null;
  description: string | null;
  available: boolean;
  artist_id: string | null;
}

interface DbArtist {
  id: string;
  name: string;
  bio: string | null;
  specialty: string | null;
  image_url: string | null;
}

const AdminDashboard = () => {
  const { user, isAdmin, isStaff, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<"artworks" | "artists" | "reviews" | "inventory" | "sales" | "clients" | "analytics" | "events">("inventory");
  const [artworks, setArtworks] = useState<DbArtwork[]>([]);
  const [artists, setArtists] = useState<DbArtist[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<any>({});
  const [imageFile, setImageFile] = useState<File | null>(null);

  useEffect(() => {
    if (!authLoading && (!user || !(isAdmin || isStaff))) {
      navigate("/");
    }
  }, [user, isAdmin, isStaff, authLoading, navigate]);

  const fetchData = async () => {
    setLoading(true);
    const [artRes, artisRes] = await Promise.all([
      supabase.from("artworks").select("*").order("created_at", { ascending: false }),
      supabase.from("artists").select("*").order("name"),
    ]);
    setArtworks((artRes.data as DbArtwork[]) ?? []);
    setArtists((artisRes.data as DbArtist[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const uploadImage = async (file: File): Promise<string | null> => {
    const ext = file.name.split(".").pop();
    const path = `${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("artwork-images").upload(path, file);
    if (error) { toast.error("Upload failed"); return null; }
    const { data } = supabase.storage.from("artwork-images").getPublicUrl(path);
    return data.publicUrl;
  };

  const handleSaveArtwork = async () => {
    let imageUrl = formData.image_url || null;
    if (imageFile) {
      const url = await uploadImage(imageFile);
      if (url) imageUrl = url;
    }
    const payload = {
      title: formData.title,
      artist_id: formData.artist_id || null,
      price: parseFloat(formData.price) || 0,
      medium: formData.medium || null,
      dimensions: formData.dimensions || null,
      year: parseInt(formData.year) || null,
      category: formData.category || null,
      image_url: imageUrl,
      description: formData.description || null,
      available: formData.available ?? true,
    };

    if (editingId) {
      const { error } = await supabase.from("artworks").update(payload).eq("id", editingId);
      if (error) { toast.error("Update failed"); return; }
      toast.success("Artwork updated");
    } else {
      const { error } = await supabase.from("artworks").insert(payload);
      if (error) { toast.error("Create failed"); return; }
      toast.success("Artwork created");
    }
    resetForm();
    fetchData();
  };

  const handleSaveArtist = async () => {
    let imageUrl = formData.image_url || null;
    if (imageFile) {
      const url = await uploadImage(imageFile);
      if (url) imageUrl = url;
    }
    const payload = {
      name: formData.name,
      bio: formData.bio || null,
      specialty: formData.specialty || null,
      image_url: imageUrl,
    };

    if (editingId) {
      const { error } = await supabase.from("artists").update(payload).eq("id", editingId);
      if (error) { toast.error("Update failed"); return; }
      toast.success("Artist updated");
    } else {
      const { error } = await supabase.from("artists").insert(payload);
      if (error) { toast.error("Create failed"); return; }
      toast.success("Artist created");
    }
    resetForm();
    fetchData();
  };

  const handleDelete = async (id: string, type: "artworks" | "artists") => {
    if (!confirm("Are you sure?")) return;
    const { error } = await supabase.from(type).delete().eq("id", id);
    if (error) { toast.error("Delete failed"); return; }
    toast.success("Deleted");
    fetchData();
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData({});
    setImageFile(null);
  };

  const startEdit = (item: any) => {
    setEditingId(item.id);
    setFormData(item);
    setShowForm(true);
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container pt-24 text-center text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-24 pb-20">
        <div className="container">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="font-display text-3xl font-bold text-foreground">Gallery Management (AGMS)</h1>
              <p className="mt-1 text-muted-foreground">Inventory, sales, clients, analytics & events</p>
            </div>
            {isAdmin && (
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => navigate("/admin/tutorial")}>
                  <ShieldCheck className="mr-2 h-4 w-4" /> Tutorial Video
                </Button>
                <Button variant="outline" onClick={() => navigate("/admin/live-moderation")}>
                  <ShieldCheck className="mr-2 h-4 w-4" /> Live Moderation
                </Button>
              </div>
            )}
          </div>

          {/* Tabs */}
          <div className="mt-8 flex flex-wrap gap-2">
            {([
              ["inventory", "Inventory", Boxes],
              ["sales", "Sales", Receipt],
              ["clients", "Clients", UserSquare2],
              ["analytics", "Analytics", BarChart3],
              ["events", "Events", CalendarDays],
              ["artworks", `Artworks (${artworks.length})`, Palette],
              ["artists", `Artists (${artists.length})`, Users],
              ...(isAdmin ? [["reviews", "Reviews", ShieldCheck]] as const : []),
            ] as const).map(([id, label, Icon]) => (
              <button
                key={id}
                onClick={() => { setTab(id as any); resetForm(); }}
                className={`flex items-center gap-2 rounded-sm px-4 py-2 text-sm font-medium transition-all ${
                  tab === id ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
                }`}
              >
                <Icon className="h-4 w-4" /> {label}
              </button>
            ))}
          </div>

          {/* AGMS Panels */}
          {tab === "inventory" && <div className="mt-6"><InventoryPanel /></div>}
          {tab === "sales" && <div className="mt-6"><SalesPanel /></div>}
          {tab === "clients" && <div className="mt-6"><ClientsPanel /></div>}
          {tab === "analytics" && <div className="mt-6"><AnalyticsPanel /></div>}
          {tab === "events" && <div className="mt-6"><EventsPanel /></div>}

          {/* Add button */}
          {!showForm && (tab === "artworks" || tab === "artists") && (
            <Button onClick={() => { setShowForm(true); setFormData(tab === "artworks" ? { available: true } : {}); }} className="mt-6 bg-gradient-gold text-primary-foreground">
              <Plus className="mr-2 h-4 w-4" /> Add {tab === "artworks" ? "Artwork" : "Artist"}
            </Button>
          )}

          {/* Reviews Tab */}
          {tab === "reviews" && isAdmin && (
            <div className="mt-6">
              <AdminVerificationPanel />
            </div>
          )}

          {/* Form */}
          {showForm && tab === "artworks" && (
            <div className="mt-6 max-w-2xl rounded-lg border border-border bg-card p-6 space-y-4">
              <h2 className="font-display text-lg font-semibold text-foreground">{editingId ? "Edit" : "New"} Artwork</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label className="text-foreground">Title *</Label>
                  <Input value={formData.title || ""} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="bg-secondary border-border text-foreground" />
                </div>
                <div>
                  <Label className="text-foreground">Artist</Label>
                  <select
                    value={formData.artist_id || ""}
                    onChange={(e) => setFormData({ ...formData, artist_id: e.target.value })}
                    className="w-full rounded-md border border-border bg-secondary px-3 py-2 text-sm text-foreground"
                  >
                    <option value="">Select artist</option>
                    {artists.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>
                <div>
                  <Label className="text-foreground">Price</Label>
                  <Input type="number" value={formData.price || ""} onChange={(e) => setFormData({ ...formData, price: e.target.value })} className="bg-secondary border-border text-foreground" />
                </div>
                <div>
                  <Label className="text-foreground">Category</Label>
                  <Input value={formData.category || ""} onChange={(e) => setFormData({ ...formData, category: e.target.value })} className="bg-secondary border-border text-foreground" />
                </div>
                <div>
                  <Label className="text-foreground">Medium</Label>
                  <Input value={formData.medium || ""} onChange={(e) => setFormData({ ...formData, medium: e.target.value })} className="bg-secondary border-border text-foreground" />
                </div>
                <div>
                  <Label className="text-foreground">Dimensions</Label>
                  <Input value={formData.dimensions || ""} onChange={(e) => setFormData({ ...formData, dimensions: e.target.value })} className="bg-secondary border-border text-foreground" />
                </div>
                <div>
                  <Label className="text-foreground">Year</Label>
                  <Input type="number" value={formData.year || ""} onChange={(e) => setFormData({ ...formData, year: e.target.value })} className="bg-secondary border-border text-foreground" />
                </div>
                <div className="flex items-center gap-3 pt-6">
                  <Switch checked={formData.available ?? true} onCheckedChange={(v) => setFormData({ ...formData, available: v })} />
                  <Label className="text-foreground">Available</Label>
                </div>
              </div>
              <div>
                <Label className="text-foreground">Description</Label>
                <Textarea value={formData.description || ""} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="bg-secondary border-border text-foreground" />
              </div>
              <div>
                <Label className="text-foreground">Image</Label>
                <Input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] || null)} className="bg-secondary border-border text-foreground" />
              </div>
              <div className="flex gap-3">
                <Button onClick={handleSaveArtwork} className="bg-gradient-gold text-primary-foreground">Save</Button>
                <Button variant="outline" onClick={resetForm} className="border-border text-foreground">Cancel</Button>
              </div>
            </div>
          )}

          {showForm && tab === "artists" && (
            <div className="mt-6 max-w-2xl rounded-lg border border-border bg-card p-6 space-y-4">
              <h2 className="font-display text-lg font-semibold text-foreground">{editingId ? "Edit" : "New"} Artist</h2>
              <div>
                <Label className="text-foreground">Name *</Label>
                <Input value={formData.name || ""} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="bg-secondary border-border text-foreground" />
              </div>
              <div>
                <Label className="text-foreground">Specialty</Label>
                <Input value={formData.specialty || ""} onChange={(e) => setFormData({ ...formData, specialty: e.target.value })} className="bg-secondary border-border text-foreground" />
              </div>
              <div>
                <Label className="text-foreground">Bio</Label>
                <Textarea value={formData.bio || ""} onChange={(e) => setFormData({ ...formData, bio: e.target.value })} className="bg-secondary border-border text-foreground" />
              </div>
              <div>
                <Label className="text-foreground">Image</Label>
                <Input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] || null)} className="bg-secondary border-border text-foreground" />
              </div>
              <div className="flex gap-3">
                <Button onClick={handleSaveArtist} className="bg-gradient-gold text-primary-foreground">Save</Button>
                <Button variant="outline" onClick={resetForm} className="border-border text-foreground">Cancel</Button>
              </div>
            </div>
          )}

          {/* List */}
          {!showForm && tab === "artworks" && (
            <div className="mt-6 space-y-3">
              {artworks.length === 0 && <p className="text-muted-foreground">No artworks yet. Add your first artwork above.</p>}
              {artworks.map((a) => (
                <div key={a.id} className="flex items-center gap-4 rounded-lg border border-border bg-card p-4">
                  {a.image_url && <img src={a.image_url} alt={a.title} className="h-16 w-16 rounded object-cover" />}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-foreground truncate">{a.title}</h3>
                    <p className="text-sm text-muted-foreground">${a.price} · {a.available ? "Available" : "Sold"}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="icon" onClick={() => startEdit(a)} className="text-muted-foreground hover:text-primary"><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(a.id, "artworks")} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!showForm && tab === "artists" && (
            <div className="mt-6 space-y-3">
              {artists.length === 0 && <p className="text-muted-foreground">No artists yet. Add your first artist above.</p>}
              {artists.map((a) => (
                <div key={a.id} className="flex items-center gap-4 rounded-lg border border-border bg-card p-4">
                  {a.image_url && <img src={a.image_url} alt={a.name} className="h-16 w-16 rounded-full object-cover" />}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-foreground truncate">{a.name}</h3>
                    <p className="text-sm text-muted-foreground">{a.specialty}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="icon" onClick={() => startEdit(a)} className="text-muted-foreground hover:text-primary"><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(a.id, "artists")} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default AdminDashboard;

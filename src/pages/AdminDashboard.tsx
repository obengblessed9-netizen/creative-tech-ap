import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
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
  is_trending: boolean;
  artist_id: string | null;
}

interface DbArtist {
  id: string;
  name: string;
  bio: string | null;
  specialty: string | null;
  image_url: string | null;
  real_name: string | null;
  username: string | null;
  email: string | null;
  phone: string | null;
  medium_used: string | null;
  art_style: string | null;
  city: string | null;
  country: string | null;
}

const AdminDashboard = () => {
  const { user, isAdmin, isStaff, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<"artworks" | "artists" | "reviews" | "inventory" | "sales" | "clients" | "analytics" | "events">("inventory");
  const [artworks, setArtworks] = useState<DbArtwork[]>([]);
  const [artists, setArtists] = useState<DbArtist[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDeleteAllDialog, setShowDeleteAllDialog] = useState(false);
  const [showDeleteAllArtistsDialog, setShowDeleteAllArtistsDialog] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; type: "artworks" | "artists"; name: string; image_url?: string | null } | null>(null);

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
    setArtworks((artRes.data as unknown as DbArtwork[]) ?? []);
    setArtists((artisRes.data as unknown as DbArtist[]) ?? []);
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
      is_trending: formData.is_trending ?? false,
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
      real_name: formData.real_name || null,
      username: formData.username || null,
      email: formData.email || null,
      phone: formData.phone || null,
      medium_used: formData.medium_used || null,
      art_style: formData.art_style || null,
      city: formData.city || null,
      country: formData.country || null,
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

  const handleDelete = (id: string, type: "artworks" | "artists", name: string, image_url?: string | null) => {
    setDeleteTarget({ id, type, name, image_url });
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const { id, type, image_url } = deleteTarget;

    if (type === "artists") {
      // Delete artworks first to avoid foreign key constraints
      const { error: artworksError } = await supabase
        .from("artworks")
        .delete()
        .eq("artist_id", id);
      
      if (artworksError) {
        console.error("Failed to delete artworks", artworksError);
        toast.error("Failed to delete associated artworks");
        setDeleteTarget(null);
        return;
      }
    }

    const { error } = await supabase.from(type).delete().eq("id", id);
    if (error) { toast.error("Delete failed"); setDeleteTarget(null); return; }
    // Clean up storage image
    if (image_url) {
      try {
        const bucket = type === "artworks" ? "artwork-images" : "artist-images";
        const fileName = new URL(image_url).pathname.split("/").pop();
        if (fileName) await supabase.storage.from(bucket).remove([fileName]);
      } catch (_) {}
    }
    toast.success(type === "artworks" ? "Artwork deleted" : "Artist deleted");
    setDeleteTarget(null);
    fetchData();
  };

  const handleDeleteAll = async () => {
    setShowDeleteAllDialog(false);
    // Fetch all artworks to get image URLs
    const { data: allArt } = await supabase.from("artworks").select("image_url");
    const paths: string[] = [];
    allArt?.forEach((art) => {
      if (art.image_url) {
        try {
          const urlObj = new URL(art.image_url);
          const path = urlObj.pathname.split("/").pop();
          if (path) paths.push(path);
        } catch (_) {}
      }
    });
    const { error } = await supabase.from("artworks").delete().neq("id", "00000000-0000-0000-0000-000000000000"); // Using a dummy filter to satisfy type safety if needed, or simply delete all
    if (error) { toast.error("Delete all failed"); return; }
    // Remove images from storage if any
    if (paths.length > 0) {
      const { error: storageError } = await supabase.storage.from("artwork-images").remove(paths);
      if (storageError) console.error("Failed to delete images:", storageError);
    }
    toast.success("All artworks and images deleted");
    fetchData();
  };

  // New function to delete all artists and their images
  const handleDeleteAllArtists = async () => {
    setShowDeleteAllArtistsDialog(false);
    // Get all artists with image URLs
    const { data: allArtists } = await supabase.from("artists").select("image_url");
    const paths: string[] = [];
    allArtists?.forEach((artist) => {
      if (artist.image_url) {
        try {
          const urlObj = new URL(artist.image_url);
          const p = urlObj.pathname.split("/").pop();
          if (p) paths.push(p);
        } catch (_) {}
      }
    });
    const { error } = await supabase.from("artists").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    if (error) { toast.error("Delete all artists failed"); return; }
    if (paths.length > 0) {
      const { error: storageError } = await supabase.storage.from("artist-images").remove(paths);
      if (storageError) console.error("Failed to delete artist images:", storageError);
    }
    toast.success("All artists and images deleted");
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

          {/* Delete All button */}
          {!showForm && tab === "artworks" && isAdmin && (
            <Button variant="destructive" onClick={() => setShowDeleteAllDialog(true)} className="mt-6 ml-2 bg-destructive text-destructive-foreground">
                Delete All Artworks
            </Button>
          )}
          {!showForm && tab === "artists" && isAdmin && (
            <Button variant="destructive" onClick={() => setShowDeleteAllArtistsDialog(true)} className="mt-6 ml-2 bg-destructive text-destructive-foreground">
              Delete All Artists
            </Button>
          )}

          {/* Delete All Confirmation Dialog */}
          <AlertDialog open={showDeleteAllDialog} onOpenChange={setShowDeleteAllDialog}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete All Artworks?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete every artwork from the database and cannot be undone. Are you absolutely sure you want to proceed?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteAll} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Yes, delete all
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          {/* Delete All Artists Dialog */}
          <AlertDialog open={showDeleteAllArtistsDialog} onOpenChange={setShowDeleteAllArtistsDialog}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete All Artists?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete every artist profile and their stored images. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteAllArtists} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Yes, delete all artists
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* Single Item Delete Confirmation Dialog */}
          <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete "{deleteTarget?.name}"?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete this {deleteTarget?.type === "artworks" ? "artwork" : "artist"} and remove its image from storage. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Yes, delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

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
                <div className="flex items-center gap-3 pt-6">
                  <Switch checked={formData.is_trending ?? false} onCheckedChange={(v) => setFormData({ ...formData, is_trending: v })} />
                  <Label className="text-foreground">Trending on Home Page</Label>
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
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label className="text-foreground">Real Name</Label>
                  <Input value={formData.real_name || ""} onChange={(e) => setFormData({ ...formData, real_name: e.target.value })} className="bg-secondary border-border text-foreground" />
                </div>
                <div>
                  <Label className="text-foreground">Username</Label>
                  <Input value={formData.username || ""} onChange={(e) => setFormData({ ...formData, username: e.target.value })} className="bg-secondary border-border text-foreground" />
                </div>
                <div>
                  <Label className="text-foreground">Email</Label>
                  <Input value={formData.email || ""} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="bg-secondary border-border text-foreground" />
                </div>
                <div>
                  <Label className="text-foreground">Phone</Label>
                  <Input value={formData.phone || ""} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="bg-secondary border-border text-foreground" />
                </div>
                <div>
                  <Label className="text-foreground">Specialty</Label>
                  <Input value={formData.specialty || ""} onChange={(e) => setFormData({ ...formData, specialty: e.target.value })} className="bg-secondary border-border text-foreground" />
                </div>
                <div>
                  <Label className="text-foreground">Art Style</Label>
                  <Input value={formData.art_style || ""} onChange={(e) => setFormData({ ...formData, art_style: e.target.value })} className="bg-secondary border-border text-foreground" />
                </div>
                <div>
                  <Label className="text-foreground">Medium Used</Label>
                  <Input value={formData.medium_used || ""} onChange={(e) => setFormData({ ...formData, medium_used: e.target.value })} className="bg-secondary border-border text-foreground" />
                </div>
                <div>
                  <Label className="text-foreground">City</Label>
                  <Input value={formData.city || ""} onChange={(e) => setFormData({ ...formData, city: e.target.value })} className="bg-secondary border-border text-foreground" />
                </div>
                <div>
                  <Label className="text-foreground">Country</Label>
                  <Input value={formData.country || ""} onChange={(e) => setFormData({ ...formData, country: e.target.value })} className="bg-secondary border-border text-foreground" />
                </div>
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
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(a.id, "artworks", a.title, a.image_url)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
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
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(a.id, "artists", a.name, a.image_url)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
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

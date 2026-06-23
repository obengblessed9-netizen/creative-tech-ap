import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import EditArtworkDialog from "@/components/EditArtworkDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Pencil, Trash2, Eye, Heart, Share2, Plus, Package, BarChart3,
  MessageCircle, Users, Image as ImageIcon, DollarSign, Mail, CheckCircle
} from "lucide-react";

interface DashboardArtwork {
  id: string;
  title: string;
  price: number;
  image_url: string | null;
  available: boolean;
  availability_status: string;
  views_count: number;
  likes_count: number;
  shares_count: number;
  created_at: string;
}

interface Message {
  id: string;
  sender_id: string;
  content: string;
  subject: string | null;
  read: boolean;
  created_at: string;
  profile?: { display_name: string | null } | null;
}

const ArtistDashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<"artworks" | "messages" | "analytics">("artworks");
  const [artistId, setArtistId] = useState<string | null>(null);
  const [artworks, setArtworks] = useState<DashboardArtwork[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [followerCount, setFollowerCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [editingArtworkId, setEditingArtworkId] = useState<string | null>(null);
  const [deletingArtworkId, setDeletingArtworkId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      setLoading(true);
      const { data: artist } = await supabase.from("artists").select("id").eq("user_id", user.id).maybeSingle();
      if (!artist) {
        setLoading(false);
        return;
      }
      setArtistId(artist.id);

      const [artworksRes, followersRes, messagesRes] = await Promise.all([
        supabase.from("artworks").select("id, title, price, image_url, available, availability_status, views_count, likes_count, shares_count, created_at").eq("artist_id", artist.id).order("created_at", { ascending: false }),
        supabase.from("followers").select("id", { count: "exact" }).eq("artist_id", artist.id),
        supabase.from("messages").select("id, sender_id, content, subject, read, created_at").eq("recipient_id", user.id).order("created_at", { ascending: false }),
      ]);

      setArtworks((artworksRes.data || []) as DashboardArtwork[]);
      setFollowerCount(followersRes.count ?? 0);

      if (messagesRes.data) {
        const senderIds = [...new Set(messagesRes.data.map(m => m.sender_id))];
        const { data: profiles } = await supabase.from("profiles").select("user_id, display_name").in("user_id", senderIds);
        const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
        setMessages(messagesRes.data.map(m => ({ ...m, profile: profileMap.get(m.sender_id) || null })));
      }
      setLoading(false);
    };
    fetchData();
  }, [user]);

  const handleDeleteArtwork = (id: string) => {
    setDeletingArtworkId(id);
  };

  const confirmDeleteArtwork = async () => {
    if (!deletingArtworkId) return;
    const { data: art } = await supabase
      .from("artworks")
      .select("image_url")
      .eq("id", deletingArtworkId)
      .single();
    const { error } = await supabase.from("artworks").delete().eq("id", deletingArtworkId);
    if (error) {
      toast.error("Delete failed");
    } else {
      if (art?.image_url) {
        try {
          const urlObj = new URL(art.image_url);
          const path = urlObj.pathname.split("/").pop();
          if (path) {
            await supabase.storage.from("artwork-images").remove([path]);
          }
        } catch (_) {}
      }
      toast.success("Artwork deleted");
      setArtworks(prev => prev.filter(a => a.id !== deletingArtworkId));
    }
    setDeletingArtworkId(null);
  };

  const handleMarkSold = async (id: string) => {
    const { error } = await supabase.from("artworks").update({ available: false, availability_status: "sold" }).eq("id", id);
    if (!error) {
      setArtworks(prev => prev.map(a => a.id === id ? { ...a, available: false, availability_status: "sold" } : a));
      toast.success("Marked as sold");
    }
  };

  const handleMarkRead = async (id: string) => {
    await supabase.from("messages").update({ read: true }).eq("id", id);
    setMessages(prev => prev.map(m => m.id === id ? { ...m, read: true } : m));
  };

  const totalEarnings = artworks.filter(a => !a.available).reduce((sum, a) => sum + a.price, 0);
  const totalViews = artworks.reduce((sum, a) => sum + a.views_count, 0);
  const totalLikes = artworks.reduce((sum, a) => sum + a.likes_count, 0);
  const unreadMessages = messages.filter(m => !m.read).length;

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background"><Navbar />
        <div className="container pt-24 text-center text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!artistId) {
    return (
      <div className="min-h-screen bg-background"><Navbar />
        <main className="pt-24 pb-20">
          <div className="container max-w-lg text-center">
            <ImageIcon className="mx-auto h-16 w-16 text-muted-foreground" />
            <h1 className="mt-4 font-display text-2xl font-bold text-foreground">No Artist Profile</h1>
            <p className="mt-2 text-muted-foreground">You need an approved artist profile to access the dashboard.</p>
            <Button onClick={() => navigate("/profile")} className="mt-6 bg-gradient-gold text-primary-foreground shadow-gold">
              Apply as Artist
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-24 pb-20">
        <div className="container">
          <h1 className="font-display text-3xl font-bold text-foreground">Artist Dashboard</h1>

          {/* Stats Cards */}
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: "Artworks", value: artworks.length, icon: ImageIcon, color: "text-primary" },
              { label: "Followers", value: followerCount, icon: Users, color: "text-avatar-ring" },
              { label: "Total Likes", value: totalLikes, icon: Heart, color: "text-destructive" },
              { label: "Earnings", value: `$${totalEarnings.toLocaleString()}`, icon: DollarSign, color: "text-primary" },
            ].map(stat => (
              <div key={stat.label} className="rounded-lg border border-border bg-card p-4 flex items-center gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-md bg-secondary ${stat.color}`}>
                  <stat.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div className="mt-8 flex gap-2">
            {[
              { key: "artworks" as const, label: "My Artworks", icon: ImageIcon },
              { key: "messages" as const, label: `Messages ${unreadMessages > 0 ? `(${unreadMessages})` : ""}`, icon: Mail },
              { key: "analytics" as const, label: "Analytics", icon: BarChart3 },
            ].map(t => (
              <button key={t.key} onClick={() => setTab(t.key)} className={`flex items-center gap-2 rounded-sm px-4 py-2 text-sm font-medium transition-all ${
                tab === t.key ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
              }`}>
                <t.icon className="h-4 w-4" /> {t.label}
              </button>
            ))}
          </div>

          {/* Artworks Tab */}
          {tab === "artworks" && (
            <div className="mt-6">
              <Button onClick={() => navigate("/submit")} className="mb-4 bg-gradient-gold text-primary-foreground shadow-gold">
                <Plus className="mr-2 h-4 w-4" /> Upload New Artwork
              </Button>
              <div className="space-y-3">
                {artworks.map(a => (
                  <div key={a.id} className="flex items-center gap-4 rounded-lg border border-border bg-card p-4">
                    {a.image_url && <img src={a.image_url} alt={a.title} className="h-16 w-16 rounded object-cover" />}
                    <div className="flex-1 min-w-0">
                      <Link to={`/artwork/${a.id}`} className="font-medium text-foreground hover:text-primary truncate block">{a.title}</Link>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                        <span>${a.price.toLocaleString()}</span>
                        <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{a.views_count}</span>
                        <span className="flex items-center gap-1"><Heart className="h-3 w-3" />{a.likes_count}</span>
                        <Badge variant={a.available ? "outline" : "secondary"} className="text-xs capitalize">{a.availability_status}</Badge>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      {a.available && (
                        <Button variant="ghost" size="sm" onClick={() => handleMarkSold(a.id)} className="text-muted-foreground hover:text-primary text-xs">
                          <CheckCircle className="mr-1 h-3 w-3" /> Sold
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" onClick={() => setEditingArtworkId(a.id)} className="text-muted-foreground hover:text-primary">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteArtwork(a.id)} className="text-muted-foreground hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                {artworks.length === 0 && <p className="text-muted-foreground">No artworks yet.</p>}
              </div>
            </div>
          )}

          {/* Messages Tab */}
          {tab === "messages" && (
            <div className="mt-6 space-y-3">
              {messages.map(m => (
                <div key={m.id} onClick={() => handleMarkRead(m.id)} className={`rounded-lg border bg-card p-4 cursor-pointer transition-colors ${m.read ? "border-border" : "border-primary/30 bg-primary/5"}`}>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">{m.profile?.display_name || "User"}</span>
                    {!m.read && <span className="h-2 w-2 rounded-full bg-primary" />}
                    <span className="ml-auto text-xs text-muted-foreground">{new Date(m.created_at).toLocaleDateString()}</span>
                  </div>
                  {m.subject && <p className="text-sm font-medium text-foreground mt-1">{m.subject}</p>}
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{m.content}</p>
                </div>
              ))}
              {messages.length === 0 && <p className="text-muted-foreground">No messages yet.</p>}
            </div>
          )}

          {/* Analytics Tab */}
          {tab === "analytics" && (
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[
                { label: "Total Views", value: totalViews, icon: Eye },
                { label: "Total Likes", value: totalLikes, icon: Heart },
                { label: "Followers", value: followerCount, icon: Users },
                { label: "Artworks Listed", value: artworks.length, icon: ImageIcon },
                { label: "Artworks Sold", value: artworks.filter(a => !a.available).length, icon: Package },
                { label: "Total Earnings", value: `$${totalEarnings.toLocaleString()}`, icon: DollarSign },
              ].map(stat => (
                <div key={stat.label} className="rounded-lg border border-border bg-card p-6 text-center">
                  <stat.icon className="mx-auto h-8 w-8 text-primary" />
                  <p className="mt-3 font-display text-2xl font-bold text-gradient-gold">{stat.value}</p>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {editingArtworkId && (
        <EditArtworkDialog
          open={!!editingArtworkId}
          onClose={() => setEditingArtworkId(null)}
          artworkId={editingArtworkId}
          onSaved={() => {
            if (artistId) {
              supabase.from("artworks").select("id, title, price, image_url, available, availability_status, views_count, likes_count, shares_count, created_at").eq("artist_id", artistId).order("created_at", { ascending: false }).then(res => {
                if (res.data) setArtworks(res.data as DashboardArtwork[]);
              });
            }
          }}
        />
      )}

      <Footer />

      <AlertDialog open={!!deletingArtworkId} onOpenChange={(open) => !open && setDeletingArtworkId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this artwork and remove its data from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteArtwork} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Yes, delete artwork
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ArtistDashboard;


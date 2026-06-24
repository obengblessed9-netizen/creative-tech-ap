import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, ArrowRight, Palette, Users, Image, ShoppingBag, ChevronRight, Play, Pause } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import FeaturedArtistSpotlight from "@/components/FeaturedArtistSpotlight";
import Footer from "@/components/Footer";
import HomeSettings from "@/components/HomeSettings";
import heroPoster from "@/assets/hero-poster.jpg";
import ArtworkCard from "@/components/ArtworkCard";
import { type ArtworkCardData } from "@/components/ArtworkCard";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
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


const categoryGroups = [
  { emoji: "🖼️", label: "Prints & Merchandise", subcategories: ["T-Shirt Designs", "Sticker Designs", "Wall Art Prints"] },
  { emoji: "🧑‍🎨", label: "Portrait Painting", subcategories: ["Portrait Painting"] },
  { emoji: "🏞️", label: "Landscape Painting", subcategories: ["Landscape Painting"] },
  { emoji: "🌊", label: "Seascape Painting", subcategories: ["Seascape Painting"] },
  { emoji: "🍎", label: "Still Life Painting", subcategories: ["Still Life Painting"] },
  { emoji: "🏛️", label: "Historical Painting", subcategories: ["Historical Painting"] },
  { emoji: "✝️", label: "Religious Painting", subcategories: ["Religious Painting"] },
  { emoji: "🎭", label: "Genre Painting", subcategories: ["Genre Painting"] },
  { emoji: "🐾", label: "Animal Painting", subcategories: ["Animal Painting"] },
  { emoji: "🎨", label: "Artistic Style", subcategories: ["Artistic Style"] },
];

const infoCards = [
  { title: "Browse Gallery", description: "Explore curated collections", link: "/gallery", color: "bg-primary/10" },
  { title: "Become an Artist", description: "Watch tutorial & start", link: "/become-artist", color: "bg-avatar-ring/10" },
  { title: "Meet Artists", description: "Discover talented creators", link: "/artists", color: "bg-secondary" },
  { title: "Request an Artwork", description: "Sketch your idea on a blank canvas", link: "/request-artwork", color: "bg-primary/10" },
];

const Index = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [trendingArtworks, setTrendingArtworks] = useState<ArtworkCardData[]>([]);
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({});
  const [videoEnabled, setVideoEnabled] = useState(() => {
    if (typeof window === "undefined") return true;
    const stored = localStorage.getItem("heroVideoEnabled");
    if (stored !== null) return stored === "true";
    return !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  });
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [editingArtworkId, setEditingArtworkId] = useState<string | null>(null);
  const [deletingArtworkId, setDeletingArtworkId] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem("heroVideoEnabled", String(videoEnabled));
  }, [videoEnabled]);

  const fetchTrendingArtworks = async () => {
    // @ts-ignore - Supabase types are out of sync with the DB schema, causing deep instantiation errors
    const { data } = await supabase
      .from("artworks")
      .select("id, title, price, medium, category, image_url, available, artist_id, artists(name)")
      .eq("is_trending", true)
      .order("created_at", { ascending: false })
      .limit(6);

    if (data) {
      setTrendingArtworks(
        data.map((a: any) => ({
          id: a.id,
          title: a.title,
          artist: a.artists?.name ?? "Unknown",
          artistId: a.artist_id ?? "",
          price: Number(a.price),
          medium: a.medium ?? "",
          dimensions: "",
          year: 0,
          category: a.category ?? "Other",
          image: a.image_url ?? "",
          description: "",
          available: a.available,
        }))
      );
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      await fetchTrendingArtworks();

      const { data: allArtworks } = await supabase.from("artworks").select("category");
      const counts: Record<string, number> = {};
      (allArtworks ?? []).forEach((a: any) => {
        if (a.category) counts[a.category] = (counts[a.category] || 0) + 1;
      });
      setCategoryCounts(counts);
    };
    fetchData();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/gallery?search=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      navigate("/gallery");
    }
  };

  const handleDeleteArtwork = async (id: string) => {
    setDeletingArtworkId(id);
  };

  const confirmDeleteArtwork = async () => {
    if (!deletingArtworkId) return;
    const { error } = await supabase.from("artworks").delete().eq("id", deletingArtworkId);
    if (error) toast.error("Delete failed");
    else {
      toast.success("Artwork deleted");
      setTrendingArtworks(prev => prev.filter(a => a.id !== deletingArtworkId));
    }
    setDeletingArtworkId(null);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero with Search */}
      <section className="relative overflow-hidden pt-24 pb-16">
        {videoEnabled ? (
          <video
            src="/videos/hero-bg.mp4"
            poster={heroPoster}
            autoPlay
            loop
            muted
            playsInline
            preload="auto"
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <img
            src={heroPoster}
            alt="Art studio hero"
            className="absolute inset-0 h-full w-full object-cover"
            width={1920}
            height={1080}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/80 via-primary/70 to-primary/60" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,hsl(38_70%_65%/0.3),transparent_60%)]" />
        <button
          type="button"
          onClick={() => setVideoEnabled((v) => !v)}
          aria-label={videoEnabled ? "Pause background video" : "Play background video"}
          className="absolute top-24 right-4 z-10 inline-flex items-center gap-1.5 rounded-full bg-background/80 px-3 py-1.5 text-xs font-medium text-foreground shadow backdrop-blur-sm transition hover:bg-background"
        >
          {videoEnabled ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
          {videoEnabled ? "Pause motion" : "Play motion"}
        </button>
        <div className="container relative text-center">
          <h1 className="font-display text-4xl font-bold text-primary-foreground md:text-5xl">
            What are you looking for?
          </h1>
          <form onSubmit={handleSearch} className="mx-auto mt-8 flex max-w-xl overflow-hidden rounded-lg bg-background shadow-lg">
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="I am looking for..."
              className="flex-1 border-0 bg-transparent text-foreground placeholder:text-muted-foreground focus-visible:ring-0 h-12 text-base"
            />
            <Button type="submit" size="icon" className="m-1 h-10 w-10 shrink-0 rounded-md bg-primary text-primary-foreground hover:bg-primary/90">
              <Search className="h-5 w-5" />
            </Button>
          </form>
          <div className="mt-5 flex justify-center">
            <Link
              to="/request-artwork"
              className="inline-flex items-center gap-2 rounded-full bg-background/95 px-5 py-2.5 text-sm font-medium text-foreground shadow-lg transition-all hover:scale-[1.02] hover:bg-background"
            >
              <Palette className="h-4 w-4 text-primary" />
              Request an Artwork
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>



      

      {/* Main Content */}
      <section className="py-10">
        <div className="container">
          <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
            <div className="space-y-1">
              {categoryGroups.map((cat) => {
                const totalCount = cat.subcategories.reduce((sum, sub) => sum + (categoryCounts[sub] || 0), 0);
                return (
                  <Link
                    key={cat.label}
                    to={`/gallery?category=${encodeURIComponent(cat.subcategories[0])}`}
                    className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 transition-colors hover:bg-secondary group"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-md bg-secondary text-lg">
                      {cat.emoji}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground text-sm truncate">{cat.label}</p>
                      <p className="text-xs text-muted-foreground">{totalCount} artworks</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </Link>
                );
              })}
              <Link
                to="/gallery"
                className="flex items-center gap-3 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 transition-colors hover:bg-primary/10 group mt-2"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <ShoppingBag className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-primary text-sm">View All</p>
                  <p className="text-xs text-muted-foreground">Browse full collection</p>
                </div>
                <ArrowRight className="h-4 w-4 text-primary" />
              </Link>
            </div>

            <div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {infoCards.map((card) => (
                  <Link
                    key={card.title}
                    to={card.link}
                    className={`rounded-xl ${card.color} border border-border p-6 text-center transition-all hover:scale-[1.02] hover:shadow-md`}
                  >
                    <p className="font-display text-lg font-semibold text-foreground">{card.title}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{card.description}</p>
                  </Link>
                ))}
              </div>

              <div className="mt-10">
                <div className="flex items-center justify-between">
                  <h2 className="font-display text-2xl font-semibold text-foreground">Trending Artworks</h2>
                  <Link to="/gallery" className="flex items-center gap-1 text-sm font-medium text-primary hover:underline">
                    View All <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
                {trendingArtworks.length > 0 ? (
                  <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                    {trendingArtworks.map((artwork, i) => (
                      <ArtworkCard 
                        key={artwork.id} 
                        artwork={artwork} 
                        index={i}
                        onEdit={isAdmin ? () => setEditingArtworkId(artwork.id) : undefined}
                        onDelete={isAdmin ? () => handleDeleteArtwork(artwork.id) : undefined}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="mt-6 text-muted-foreground">No artworks yet. Be the first artist to submit!</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Artist of the Month */}
      <FeaturedArtistSpotlight />

      {/* Stats */}
      <section className="border-y border-border bg-card py-14">
        <div className="container grid grid-cols-2 gap-8 md:grid-cols-4">
          {[
            { value: "200+", label: "Artworks", icon: Image },
            { value: "50+", label: "Artists", icon: Users },
            { value: "1.2K", label: "Collectors", icon: ShoppingBag },
            { value: "98%", label: "Satisfaction", icon: Palette },
          ].map((stat) => (
            <div key={stat.label} className="flex flex-col items-center text-center gap-2">
              <stat.icon className="h-6 w-6 text-primary" />
              <p className="font-display text-3xl font-bold text-gradient-gold">{stat.value}</p>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      <Footer />
      <HomeSettings />

      {editingArtworkId && (
        <EditArtworkDialog
          open={!!editingArtworkId}
          onClose={() => setEditingArtworkId(null)}
          artworkId={editingArtworkId}
          onSaved={() => {
            fetchTrendingArtworks();
          }}
        />
      )}

      <AlertDialog open={!!deletingArtworkId} onOpenChange={(open) => !open && setDeletingArtworkId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this artwork from the gallery.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>No, cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteArtwork} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Yes, delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Index;

import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import ArtworkCard from "@/components/ArtworkCard";
import { type ArtworkCardData } from "@/components/ArtworkCard";
import { useAuth } from "@/contexts/AuthContext";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ShieldCheck, Trash2 } from "lucide-react";

interface DbArtist {
  id: string;
  name: string;
  bio: string | null;
  specialty: string | null;
  image_url: string | null;
  verified: boolean;
  user_id: string | null;
}

const Artists = () => {
  const [artists, setArtists] = useState<DbArtist[]>([]);
  const [artworksByArtist, setArtworksByArtist] = useState<Record<string, ArtworkCardData[]>>({});
  const [loading, setLoading] = useState(true);

  const { user, isAdmin } = useAuth();
  const [deleteArtistTarget, setDeleteArtistTarget] = useState<{ id: string; name: string; image: string | null } | null>(null);
  const [deleteArtworkTarget, setDeleteArtworkTarget] = useState<{ id: string; title: string; image: string } | null>(null);

  const fetchData = async () => {
    setLoading(true);
    const [artistsRes, artworksRes] = await Promise.all([
      supabase.from("artists").select("id, name, bio, specialty, image_url, verified, user_id").order("created_at", { ascending: false }),
      supabase.from("artworks").select("id, title, price, medium, category, image_url, available, artist_id, description, dimensions, year, artists(name, user_id)"),
    ]);

    setArtists((artistsRes.data as DbArtist[]) ?? []);

    const grouped: Record<string, ArtworkCardData[]> = {};
    for (const a of (artworksRes.data ?? []) as any[]) {
      const artistId = a.artist_id ?? "";
      if (!grouped[artistId]) grouped[artistId] = [];
      grouped[artistId].push({
        id: a.id,
        title: a.title,
        artist: a.artists?.name ?? "Unknown",
        artistId,
        artistUserId: a.artists?.user_id ?? "",
        price: Number(a.price),
        medium: a.medium ?? "",
        dimensions: a.dimensions ?? "",
        year: a.year ?? 0,
        category: a.category ?? "Other",
        image: a.image_url ?? "",
        description: a.description ?? "",
        available: a.available,
      });
    }
    setArtworksByArtist(grouped);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const confirmDeleteArtist = async () => {
    if (!deleteArtistTarget) return;
    const { id, image } = deleteArtistTarget;

    // First delete associated artworks to prevent foreign key constraint violations
    const { error: artworkError } = await supabase.from("artworks").delete().eq("artist_id", id);
    if (artworkError) {
      toast.error("Failed to delete artist's artworks: " + artworkError.message);
      setDeleteArtistTarget(null);
      return;
    }

    const { error } = await supabase.from("artists").delete().eq("id", id);
    if (error) { toast.error("Failed to delete artist: " + error.message); setDeleteArtistTarget(null); return; }
    
    if (image) {
      try {
        const fileName = new URL(image).pathname.split("/").pop();
        if (fileName) await supabase.storage.from("artist-images").remove([fileName]);
      } catch (_) {}
    }
    toast.success("Artist deleted successfully");
    setDeleteArtistTarget(null);
    fetchData();
  };

  const confirmDeleteArtwork = async () => {
    if (!deleteArtworkTarget) return;
    const { id, image } = deleteArtworkTarget;
    const { error } = await supabase.from("artworks").delete().eq("id", id);
    if (error) { toast.error("Failed to delete artwork: " + error.message); setDeleteArtworkTarget(null); return; }
    
    if (image) {
      try {
        const fileName = new URL(image).pathname.split("/").pop();
        if (fileName) await supabase.storage.from("artwork-images").remove([fileName]);
      } catch (_) {}
    }
    toast.success("Artwork deleted successfully");
    setDeleteArtworkTarget(null);
    fetchData();
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-24 pb-20">
        <div className="container">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-primary">Our Talent</p>
          <h1 className="mt-2 font-display text-4xl font-bold text-foreground md:text-5xl">Featured Artists</h1>
          <p className="mt-4 max-w-2xl text-muted-foreground leading-relaxed">
            Meet the creative minds behind our curated collection of contemporary art.
          </p>

          {loading ? (
            <p className="mt-14 text-muted-foreground">Loading artists...</p>
          ) : artists.length === 0 ? (
            <p className="mt-14 text-muted-foreground">No artists yet. Apply to become one!</p>
          ) : (
            <div className="mt-14 space-y-20">
              {artists.map((artist, idx) => {
                const artistWorks = artworksByArtist[artist.id] ?? [];
                return (
                  <div
                    key={artist.id}
                    className="opacity-0 animate-fade-in"
                    style={{ animationDelay: `${idx * 150}ms` }}
                  >
                    <div className="flex flex-col gap-6 md:flex-row md:items-center md:gap-10">
                      <Link to={`/artist/${artist.id}`} className="h-24 w-24 flex-shrink-0 overflow-hidden rounded-full border-[3px] border-avatar-ring bg-avatar-ring/20 shadow-[0_0_12px_hsl(var(--avatar-ring)/0.4)]">
                        {artist.image_url ? (
                          <img src={artist.image_url} alt={artist.name} className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-2xl font-bold text-avatar-ring">
                            {artist.name.charAt(0)}
                          </div>
                        )}
                      </Link>
                      <div>
                        <Link to={`/artist/${artist.id}`} className="hover:text-primary transition-colors">
                          <h2 className="font-display text-2xl font-semibold text-foreground flex items-center gap-2">
                            {artist.name}
                            {artist.verified && <ShieldCheck className="h-5 w-5 text-primary" />}
                          </h2>
                        </Link>
                        {artist.specialty && <p className="mt-1 text-sm font-medium text-primary">{artist.specialty}</p>}
                        {artist.bio && <p className="mt-2 max-w-xl text-sm text-muted-foreground leading-relaxed">{artist.bio}</p>}
                        {(isAdmin || (user && user.id === artist.user_id)) && (
                          <Button 
                            variant="destructive" 
                            size="sm" 
                            className="mt-4"
                            onClick={() => setDeleteArtistTarget({ id: artist.id, name: artist.name, image: artist.image_url })}
                          >
                            <Trash2 className="mr-2 h-4 w-4" /> Delete Artist
                          </Button>
                        )}
                      </div>
                    </div>
                    {artistWorks.length > 0 && (
                      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        {artistWorks.map((work, i) => {
                          const canDeleteWork = isAdmin || (user && work.artistUserId === user.id);
                          return (
                            <ArtworkCard 
                              key={work.id} 
                              artwork={work} 
                              index={i} 
                              onDelete={canDeleteWork ? () => setDeleteArtworkTarget({ id: work.id, title: work.title, image: work.image }) : undefined}
                            />
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Delete Artist Dialog */}
          <AlertDialog open={!!deleteArtistTarget} onOpenChange={(open) => { if (!open) setDeleteArtistTarget(null); }}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Artist Profile?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete the profile for "{deleteArtistTarget?.name}" and remove their image from storage. Artworks may be cascadingly deleted by the database. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={confirmDeleteArtist} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Yes, delete artist
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* Delete Artwork Dialog */}
          <AlertDialog open={!!deleteArtworkTarget} onOpenChange={(open) => { if (!open) setDeleteArtworkTarget(null); }}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Artwork "{deleteArtworkTarget?.title}"?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete this artwork and remove its image from storage. This action cannot be undone.
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
      </main>
      <Footer />
    </div>
  );
};

export default Artists;

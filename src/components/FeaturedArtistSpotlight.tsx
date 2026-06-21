import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Award, ArrowRight, Star, Trash2, MapPin, Mail, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface FeaturedArtist {
  id: string;
  name: string;
  bio: string | null;
  image_url: string | null;
  specialty: string | null;
  city: string | null;
  country: string | null;
  description: string | null;
  real_name?: string | null;
  username?: string | null;
  email?: string | null;
  phone?: string | null;
  medium_used?: string | null;
  art_style?: string | null;
}

const FeaturedArtistSpotlight = () => {
  const { isAdmin, user } = useAuth();
  const [artist, setArtist] = useState<FeaturedArtist | null>(null);
  const [featuredId, setFeaturedId] = useState<string | null>(null);
  const [description, setDescription] = useState<string>("");
  const [loading, setLoading] = useState(true);

  const handleDelete = async () => {
    if (!artist || !user) return;
    if (!confirm(`Permanently delete the artist "${artist.name}"? This removes their profile and all related featured listings. This cannot be undone.`)) return;
    await supabase.from("featured_artists").delete().eq("artist_id", artist.id);
    const { error } = await supabase.from("artists").delete().eq("id", artist.id);
    if (error) return toast.error(error.message);
    // Audit log
    await supabase.from("admin_audit_log").insert({
      actor_id: user.id,
      action: "delete_featured_artist",
      target_type: "artist",
      target_id: artist.id,
      metadata: {
        artist_name: artist.name,
        featured_card_id: featuredId,
        featured_title: "Featured Artist of the Month",
      },
    });
    toast.success("Artist deleted permanently");
    setArtist(null);
  };

  useEffect(() => {
    const fetchFeatured = async () => {
      const now = new Date();
      const { data: featured } = await supabase
        .from("featured_artists")
        .select("id, artist_id, description, artists(id, name, bio, image_url, specialty, city, country, real_name, username, email, phone, medium_used, art_style)")
        .eq("month", now.getMonth() + 1)
        .eq("year", now.getFullYear())
        .maybeSingle();

      if (featured?.artists) {
        const a = featured.artists as any;
        setFeaturedId(featured.id);
        setArtist({
          id: a.id,
          name: a.name,
          bio: a.bio,
          image_url: a.image_url,
          specialty: a.specialty,
          city: a.city,
          country: a.country,
          description: featured.description,
          real_name: a.real_name,
          username: a.username,
          email: a.email,
          phone: a.phone,
          medium_used: a.medium_used,
          art_style: a.art_style,
        });
        setDescription(featured.description || "");
      }
      setLoading(false);
    };
    fetchFeatured();
  }, []);

  if (loading || !artist) return null;

  return (
    <section className="py-14 border-b border-border">
      <div className="container">
        <div className="flex items-center gap-2 mb-8">
          <Award className="h-6 w-6 text-primary" />
          <h2 className="font-display text-2xl font-semibold text-foreground">Featured Artist of the Month</h2>
        </div>
        <div className="rounded-2xl border border-primary/20 bg-card overflow-hidden">
          <div className="grid md:grid-cols-[320px_1fr] gap-0">
            <div className="aspect-square md:aspect-auto bg-secondary flex items-center justify-center">
              {artist.image_url ? (
                <img src={artist.image_url} alt={artist.name} className="h-full w-full object-cover" />
              ) : (
                <Star className="h-20 w-20 text-primary/30" />
              )}
            </div>
            <div className="p-8 flex flex-col justify-center">
              <p className="text-xs uppercase tracking-widest text-primary font-semibold mb-2">
                {new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}
              </p>
              <h3 className="font-display text-3xl font-bold text-gradient-gold mb-2">{artist.name}</h3>
              {artist.username && <p className="text-sm text-muted-foreground mb-1">@{artist.username}</p>}
              {artist.real_name && <p className="text-sm text-muted-foreground mb-1">Real Name: {artist.real_name}</p>}
              
              {artist.specialty && (
                <p className="text-sm text-primary mb-1">{artist.specialty}</p>
              )}
              {artist.art_style && <p className="text-xs text-muted-foreground mb-1">Style: {artist.art_style}</p>}
              {artist.medium_used && <p className="text-xs text-muted-foreground mb-3">Medium: {artist.medium_used}</p>}
              
              {(artist.city || artist.country) && (
                <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                  <MapPin className="h-3 w-3" /> {[artist.city, artist.country].filter(Boolean).join(", ")}
                </p>
              )}
              {artist.email && (
                <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                  <Mail className="h-3 w-3" /> {artist.email}
                </p>
              )}
              {artist.phone && (
                <p className="text-xs text-muted-foreground mb-4 flex items-center gap-1">
                  <Phone className="h-3 w-3" /> {artist.phone}
                </p>
              )}
              <p className="text-foreground/80 leading-relaxed mb-6 line-clamp-3">
                {description || artist.bio || "A talented artist making waves in the art community."}
              </p>
              <div className="flex flex-wrap gap-2">
                <Button asChild className="w-fit">
                  <Link to={`/artist/${artist.id}`}>
                    View Profile <ArrowRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
                {isAdmin && (
                  <Button variant="destructive" onClick={handleDelete} className="w-fit">
                    <Trash2 className="mr-1 h-4 w-4" /> Delete Artist
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FeaturedArtistSpotlight;

import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft, ShoppingBag, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ImageLightbox from "@/components/ImageLightbox";
import ArtworkEngagement from "@/components/ArtworkComments";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ArtworkData {
  id: string;
  title: string;
  price: number;
  medium: string | null;
  dimensions: string | null;
  year: number | null;
  category: string | null;
  image_url: string | null;
  additional_images: string[] | null;
  description: string | null;
  inspiration: string | null;
  certificate_url: string | null;
  availability_status: string;
  available: boolean;
  artist_id: string | null;
  artists?: { name: string; user_id: string | null } | null;
}

const ArtworkDetail = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const { addToCart, isInCart } = useCart();
  const navigate = useNavigate();
  const [artwork, setArtwork] = useState<ArtworkData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string>("");

  useEffect(() => {
    if (!id) return;
    const fetchArtwork = async () => {
      const { data } = await supabase
        .from("artworks")
        .select("id, title, price, medium, dimensions, year, category, image_url, additional_images, description, inspiration, certificate_url, availability_status, available, artist_id, artists(name, user_id)")
        .eq("id", id)
        .maybeSingle();
      const artworkData = data as ArtworkData | null;
      setArtwork(artworkData);
      setSelectedImage(artworkData?.image_url || "/placeholder.svg");
      setLoading(false);
    };
    fetchArtwork();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container flex items-center justify-center pt-32">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!artwork) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container flex items-center justify-center pt-32">
          <p className="text-muted-foreground">Artwork not found.</p>
        </div>
      </div>
    );
  }

  const inCart = isInCart(artwork.id);
  const allImages = [artwork.image_url, ...(artwork.additional_images || [])].filter(Boolean) as string[];

  const handlePlaceOrderClick = () => {
    if (!user) { 
      toast.error("Please sign in first"); 
      navigate("/auth");
      return; 
    }
    if (!artwork.available) {
      toast.error("This artwork is sold out");
      return;
    }
    navigate(`/order/${artwork.id}`, { state: { artwork } });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-24 pb-20">
        <div className="container">
          <Link to="/gallery" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors mb-8">
            <ArrowLeft className="h-4 w-4" /> Back to Gallery
          </Link>

          <div className="grid gap-10 lg:grid-cols-2">
            {/* Image Gallery */}
            <div className="space-y-3">
              <ImageLightbox src={selectedImage} alt={artwork.title} />
              {allImages.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {allImages.map((img, i) => (
                    <button
                      key={i}
                      onClick={() => setSelectedImage(img)}
                      className={`h-16 w-16 shrink-0 rounded-md overflow-hidden border-2 transition-all ${
                        selectedImage === img ? "border-primary" : "border-border hover:border-primary/50"
                      }`}
                    >
                      <img src={img} alt={`View ${i + 1}`} className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Details */}
            <div className="flex flex-col justify-center">
              <p className="text-sm font-medium uppercase tracking-[0.2em] text-primary">{artwork.category}</p>
              <h1 className="mt-2 font-display text-4xl font-bold text-foreground">{artwork.title}</h1>
              <p className="mt-1 text-lg text-muted-foreground">
                by{" "}
                {artwork.artist_id ? (
                  <Link to={`/artist/${artwork.artist_id}`} className="text-primary hover:underline">
                    {artwork.artists?.name ?? "Unknown"}
                  </Link>
                ) : (
                  artwork.artists?.name ?? "Unknown"
                )}
              </p>
              {artwork.description && (
                <p className="mt-6 leading-relaxed text-foreground/80">{artwork.description}</p>
              )}
              {artwork.inspiration && (
                <div className="mt-4">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Inspiration</p>
                  <p className="text-sm text-foreground/80 italic">{artwork.inspiration}</p>
                </div>
              )}

              <div className="mt-8 grid grid-cols-2 gap-4 border-y border-border py-6">
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">Medium</p>
                  <p className="mt-1 text-sm text-foreground">{artwork.medium || "—"}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">Dimensions</p>
                  <p className="mt-1 text-sm text-foreground">{artwork.dimensions || "—"}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">Year</p>
                  <p className="mt-1 text-sm text-foreground">{artwork.year || "—"}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">Status</p>
                  <p className={`mt-1 text-sm font-medium capitalize ${artwork.availability_status === "available" ? "text-avatar-ring" : "text-destructive"}`}>
                    {artwork.availability_status}
                  </p>
                </div>
              </div>

              {artwork.certificate_url && (
                <a href={artwork.certificate_url} target="_blank" rel="noopener noreferrer" className="mt-3 text-sm text-primary hover:underline">
                  View Certificate of Authenticity
                </a>
              )}

              <div className="mt-8 flex items-center gap-6">
                <p className="font-display text-3xl font-bold text-gradient-gold">${Number(artwork.price).toLocaleString()}</p>
                {user ? (
                  <Button
                    size="lg"
                    disabled={!artwork.available || inCart}
                    onClick={handlePlaceOrderClick}
                    className="bg-gradient-gold text-primary-foreground shadow-gold hover:opacity-90 disabled:opacity-40"
                  >
                    {inCart ? (
                      <><Check className="mr-2 h-4 w-4" /> In Cart</>
                    ) : (
                      <><ShoppingBag className="mr-2 h-4 w-4" /> {artwork.available ? "Place Order" : "Sold Out"}</>
                    )}
                  </Button>
                ) : (
                  <Button asChild size="lg" className="bg-gradient-gold text-primary-foreground shadow-gold hover:opacity-90">
                    <Link to="/auth">Sign In to Purchase</Link>
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Engagement Section */}
          <div className="mt-12 max-w-3xl">
            <ArtworkEngagement
              artworkId={artwork.id}
              artistUserId={artwork.artists?.user_id}
              artworkTitle={artwork.title}
            />
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ArtworkDetail;

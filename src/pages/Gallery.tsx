import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Search, ArrowUpDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ArtworkCard from "@/components/ArtworkCard";
import { type ArtworkCardData } from "@/components/ArtworkCard";
import { supabase } from "@/integrations/supabase/client";

const Gallery = () => {
  const [searchParams] = useSearchParams();
  const [activeCategory, setActiveCategory] = useState(searchParams.get("category") || "All");
  const [searchQuery, setSearchQuery] = useState(searchParams.get("search") || "");
  const [sortBy, setSortBy] = useState("newest");
  const [artworks, setArtworks] = useState<ArtworkCardData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchArtworks = async () => {
      const { data } = await supabase
        .from("artworks")
        .select("id, title, price, medium, category, image_url, available, artist_id, description, dimensions, year, artists(name)")
        .order("created_at", { ascending: false });

      setArtworks(
        (data ?? []).map((a: any) => ({
          id: a.id,
          title: a.title,
          artist: a.artists?.name ?? "Unknown",
          artistId: a.artist_id ?? "",
          price: Number(a.price),
          medium: a.medium ?? "",
          dimensions: a.dimensions ?? "",
          year: a.year ?? 0,
          category: a.category ?? "Other",
          image: a.image_url ?? "",
          description: a.description ?? "",
          available: a.available,
        }))
      );
      setLoading(false);
    };
    fetchArtworks();
  }, []);

  const categoryGroups = [
    { label: "🖼️ Prints & Merchandise", options: ["T-Shirt Designs", "Sticker Designs", "Wall Art Prints"] },
    { label: "🧑‍🎨 Portrait Painting", options: ["Portrait Painting"] },
    { label: "🏞️ Landscape Painting", options: ["Landscape Painting"] },
    { label: "🌊 Seascape Painting", options: ["Seascape Painting"] },
    { label: "🍎 Still Life Painting", options: ["Still Life Painting"] },
    { label: "🏛️ Historical Painting", options: ["Historical Painting"] },
    { label: "✝️ Religious Painting", options: ["Religious Painting"] },
    { label: "🎭 Genre Painting", options: ["Genre Painting"] },
    { label: "🐾 Animal Painting", options: ["Animal Painting"] },
    { label: "🎨 Artistic Style", options: ["Artistic Style"] },
  ];
  const allCategories = categoryGroups.flatMap((g) => g.options);
  const usedCategories = allCategories.filter((c) => artworks.some((a) => a.category === c));

  const filtered = artworks
    .filter((a) => {
      const matchesCategory = activeCategory === "All" || a.category === activeCategory;
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !q ||
        a.title.toLowerCase().includes(q) ||
        a.artist.toLowerCase().includes(q) ||
        a.category?.toLowerCase().includes(q) ||
        a.medium?.toLowerCase().includes(q);
      return matchesCategory && matchesSearch;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "price-asc": return a.price - b.price;
        case "price-desc": return b.price - a.price;
        case "name": return a.title.localeCompare(b.title);
        default: return 0;
      }
    });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-24 pb-20">
        <div className="container">
          <div className="max-w-2xl">
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-primary">Collection</p>
            <h1 className="mt-2 font-display text-4xl font-bold text-foreground md:text-5xl">Browse Artworks</h1>
            <p className="mt-4 text-muted-foreground leading-relaxed">
              Explore our curated collection of contemporary art from emerging and established artists.
            </p>
          </div>

          <div className="mt-8 flex flex-col sm:flex-row gap-3 max-w-xl">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by title, artist, or category..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-secondary border-border text-foreground placeholder:text-muted-foreground"
              />
            </div>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-full sm:w-[180px] bg-secondary border-border text-foreground">
                <ArrowUpDown className="mr-2 h-4 w-4 text-muted-foreground" />
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest First</SelectItem>
                <SelectItem value="price-asc">Price: Low → High</SelectItem>
                <SelectItem value="price-desc">Price: High → Low</SelectItem>
                <SelectItem value="name">Name: A → Z</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="mt-4 space-y-3">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setActiveCategory("All")}
                className={`rounded-sm px-4 py-2 text-sm font-medium transition-all ${
                  activeCategory === "All"
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                }`}
              >
                All
              </button>
              {categoryGroups.map((group) => {
                const groupActive = group.options.includes(activeCategory);
                return (
                  <Select key={group.label} value={groupActive ? activeCategory : ""} onValueChange={setActiveCategory}>
                    <SelectTrigger className={`w-auto gap-1 rounded-sm border-0 px-4 py-2 text-sm font-medium ${groupActive ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-secondary/80"}`}>
                      <span>{group.label}</span>
                    </SelectTrigger>
                    <SelectContent>
                      {group.options.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                );
              })}
            </div>
          </div>

          {loading ? (
            <p className="mt-10 text-muted-foreground">Loading...</p>
          ) : (
            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((artwork, i) => (
                <ArtworkCard key={artwork.id} artwork={artwork} index={i} />
              ))}
            </div>
          )}

          {!loading && filtered.length === 0 && (
            <p className="mt-20 text-center text-muted-foreground">
              {searchQuery ? `No artworks matching "${searchQuery}"` : "No artworks found in this category."}
            </p>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Gallery;

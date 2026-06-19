import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  ArrowUpRight,
  Loader2,
  Plus,
  ShieldCheck,
  Truck,
  Award,
  Brush,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { storefrontApiRequest, STOREFRONT_QUERY, ShopifyProduct } from "@/lib/shopify";
import { useShopifyCartStore } from "@/stores/shopifyCartStore";
import { useShopifyCartSync } from "@/hooks/useShopifyCartSync";
import { ShopifyCartDrawer } from "@/components/shop/ShopifyCartDrawer";

const Sell = () => {
  useShopifyCartSync();
  const [products, setProducts] = useState<ShopifyProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const addItem = useShopifyCartStore((s) => s.addItem);
  const adding = useShopifyCartStore((s) => s.isLoading);

  useEffect(() => {
    (async () => {
      try {
        const data = await storefrontApiRequest(STOREFRONT_QUERY, { first: 50, query: null });
        setProducts(data?.data?.products?.edges || []);
      } catch (e) {
        console.error(e);
        toast.error("Couldn't load products");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      const t = (p.node as any).productType;
      if (t) set.add(t);
    });
    return ["All", ...Array.from(set)];
  }, [products]);

  const filtered = useMemo(() => {
    if (activeCategory === "All") return products;
    return products.filter((p) => (p.node as any).productType === activeCategory);
  }, [products, activeCategory]);

  const featured = filtered[0];
  const rest = filtered.slice(1);

  const handleAdd = async (p: ShopifyProduct) => {
    const v = p.node.variants.edges[0]?.node;
    if (!v) return;
    await addItem({
      product: p,
      variantId: v.id,
      variantTitle: v.title,
      price: v.price,
      quantity: 1,
      selectedOptions: v.selectedOptions || [],
    });
    toast.success("Added to cart", { position: "top-center" });
  };

  const formatPrice = (amount: string, currency: string) =>
    `${currency} ${parseFloat(amount).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Top bar */}
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-background/80 border-b border-border/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
          <div className="hidden sm:block text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
            AGMS · The Shop
          </div>
          <ShopifyCartDrawer />
        </div>
      </header>

      {/* Editorial Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-accent/10 blur-3xl" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-14 sm:py-24 relative">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-end">
            <div className="lg:col-span-7">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/30 bg-primary/5 text-[10px] uppercase tracking-[0.25em] text-primary mb-6">
                <Brush className="h-3 w-3" />
                Collector's Edition · 2026
              </div>
              <h1 className="font-serif text-4xl sm:text-6xl lg:text-7xl leading-[1.05] tracking-tight">
                Own a piece of
                <br />
                <span className="italic text-primary">contemporary Africa.</span>
              </h1>
              <p className="mt-6 text-muted-foreground text-base sm:text-lg max-w-xl leading-relaxed">
                A curated catalogue of originals, limited prints and sculptures from
                our resident artists — each piece authenticated, archived, and
                shipped worldwide.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Button
                  size="lg"
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                  onClick={() =>
                    document.getElementById("catalogue")?.scrollIntoView({ behavior: "smooth" })
                  }
                >
                  Browse the catalogue
                  <ArrowUpRight className="ml-1 h-4 w-4" />
                </Button>
                <Link
                  to="/create-profile"
                  className="text-sm text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
                >
                  Are you an artist? Sell with us →
                </Link>
              </div>
            </div>

            <div className="lg:col-span-5 grid grid-cols-3 gap-3">
              {[
                { k: "Artists", v: "120+" },
                { k: "Works sold", v: "3.4k" },
                { k: "Countries", v: "32" },
              ].map((s) => (
                <div
                  key={s.k}
                  className="rounded-lg border border-border/50 bg-card/50 p-4 text-center"
                >
                  <div className="font-serif text-2xl sm:text-3xl text-primary">{s.v}</div>
                  <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mt-1">
                    {s.k}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Trust strip */}
        <div className="border-y border-border/40 bg-card/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs sm:text-sm">
            {[
              { icon: ShieldCheck, label: "Certificate of authenticity" },
              { icon: Truck, label: "Worldwide insured shipping" },
              { icon: Award, label: "Vetted resident artists" },
              { icon: Brush, label: "Originals & limited editions" },
            ].map((t) => (
              <div key={t.label} className="flex items-center gap-2 text-muted-foreground">
                <t.icon className="h-4 w-4 text-primary shrink-0" />
                <span className="truncate">{t.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Catalogue */}
      <main id="catalogue" className="max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        {/* Section header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <div className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-2">
              The Catalogue
            </div>
            <h2 className="font-serif text-3xl sm:text-4xl">Available works</h2>
          </div>

          {categories.length > 1 && (
            <div className="flex flex-wrap gap-2">
              {categories.map((c) => (
                <button
                  key={c}
                  onClick={() => setActiveCategory(c)}
                  className={`px-3 py-1.5 text-xs uppercase tracking-wider rounded-full border transition-colors ${
                    activeCategory === c
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border/60 text-muted-foreground hover:text-foreground hover:border-primary/40"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-32">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-24 border border-dashed border-border/60 rounded-2xl">
            <h3 className="font-serif text-2xl mb-2">The walls are still bare</h3>
            <p className="text-muted-foreground max-w-md mx-auto mb-6">
              Tell me what you'd like to sell — title, short description, and
              price — and I'll hang the first piece in your shop.
            </p>
            <div className="inline-flex items-center gap-2 text-sm text-primary">
              <Plus className="h-4 w-4" />
              e.g. "Add 'Akan Dawn' canvas, 1200 GHS"
            </div>
          </div>
        ) : (
          <>
            {/* Featured piece */}
            {featured && (
              <article className="group grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-10 mb-16 rounded-2xl overflow-hidden border border-border/50 bg-card">
                <div className="relative aspect-[4/5] lg:aspect-auto bg-secondary/30 overflow-hidden">
                  {featured.node.images.edges[0]?.node ? (
                    <img
                      src={featured.node.images.edges[0].node.url}
                      alt={featured.node.images.edges[0].node.altText || featured.node.title}
                      className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-[1200ms]"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">
                      No image
                    </div>
                  )}
                  <div className="absolute top-4 left-4 px-3 py-1 rounded-full bg-background/80 backdrop-blur text-[10px] uppercase tracking-[0.25em] text-primary border border-primary/30">
                    Featured
                  </div>
                </div>
                <div className="p-6 sm:p-10 flex flex-col justify-center">
                  <div className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-3">
                    {(featured.node as any).productType || "Original work"}
                  </div>
                  <h3 className="font-serif text-3xl sm:text-4xl leading-tight mb-4">
                    {featured.node.title}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed line-clamp-5 mb-6">
                    {featured.node.description}
                  </p>
                  <div className="flex items-center justify-between gap-4 border-t border-border/50 pt-6">
                    <div>
                      <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                        Price
                      </div>
                      <div className="font-serif text-2xl text-primary">
                        {formatPrice(
                          featured.node.priceRange.minVariantPrice.amount,
                          featured.node.priceRange.minVariantPrice.currencyCode,
                        )}
                      </div>
                    </div>
                    <Button
                      size="lg"
                      onClick={() => handleAdd(featured)}
                      disabled={!featured.node.variants.edges[0]?.node || adding}
                      className="bg-primary text-primary-foreground hover:bg-primary/90"
                    >
                      {adding ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>Acquire <ArrowUpRight className="ml-1 h-4 w-4" /></>
                      )}
                    </Button>
                  </div>
                </div>
              </article>
            )}

            {/* Grid */}
            {rest.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
                {rest.map((p) => {
                  const img = p.node.images.edges[0]?.node;
                  const price = p.node.priceRange.minVariantPrice;
                  const variant = p.node.variants.edges[0]?.node;
                  const type = (p.node as any).productType;
                  return (
                    <article
                      key={p.node.id}
                      className="group flex flex-col rounded-xl overflow-hidden border border-border/50 bg-card hover:border-primary/40 hover:shadow-[0_10px_40px_-15px_hsl(var(--primary)/0.3)] transition-all duration-500"
                    >
                      <div className="relative aspect-[4/5] bg-secondary/30 overflow-hidden">
                        {img ? (
                          <img
                            src={img.url}
                            alt={img.altText || p.node.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">
                            No image
                          </div>
                        )}
                        {type && (
                          <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-background/80 backdrop-blur text-[10px] uppercase tracking-wider text-muted-foreground border border-border/50">
                            {type}
                          </div>
                        )}
                      </div>
                      <div className="p-5 flex flex-col flex-1">
                        <h3 className="font-serif text-xl leading-snug mb-1.5">
                          {p.node.title}
                        </h3>
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-5 flex-1">
                          {p.node.description}
                        </p>
                        <div className="flex items-center justify-between gap-3 pt-4 border-t border-border/50">
                          <span className="font-serif text-lg text-primary">
                            {formatPrice(price.amount, price.currencyCode)}
                          </span>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleAdd(p)}
                            disabled={!variant || adding}
                            className="border-primary/40 hover:bg-primary hover:text-primary-foreground"
                          >
                            {adding ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              "Add to cart"
                            )}
                          </Button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* CTA: Sell with us */}
        <section className="mt-20 rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 via-card to-accent/10 p-8 sm:p-12 text-center">
          <div className="text-[10px] uppercase tracking-[0.3em] text-primary mb-3">
            For Artists
          </div>
          <h3 className="font-serif text-3xl sm:text-4xl mb-3">
            Show your work to serious collectors.
          </h3>
          <p className="text-muted-foreground max-w-xl mx-auto mb-6">
            Apply to join AGMS — we handle authentication, payments and
            shipping so you can stay in the studio.
          </p>
          <Link to="/create-profile">
            <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90">
              Apply to sell
              <ArrowUpRight className="ml-1 h-4 w-4" />
            </Button>
          </Link>
        </section>
      </main>

      <footer className="border-t border-border/40 py-8 mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
          <div>© {new Date().getFullYear()} AGMS · The Shop</div>
          <div className="uppercase tracking-[0.25em]">Curated · Authenticated · Shipped</div>
        </div>
      </footer>
    </div>
  );
};

export default Sell;

import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { resolveArtworkRequestUrl } from "@/lib/artworkRequestUrls";
import { Palette, Plus } from "lucide-react";

type Row = {
  id: string;
  title: string | null;
  category: string | null;
  description: string | null;
  budget: number | null;
  status: string;
  created_at: string;
  reference_image_urls: string[] | null;
  sketch_url: string | null;
};

type Resolved = Row & { _refs: string[]; _sketch: string | null };

const statusColor: Record<string, string> = {
  open: "bg-secondary text-secondary-foreground",
  accepted: "bg-primary/20 text-primary",
  in_progress: "bg-amber-500/20 text-amber-600",
  done: "bg-green-500/20 text-green-600",
  declined: "bg-destructive/20 text-destructive",
};

const MyArtworkRequests = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState<Resolved[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data, error } = await supabase
        .from("artwork_requests")
        .select("id,title,category,description,budget,status,created_at,reference_image_urls,sketch_url")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) {
        setLoading(false);
        return;
      }
      const resolved = await Promise.all(
        (data ?? []).map(async (r: any) => {
          const refs = await Promise.all((r.reference_image_urls ?? []).map((v: string) => resolveArtworkRequestUrl(v)));
          const sketch = await resolveArtworkRequestUrl(r.sketch_url);
          return { ...r, _refs: refs.filter(Boolean) as string[], _sketch: sketch };
        })
      );
      setRows(resolved);
      setLoading(false);
    })();
  }, [user]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-24 pb-16">
        <div className="container max-w-5xl">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="font-display text-3xl font-bold text-foreground">My Artwork Requests</h1>
              <p className="mt-1 text-muted-foreground">Track commissions you've submitted to our artists.</p>
            </div>
            <Button asChild className="bg-gradient-gold text-primary-foreground shadow-gold">
              <Link to="/request-artwork"><Plus className="mr-1 h-4 w-4" /> New Request</Link>
            </Button>
          </div>

          {loading ? (
            <p className="mt-10 text-muted-foreground">Loading...</p>
          ) : rows.length === 0 ? (
            <div className="mt-10 rounded-xl border border-dashed border-border bg-card p-12 text-center">
              <Palette className="mx-auto h-10 w-10 text-muted-foreground" />
              <p className="mt-3 text-muted-foreground">You haven't submitted any requests yet.</p>
              <Button asChild className="mt-4 bg-gradient-gold text-primary-foreground">
                <Link to="/request-artwork">Request an Artwork</Link>
              </Button>
            </div>
          ) : (
            <div className="mt-6 space-y-4">
              {rows.map((r) => (
                <div key={r.id} className="rounded-xl border border-border bg-card p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h2 className="font-display text-lg font-semibold text-foreground">{r.title || "Untitled"}</h2>
                      <p className="text-xs text-muted-foreground">
                        {r.category || "—"} · {new Date(r.created_at).toLocaleDateString()}
                        {r.budget != null && <> · GHS {Number(r.budget).toLocaleString()}</>}
                      </p>
                    </div>
                    <Badge className={`capitalize ${statusColor[r.status] || "bg-secondary"}`}>
                      {r.status.replace("_", " ")}
                    </Badge>
                  </div>
                  {r.description && <p className="mt-2 text-sm text-foreground/80">{r.description}</p>}

                  {(r._refs.length > 0 || r._sketch) && (
                    <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-6">
                      {r._sketch && (
                        <a href={r._sketch} target="_blank" rel="noreferrer" className="relative aspect-square overflow-hidden rounded-lg border border-primary/40">
                          <img src={r._sketch} alt="Sketch" className="h-full w-full object-cover" />
                          <span className="absolute bottom-0 left-0 right-0 bg-primary/80 py-0.5 text-center text-[10px] font-medium text-primary-foreground">Sketch</span>
                        </a>
                      )}
                      {r._refs.map((src, i) => (
                        <a key={i} href={src} target="_blank" rel="noreferrer" className="aspect-square overflow-hidden rounded-lg border border-border">
                          <img src={src} alt={`Ref ${i + 1}`} className="h-full w-full object-cover" />
                        </a>
                      ))}
                    </div>
                  )}
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

export default MyArtworkRequests;

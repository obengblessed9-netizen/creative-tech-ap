import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { resolveArtworkRequestUrl } from "@/lib/artworkRequestUrls";
import { toast } from "sonner";
import { Inbox } from "lucide-react";

type Row = {
  id: string;
  user_id: string;
  title: string | null;
  category: string | null;
  description: string | null;
  budget: number | null;
  status: string;
  created_at: string;
  reference_image_urls: string[] | null;
  sketch_url: string | null;
};

type Resolved = Row & { _refs: string[]; _sketch: string | null; _requester: string };

const STATUSES = ["open", "accepted", "in_progress", "done", "declined"] as const;

const statusColor: Record<string, string> = {
  open: "bg-secondary text-secondary-foreground",
  accepted: "bg-primary/20 text-primary",
  in_progress: "bg-amber-500/20 text-amber-600",
  done: "bg-green-500/20 text-green-600",
  declined: "bg-destructive/20 text-destructive",
};

const AdminArtworkRequests = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState<Resolved[]>([]);
  const [filter, setFilter] = useState<string>("all");
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: roles }, { data: artistRow }] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", user.id),
        supabase.from("artists").select("id").eq("user_id", user.id).maybeSingle(),
      ]);
      const isAdmin = (roles ?? []).some((r) => r.role === "admin");
      const isArtist = !!artistRow;
      setAllowed(isAdmin || isArtist);
    })();
  }, [user]);

  useEffect(() => {
    if (!user || !allowed) return;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("artwork_requests")
        .select("id,user_id,title,category,description,budget,status,created_at,reference_image_urls,sketch_url")
        .order("created_at", { ascending: false });
      if (error) {
        toast.error(error.message);
        setLoading(false);
        return;
      }
      const userIds = [...new Set((data ?? []).map((r: any) => r.user_id))];
      const { data: profiles } = await supabase.from("profiles").select("user_id,display_name").in("user_id", userIds);
      const nameMap = new Map((profiles ?? []).map((p: any) => [p.user_id, p.display_name || "User"]));

      const resolved = await Promise.all(
        (data ?? []).map(async (r: any) => {
          const refs = await Promise.all((r.reference_image_urls ?? []).map((v: string) => resolveArtworkRequestUrl(v)));
          const sketch = await resolveArtworkRequestUrl(r.sketch_url);
          return { ...r, _refs: refs.filter(Boolean) as string[], _sketch: sketch, _requester: nameMap.get(r.user_id) || "User" };
        })
      );
      setRows(resolved);
      setLoading(false);
    })();
  }, [user, allowed]);

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("artwork_requests").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, status } : r)));
    toast.success(`Marked as ${status.replace("_", " ")}`);
  };

  const filtered = filter === "all" ? rows : rows.filter((r) => r.status === filter);

  if (authLoading || allowed === null) {
    return (
      <div className="min-h-screen bg-background"><Navbar />
        <div className="container pt-24 text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!allowed) {
    return (
      <div className="min-h-screen bg-background"><Navbar />
        <main className="pt-24 pb-20">
          <div className="container max-w-lg text-center">
            <Inbox className="mx-auto h-14 w-14 text-muted-foreground" />
            <h1 className="mt-4 font-display text-2xl font-bold text-foreground">Artists only</h1>
            <p className="mt-2 text-muted-foreground">You need an approved artist profile or admin role to review commission requests.</p>
            <Button onClick={() => navigate("/profile")} className="mt-6 bg-gradient-gold text-primary-foreground">Apply as Artist</Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-24 pb-16">
        <div className="container max-w-6xl">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="font-display text-3xl font-bold text-foreground">Commission Requests</h1>
              <p className="mt-1 text-muted-foreground">Review incoming artwork requests and update their status.</p>
            </div>
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-48 bg-secondary border-border"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {STATUSES.map((s) => <SelectItem key={s} value={s} className="capitalize">{s.replace("_", " ")}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <p className="mt-10 text-muted-foreground">Loading...</p>
          ) : filtered.length === 0 ? (
            <p className="mt-10 text-muted-foreground">No requests match this filter.</p>
          ) : (
            <div className="mt-6 space-y-4">
              {filtered.map((r) => (
                <div key={r.id} className="rounded-xl border border-border bg-card p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h2 className="font-display text-lg font-semibold text-foreground">{r.title || "Untitled"}</h2>
                      <p className="text-xs text-muted-foreground">
                        From {r._requester} · {r.category || "—"} · {new Date(r.created_at).toLocaleDateString()}
                        {r.budget != null && <> · Budget GHS {Number(r.budget).toLocaleString()}</>}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={`capitalize ${statusColor[r.status] || "bg-secondary"}`}>{r.status.replace("_", " ")}</Badge>
                      <Select value={r.status} onValueChange={(v) => updateStatus(r.id, v)}>
                        <SelectTrigger className="w-40 bg-background border-border"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {STATUSES.map((s) => <SelectItem key={s} value={s} className="capitalize">{s.replace("_", " ")}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
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

export default AdminArtworkRequests;

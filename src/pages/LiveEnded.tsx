import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Search, Eye, Clock, History as HistoryIcon, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface EndedStream {
  id: string;
  host_id: string;
  title: string;
  description: string | null;
  status: string;
  viewer_count: number;
  started_at: string;
  ended_at: string | null;
}

const formatDuration = (start: string, end: string | null) => {
  if (!end) return "—";
  const ms = new Date(end).getTime() - new Date(start).getTime();
  if (ms <= 0) return "—";
  const mins = Math.floor(ms / 60000);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

const LiveEnded = () => {
  const navigate = useNavigate();
  const [streams, setStreams] = useState<EndedStream[]>([]);
  const [organizers, setOrganizers] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  const handleDeleteAllEnded = async () => {
    if (!window.confirm("Are you sure you want to delete all ended meetings? This cannot be undone.")) return;
    setDeleting(true);
    try {
      const { error } = await supabase.from("live_streams").delete().eq("status", "ended");
      if (error) throw error;
      setStreams([]);
      toast.success("All ended meetings have been deleted");
    } catch (e: any) {
      toast.error(e.message || "Failed to delete meetings");
    } finally {
      setDeleting(false);
    }
  };

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("live_streams")
        .select("*")
        .eq("status", "ended")
        .order("ended_at", { ascending: false, nullsFirst: false })
        .limit(200);
      const rows = (data as EndedStream[]) || [];
      setStreams(rows);
      const ids = Array.from(new Set(rows.map((r) => r.host_id)));
      if (ids.length) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("user_id, display_name")
          .in("user_id", ids);
        const map: Record<string, string> = {};
        (profs as { user_id: string; display_name: string | null }[] | null)?.forEach((p) => {
          map[p.user_id] = p.display_name || "Host";
        });
        setOrganizers(map);
      }
      setLoading(false);
    };
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return streams;
    return streams.filter((s) => {
      const org = (organizers[s.host_id] || "").toLowerCase();
      return s.title.toLowerCase().includes(q) || org.includes(q) || s.id.includes(q);
    });
  }, [streams, organizers, search]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-20 pb-16">
        <div className="container max-w-5xl">
          <div className="flex items-center justify-between mb-6">
            <div>
              <button
                onClick={() => navigate("/live")}
                className="inline-flex items-center text-xs text-muted-foreground hover:text-foreground mb-2"
              >
                <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Back to Live
              </button>
              <h1 className="font-display text-3xl md:text-4xl font-bold text-gradient-gold flex items-center gap-2">
                <HistoryIcon className="h-7 w-7 text-primary" /> Ended Sessions
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Browse past live broadcasts with summaries and ended times.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                onClick={handleDeleteAllEnded} 
                variant="destructive"
                disabled={deleting || streams.length === 0}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {deleting ? "Deleting..." : "Delete Meetings"}
              </Button>
              <Button onClick={() => navigate("/live?start=new")} className="bg-gradient-gold text-primary-foreground">
                Start New Live
              </Button>
            </div>
          </div>

          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by title, organizer, or meeting ID"
              className="pl-9 bg-secondary border-border"
            />
          </div>

          {loading ? (
            <Card className="p-8 text-center text-muted-foreground bg-secondary/30 border-border">
              Loading ended sessions…
            </Card>
          ) : filtered.length === 0 ? (
            <Card className="p-8 text-center text-muted-foreground bg-secondary/30 border-border">
              No ended sessions yet.
            </Card>
          ) : (
            <div className="grid gap-3">
              {filtered.map((s) => (
                <Card key={s.id} className="bg-card border-border p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-foreground truncate">{s.title}</p>
                        <Badge variant="secondary">Ended</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        by {organizers[s.host_id] || "Host"}
                      </p>
                      {s.description && (
                        <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{s.description}</p>
                      )}
                      <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          Ended {s.ended_at ? new Date(s.ended_at).toLocaleString() : "—"}
                        </span>
                        <span>Duration: {formatDuration(s.started_at, s.ended_at)}</span>
                        <span className="inline-flex items-center gap-1">
                          <Eye className="h-3.5 w-3.5" /> {s.viewer_count || 0} viewers
                        </span>
                        <span className="font-mono">{s.id.slice(0, 8)}…</span>
                      </div>
                    </div>
                    <Link to={`/live/${s.id}`}>
                      <Button size="sm" variant="outline">View summary</Button>
                    </Link>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default LiveEnded;

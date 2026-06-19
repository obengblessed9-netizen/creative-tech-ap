import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, LineChart, Line, PieChart, Pie, Cell, Legend } from "recharts";

interface Sale { id: string; amount: number; sale_date: string; status: string; payment_method: string; artwork_id: string | null; client_id: string | null; }
interface Artwork { id: string; title: string; artist_id: string | null; }
interface Artist { id: string; name: string; }
interface Client { id: string; name: string; total_spent: number; }

const COLORS = ["hsl(var(--primary))", "hsl(var(--accent))", "hsl(var(--secondary))", "hsl(var(--muted))", "#a78bfa", "#fb7185"];

const AnalyticsPanel = () => {
  const [sales, setSales] = useState<Sale[]>([]);
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [s, a, ar, c] = await Promise.all([
        supabase.from("sales").select("*").eq("status", "completed"),
        supabase.from("artworks").select("id,title,artist_id"),
        supabase.from("artists").select("id,name"),
        supabase.from("clients").select("id,name,total_spent").order("total_spent", { ascending: false }).limit(5),
      ]);
      setSales((s.data as Sale[]) ?? []);
      setArtworks((a.data as Artwork[]) ?? []);
      setArtists((ar.data as Artist[]) ?? []);
      setClients((c.data as Client[]) ?? []);
      setLoading(false);
    })();
  }, []);

  const monthly = useMemo(() => {
    const map: Record<string, number> = {};
    sales.forEach(s => {
      const d = new Date(s.sale_date);
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      map[k] = (map[k] ?? 0) + Number(s.amount);
    });
    return Object.entries(map).sort().map(([month, revenue]) => ({ month, revenue }));
  }, [sales]);

  const topArtists = useMemo(() => {
    const map: Record<string, number> = {};
    sales.forEach(s => {
      const aw = artworks.find(a => a.id === s.artwork_id);
      const aid = aw?.artist_id;
      if (!aid) return;
      map[aid] = (map[aid] ?? 0) + Number(s.amount);
    });
    return Object.entries(map).map(([id, revenue]) => ({
      name: artists.find(a => a.id === id)?.name ?? "Unknown",
      revenue,
    })).sort((a, b) => b.revenue - a.revenue).slice(0, 5);
  }, [sales, artworks, artists]);

  const byMethod = useMemo(() => {
    const map: Record<string, number> = {};
    sales.forEach(s => { map[s.payment_method] = (map[s.payment_method] ?? 0) + Number(s.amount); });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [sales]);

  if (loading) return <p className="text-muted-foreground text-sm">Loading analytics…</p>;

  if (sales.length === 0) {
    return <p className="text-muted-foreground text-sm">No completed sales yet — record a sale to see analytics.</p>;
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-border bg-card p-4">
        <h3 className="font-display text-foreground mb-3">Monthly Revenue (GH₵)</h3>
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={monthly}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" />
            <YAxis stroke="hsl(var(--muted-foreground))" />
            <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
            <Line type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="rounded-lg border border-border bg-card p-4">
          <h3 className="font-display text-foreground mb-3">Top Artists by Revenue</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={topArtists}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" />
              <YAxis stroke="hsl(var(--muted-foreground))" />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
              <Bar dataKey="revenue" fill="hsl(var(--primary))" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-lg border border-border bg-card p-4">
          <h3 className="font-display text-foreground mb-3">Revenue by Payment Method</h3>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={byMethod} dataKey="value" nameKey="name" outerRadius={80} label>
                {byMethod.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Legend />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card p-4">
        <h3 className="font-display text-foreground mb-3">Top Clients</h3>
        <div className="space-y-2">
          {clients.length === 0 && <p className="text-muted-foreground text-sm">No client data.</p>}
          {clients.map((c, i) => (
            <div key={c.id} className="flex items-center justify-between border-b border-border last:border-0 pb-2 last:pb-0">
              <span className="text-foreground">{i + 1}. {c.name}</span>
              <span className="font-semibold text-primary">GH₵ {Number(c.total_spent).toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPanel;

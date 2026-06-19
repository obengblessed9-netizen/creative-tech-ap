import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Search } from "lucide-react";

interface Row { id: string; title: string; price: number; available: boolean; availability_status: string; image_url: string | null; category: string | null; }

const STATUSES = ["available", "reserved", "sold"];

const InventoryPanel = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("artworks").select("id,title,price,available,availability_status,image_url,category").order("created_at", { ascending: false });
    setRows((data as Row[]) ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const setStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("artworks").update({ availability_status: status, available: status === "available" }).eq("id", id);
    if (error) return toast.error("Update failed");
    toast.success("Status updated");
    load();
  };

  const filtered = useMemo(() => rows.filter(r => r.title.toLowerCase().includes(q.toLowerCase()) || (r.category ?? "").toLowerCase().includes(q.toLowerCase())), [rows, q]);

  const summary = useMemo(() => ({
    total: rows.length,
    available: rows.filter(r => r.availability_status === "available").length,
    reserved: rows.filter(r => r.availability_status === "reserved").length,
    sold: rows.filter(r => r.availability_status === "sold").length,
    value: rows.filter(r => r.availability_status === "available").reduce((s, r) => s + Number(r.price || 0), 0),
  }), [rows]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: "Total", value: summary.total },
          { label: "Available", value: summary.available },
          { label: "Reserved", value: summary.reserved },
          { label: "Sold", value: summary.sold },
          { label: "Stock Value", value: `GH₵ ${summary.value.toLocaleString()}` },
        ].map((s) => (
          <div key={s.label} className="rounded-lg border border-border bg-card p-3">
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className="font-display text-xl font-semibold text-foreground">{s.value}</p>
          </div>
        ))}
      </div>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search artwork or category…" className="pl-9 bg-secondary border-border text-foreground" />
      </div>
      {loading ? <p className="text-muted-foreground text-sm">Loading…</p> : (
        <div className="space-y-2">
          {filtered.length === 0 && <p className="text-muted-foreground text-sm">No artworks found.</p>}
          {filtered.map((r) => (
            <div key={r.id} className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
              {r.image_url && <img src={r.image_url} alt={r.title} className="h-12 w-12 rounded object-cover" />}
              <div className="flex-1 min-w-0">
                <p className="text-foreground truncate">{r.title}</p>
                <p className="text-xs text-muted-foreground">GH₵ {Number(r.price).toLocaleString()} · {r.category ?? "—"}</p>
              </div>
              <Badge variant={r.availability_status === "sold" ? "destructive" : r.availability_status === "reserved" ? "secondary" : "default"}>{r.availability_status}</Badge>
              <div className="flex gap-1">
                {STATUSES.filter(s => s !== r.availability_status).map(s => (
                  <Button key={s} size="sm" variant="outline" onClick={() => setStatus(r.id, s)} className="border-border text-xs">{s}</Button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default InventoryPanel;

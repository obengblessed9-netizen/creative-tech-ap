import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

interface Sale {
  id: string; artwork_id: string | null; client_id: string | null;
  amount: number; payment_method: string; status: string; sale_date: string; notes: string | null;
}
interface Artwork { id: string; title: string; price: number; }
interface Client { id: string; name: string; total_spent: number; }

const METHODS = ["cash", "momo", "gcb", "card", "bank_transfer"];
const STATUSES = ["pending", "completed", "refunded"];

const SalesPanel = () => {
  const [rows, setRows] = useState<Sale[]>([]);
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ payment_method: "momo", status: "completed" });
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const [s, a, c] = await Promise.all([
      supabase.from("sales").select("*").order("sale_date", { ascending: false }),
      supabase.from("artworks").select("id,title,price").order("title"),
      supabase.from("clients").select("id,name,total_spent").order("name"),
    ]);
    setRows((s.data as Sale[]) ?? []);
    setArtworks((a.data as Artwork[]) ?? []);
    setClients((c.data as Client[]) ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!form.amount) return toast.error("Amount required");
    const { data: { user } } = await supabase.auth.getUser();
    const payload = {
      artwork_id: form.artwork_id || null,
      client_id: form.client_id || null,
      amount: parseFloat(form.amount),
      payment_method: form.payment_method,
      status: form.status,
      notes: form.notes || null,
      created_by: user?.id,
    };
    const { error } = await supabase.from("sales").insert(payload);
    if (error) return toast.error(error.message);

    // Update inventory + client total
    if (payload.artwork_id && payload.status === "completed") {
      await supabase.from("artworks").update({ availability_status: "sold", available: false }).eq("id", payload.artwork_id);
    }
    if (payload.client_id && payload.status === "completed") {
      const client = clients.find(c => c.id === payload.client_id);
      const newTotal = Number(client?.total_spent || 0) + payload.amount;
      await supabase.from("clients").update({ total_spent: newTotal }).eq("id", payload.client_id);
    }
    toast.success("Sale recorded");
    setOpen(false); setForm({ payment_method: "momo", status: "completed" }); load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this sale record?")) return;
    const { error } = await supabase.from("sales").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted"); load();
  };

  const total = rows.filter(r => r.status === "completed").reduce((s, r) => s + Number(r.amount), 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg border border-border bg-card p-3"><p className="text-xs text-muted-foreground">Total Sales</p><p className="font-display text-xl font-semibold text-primary">GH₵ {total.toLocaleString()}</p></div>
        <div className="rounded-lg border border-border bg-card p-3"><p className="text-xs text-muted-foreground">Transactions</p><p className="font-display text-xl font-semibold text-foreground">{rows.length}</p></div>
        <div className="rounded-lg border border-border bg-card p-3"><p className="text-xs text-muted-foreground">Avg Sale</p><p className="font-display text-xl font-semibold text-foreground">GH₵ {rows.length ? Math.round(total / rows.filter(r => r.status === "completed").length || 0).toLocaleString() : 0}</p></div>
      </div>
      <div className="flex justify-end">
        <Button onClick={() => setOpen(true)} className="bg-gradient-gold text-primary-foreground"><Plus className="mr-2 h-4 w-4" />Record Sale</Button>
      </div>
      {loading ? <p className="text-muted-foreground text-sm">Loading…</p> : (
        <div className="space-y-2">
          {rows.length === 0 && <p className="text-muted-foreground text-sm">No sales recorded yet.</p>}
          {rows.map(r => {
            const aw = artworks.find(a => a.id === r.artwork_id);
            const cl = clients.find(c => c.id === r.client_id);
            return (
              <div key={r.id} className="rounded-lg border border-border bg-card p-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-foreground truncate">{aw?.title ?? "Walk-in sale"}</p>
                  <p className="text-xs text-muted-foreground">{cl?.name ?? "—"} · {new Date(r.sale_date).toLocaleDateString()} · {r.payment_method}</p>
                  {r.notes && <p className="text-xs text-muted-foreground italic mt-1">{r.notes}</p>}
                </div>
                <Badge variant={r.status === "refunded" ? "destructive" : r.status === "pending" ? "secondary" : "default"}>{r.status}</Badge>
                <p className="font-semibold text-foreground">GH₵ {Number(r.amount).toLocaleString()}</p>
                <Button variant="ghost" size="icon" onClick={() => remove(r.id)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader><DialogTitle>Record Sale</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Artwork</Label>
              <select value={form.artwork_id ?? ""} onChange={(e) => { const a = artworks.find(x => x.id === e.target.value); setForm({ ...form, artwork_id: e.target.value, amount: a?.price ?? form.amount }); }} className="w-full rounded-md border border-border bg-secondary px-3 py-2 text-sm">
                <option value="">— Walk-in / Other —</option>
                {artworks.map(a => <option key={a.id} value={a.id}>{a.title} (GH₵ {a.price})</option>)}
              </select>
            </div>
            <div>
              <Label>Client</Label>
              <select value={form.client_id ?? ""} onChange={(e) => setForm({ ...form, client_id: e.target.value })} className="w-full rounded-md border border-border bg-secondary px-3 py-2 text-sm">
                <option value="">— Anonymous —</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Amount (GH₵) *</Label><Input type="number" value={form.amount ?? ""} onChange={(e) => setForm({ ...form, amount: e.target.value })} className="bg-secondary border-border" /></div>
              <div>
                <Label>Payment Method</Label>
                <select value={form.payment_method} onChange={(e) => setForm({ ...form, payment_method: e.target.value })} className="w-full rounded-md border border-border bg-secondary px-3 py-2 text-sm">
                  {METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
            </div>
            <div>
              <Label>Status</Label>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="w-full rounded-md border border-border bg-secondary px-3 py-2 text-sm">
                {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div><Label>Notes</Label><Textarea value={form.notes ?? ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="bg-secondary border-border" /></div>
            <Button onClick={save} className="w-full bg-gradient-gold text-primary-foreground">Save</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SalesPanel;

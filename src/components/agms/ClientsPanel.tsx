import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";

interface Client {
  id: string; name: string; email: string | null; phone: string | null;
  address: string | null; city: string | null; country: string | null;
  notes: string | null; tags: string[] | null; total_spent: number;
}

const ClientsPanel = () => {
  const [rows, setRows] = useState<Client[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [form, setForm] = useState<any>({});
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("clients").select("*").order("created_at", { ascending: false });
    setRows((data as Client[]) ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!form.name?.trim()) return toast.error("Name required");
    const { data: { user } } = await supabase.auth.getUser();
    const payload = { ...form, created_by: user?.id, tags: form.tags ? String(form.tags).split(",").map((t: string) => t.trim()).filter(Boolean) : [] };
    const { error } = editing
      ? await supabase.from("clients").update(payload).eq("id", editing.id)
      : await supabase.from("clients").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Saved");
    setOpen(false); setEditing(null); setForm({}); load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this client?")) return;
    const { error } = await supabase.from("clients").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted"); load();
  };

  const startEdit = (c: Client) => {
    setEditing(c);
    setForm({ ...c, tags: (c.tags ?? []).join(", ") });
    setOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">{rows.length} client{rows.length !== 1 && "s"}</p>
        <Button onClick={() => { setEditing(null); setForm({}); setOpen(true); }} className="bg-gradient-gold text-primary-foreground">
          <Plus className="mr-2 h-4 w-4" /> Add Client
        </Button>
      </div>
      {loading ? <p className="text-sm text-muted-foreground">Loading…</p> : (
        <div className="space-y-2">
          {rows.length === 0 && <p className="text-muted-foreground text-sm">No clients yet.</p>}
          {rows.map(c => (
            <div key={c.id} className="rounded-lg border border-border bg-card p-4 flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground">{c.name}</p>
                <p className="text-xs text-muted-foreground">{[c.email, c.phone].filter(Boolean).join(" · ")}</p>
                <p className="text-xs text-muted-foreground">{[c.city, c.country].filter(Boolean).join(", ")}</p>
                {c.notes && <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{c.notes}</p>}
                {(c.tags ?? []).length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {c.tags!.map(t => <span key={t} className="text-[10px] bg-secondary text-secondary-foreground rounded px-2 py-0.5">{t}</span>)}
                  </div>
                )}
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs text-muted-foreground">Spent</p>
                <p className="font-semibold text-primary">GH₵ {Number(c.total_spent || 0).toLocaleString()}</p>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" onClick={() => startEdit(c)}><Pencil className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" onClick={() => remove(c.id)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-card border-border max-w-lg">
          <DialogHeader><DialogTitle>{editing ? "Edit" : "New"} Client</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Name *</Label><Input value={form.name ?? ""} onChange={(e) => setForm({ ...form, name: e.target.value })} className="bg-secondary border-border" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Email</Label><Input type="email" value={form.email ?? ""} onChange={(e) => setForm({ ...form, email: e.target.value })} className="bg-secondary border-border" /></div>
              <div><Label>Phone</Label><Input value={form.phone ?? ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="bg-secondary border-border" /></div>
              <div><Label>City</Label><Input value={form.city ?? ""} onChange={(e) => setForm({ ...form, city: e.target.value })} className="bg-secondary border-border" /></div>
              <div><Label>Country</Label><Input value={form.country ?? ""} onChange={(e) => setForm({ ...form, country: e.target.value })} className="bg-secondary border-border" /></div>
            </div>
            <div><Label>Address</Label><Input value={form.address ?? ""} onChange={(e) => setForm({ ...form, address: e.target.value })} className="bg-secondary border-border" /></div>
            <div><Label>Tags (comma separated)</Label><Input value={form.tags ?? ""} onChange={(e) => setForm({ ...form, tags: e.target.value })} className="bg-secondary border-border" /></div>
            <div><Label>Notes</Label><Textarea value={form.notes ?? ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="bg-secondary border-border" /></div>
            <Button onClick={save} className="w-full bg-gradient-gold text-primary-foreground">Save</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ClientsPanel;

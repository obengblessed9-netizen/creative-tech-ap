import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Calendar, Download } from "lucide-react";

interface Event {
  id: string; title: string; description: string | null; location: string | null;
  starts_at: string; ends_at: string | null; capacity: number | null; status: string;
  cover_image_url: string | null; published: boolean;
}

const STATUSES = ["upcoming", "ongoing", "completed", "cancelled"];

const EventsPanel = () => {
  const [rows, setRows] = useState<Event[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Event | null>(null);
  const [form, setForm] = useState<any>({ status: "upcoming", published: false });
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("gallery_events").select("*").order("starts_at", { ascending: false });
    setRows((data as Event[]) ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!form.title?.trim() || !form.starts_at) return toast.error("Title & start date required");
    const { data: { user } } = await supabase.auth.getUser();
    const payload = {
      title: form.title,
      description: form.description || null,
      location: form.location || null,
      starts_at: new Date(form.starts_at).toISOString(),
      ends_at: form.ends_at ? new Date(form.ends_at).toISOString() : null,
      capacity: form.capacity ? parseInt(form.capacity) : null,
      status: form.status,
      cover_image_url: form.cover_image_url || null,
      published: !!form.published,
      created_by: user?.id,
    };
    const { error } = editing
      ? await supabase.from("gallery_events").update(payload).eq("id", editing.id)
      : await supabase.from("gallery_events").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Saved");
    setOpen(false); setEditing(null); setForm({ status: "upcoming", published: false }); load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this event?")) return;
    const { error } = await supabase.from("gallery_events").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted"); load();
  };

  const startEdit = (e: Event) => {
    setEditing(e);
    setForm({ ...e, starts_at: e.starts_at.slice(0, 16), ends_at: e.ends_at?.slice(0, 16) ?? "" });
    setOpen(true);
  };

  const exportReport = async () => {
    const { data: attendees } = await supabase.from("event_attendees").select("*");
    const csv = [
      ["Event", "Status", "Date", "Location", "Capacity", "Registered", "Published"].join(","),
      ...rows.map(e => {
        const count = (attendees ?? []).filter((a: any) => a.event_id === e.id).length;
        return [e.title, e.status, new Date(e.starts_at).toLocaleString(), e.location ?? "", e.capacity ?? "", count, e.published].map(v => `"${String(v).replace(/"/g, '""')}"`).join(",");
      }),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `events-report-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success("Report downloaded");
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">{rows.length} event{rows.length !== 1 && "s"}</p>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportReport}><Download className="mr-2 h-4 w-4" />Export Report</Button>
          <Button onClick={() => { setEditing(null); setForm({ status: "upcoming", published: false }); setOpen(true); }} className="bg-gradient-gold text-primary-foreground">
            <Plus className="mr-2 h-4 w-4" />New Event
          </Button>
        </div>
      </div>
      {loading ? <p className="text-sm text-muted-foreground">Loading…</p> : (
        <div className="space-y-2">
          {rows.length === 0 && <p className="text-muted-foreground text-sm">No events scheduled.</p>}
          {rows.map(e => (
            <div key={e.id} className="rounded-lg border border-border bg-card p-4 flex items-start gap-3">
              <Calendar className="h-5 w-5 text-primary mt-1 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium text-foreground">{e.title}</p>
                  <Badge variant={e.status === "completed" ? "secondary" : e.status === "cancelled" ? "destructive" : "default"}>{e.status}</Badge>
                  {e.published && <Badge variant="outline">Published</Badge>}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {new Date(e.starts_at).toLocaleString()} {e.ends_at && `→ ${new Date(e.ends_at).toLocaleString()}`}
                </p>
                {e.location && <p className="text-xs text-muted-foreground">📍 {e.location}</p>}
                {e.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{e.description}</p>}
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" onClick={() => startEdit(e)}><Pencil className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" onClick={() => remove(e.id)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-card border-border max-w-lg">
          <DialogHeader><DialogTitle>{editing ? "Edit" : "New"} Event</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Title *</Label><Input value={form.title ?? ""} onChange={(e) => setForm({ ...form, title: e.target.value })} className="bg-secondary border-border" /></div>
            <div><Label>Description</Label><Textarea value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} className="bg-secondary border-border" /></div>
            <div><Label>Location</Label><Input value={form.location ?? ""} onChange={(e) => setForm({ ...form, location: e.target.value })} className="bg-secondary border-border" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Starts *</Label><Input type="datetime-local" value={form.starts_at ?? ""} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} className="bg-secondary border-border" /></div>
              <div><Label>Ends</Label><Input type="datetime-local" value={form.ends_at ?? ""} onChange={(e) => setForm({ ...form, ends_at: e.target.value })} className="bg-secondary border-border" /></div>
              <div><Label>Capacity</Label><Input type="number" value={form.capacity ?? ""} onChange={(e) => setForm({ ...form, capacity: e.target.value })} className="bg-secondary border-border" /></div>
              <div>
                <Label>Status</Label>
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="w-full rounded-md border border-border bg-secondary px-3 py-2 text-sm">
                  {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div><Label>Cover image URL</Label><Input value={form.cover_image_url ?? ""} onChange={(e) => setForm({ ...form, cover_image_url: e.target.value })} className="bg-secondary border-border" /></div>
            <div className="flex items-center gap-3"><Switch checked={!!form.published} onCheckedChange={(v) => setForm({ ...form, published: v })} /><Label>Publish to public</Label></div>
            <Button onClick={save} className="w-full bg-gradient-gold text-primary-foreground">Save</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EventsPanel;

import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ShieldAlert, Search, Download } from "lucide-react";
import { toast } from "sonner";

interface AuditEntry {
  id: string;
  actor_id: string;
  action: string;
  target_type: string;
  target_id: string | null;
  metadata: any;
  created_at: string;
}

const AdminAuditLog = () => {
  const { isAdmin, loading } = useAuth();
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [actions, setActions] = useState<string[]>([]);
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [actors, setActors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!isAdmin) return;
    (async () => {
      const { data } = await supabase
        .from("admin_audit_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      const list = (data as AuditEntry[]) ?? [];
      setEntries(list);
      setActions(Array.from(new Set(list.map(e => e.action))));

      const ids = Array.from(new Set(list.map(e => e.actor_id)));
      if (ids.length) {
        const { data: profs } = await supabase
          .from("profiles").select("user_id, display_name").in("user_id", ids);
        const map: Record<string, string> = {};
        profs?.forEach(p => { map[p.user_id] = p.display_name || p.user_id; });
        setActors(map);
      }
    })();
  }, [isAdmin]);

  if (loading) return null;
  if (!isAdmin) return <Navigate to="/" replace />;

  const filtered = entries.filter(e => {
    if (actionFilter !== "all" && e.action !== actionFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        e.target_type.toLowerCase().includes(q) ||
        (e.target_id ?? "").toLowerCase().includes(q) ||
        JSON.stringify(e.metadata ?? {}).toLowerCase().includes(q) ||
        (actors[e.actor_id] ?? "").toLowerCase().includes(q)
      );
    }
    return true;
  });

  const exportCsv = () => {
    if (filtered.length === 0) {
      toast.error("Nothing to export");
      return;
    }
    const esc = (v: any) => {
      const s = v == null ? "" : typeof v === "object" ? JSON.stringify(v) : String(v);
      return `"${s.replace(/"/g, '""')}"`;
    };
    const header = ["timestamp", "actor_id", "actor_name", "action", "target_type", "target_id", "metadata"];
    const rows = filtered.map(e => [
      new Date(e.created_at).toISOString(),
      e.actor_id,
      actors[e.actor_id] ?? "",
      e.action,
      e.target_type,
      e.target_id ?? "",
      e.metadata ?? {},
    ].map(esc).join(","));
    const csv = [header.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${filtered.length} entries`);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-24 pb-20">
        <div className="container max-w-6xl">
          <div className="flex items-center gap-3 mb-2">
            <ShieldAlert className="h-7 w-7 text-primary" />
            <h1 className="font-display text-3xl font-bold text-foreground">Admin Audit Log</h1>
          </div>
          <p className="text-sm text-muted-foreground mb-6">
            Permanent record of administrative actions, including featured-artist deletions.
          </p>

          <div className="flex flex-col md:flex-row gap-3 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search actor, target, or metadata…"
                className="pl-9"
              />
            </div>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="md:w-64"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All actions</SelectItem>
                {actions.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button onClick={exportCsv} variant="outline">
              <Download className="mr-2 h-4 w-4" /> Export CSV ({filtered.length})
            </Button>
          </div>

          <div className="rounded-lg border border-border bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-secondary/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">When</th>
                  <th className="px-4 py-3">Actor</th>
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">Target</th>
                  <th className="px-4 py-3">Details</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">No audit entries found.</td></tr>
                ) : filtered.map(e => (
                  <tr key={e.id} className="border-t border-border align-top">
                    <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                      {new Date(e.created_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-foreground">
                      {actors[e.actor_id] ?? <span className="font-mono text-xs">{e.actor_id.slice(0, 8)}…</span>}
                    </td>
                    <td className="px-4 py-3"><Badge variant="outline">{e.action}</Badge></td>
                    <td className="px-4 py-3">
                      <div className="text-foreground">{e.target_type}</div>
                      {e.target_id && <div className="font-mono text-xs text-muted-foreground">{e.target_id.slice(0, 13)}…</div>}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground max-w-md">
                      {e.metadata && Object.keys(e.metadata).length > 0 ? (
                        <pre className="whitespace-pre-wrap break-words font-mono">{JSON.stringify(e.metadata, null, 0)}</pre>
                      ) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default AdminAuditLog;

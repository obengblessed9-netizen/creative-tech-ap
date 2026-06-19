import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Flag, Shield, EyeOff, UserX, Ban, History, Loader2 } from "lucide-react";

interface Report {
  id: string;
  stream_id: string;
  reporter_id: string;
  reported_user_id: string;
  reason: string | null;
  status: string;
  resolved_by: string | null;
  resolved_at: string | null;
  resolution_note: string | null;
  created_at: string;
}

interface AuditEvent {
  id: string;
  stream_id: string;
  actor_id: string;
  target_user_id: string | null;
  action: string;
  reason: string | null;
  metadata: any;
  created_at: string;
}

const STATUS_COLORS: Record<string, string> = {
  open: "bg-destructive/10 text-destructive",
  resolved: "bg-primary/10 text-primary",
  dismissed: "bg-secondary text-muted-foreground",
};

const ACTION_ICONS: Record<string, JSX.Element> = {
  report: <Flag className="h-3.5 w-3.5" />,
  block: <Ban className="h-3.5 w-3.5" />,
  unblock: <Shield className="h-3.5 w-3.5" />,
  hide_message: <EyeOff className="h-3.5 w-3.5" />,
  remove_viewer: <UserX className="h-3.5 w-3.5" />,
};

const AdminLiveModeration = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<"all" | "open" | "resolved" | "dismissed">("open");
  const [noteDraft, setNoteDraft] = useState<Record<string, string>>({});

  // Verify admin
  useEffect(() => {
    if (!user) { setIsAdmin(false); return; }
    supabase.rpc("has_role", { _user_id: user.id, _role: "admin" }).then(({ data }) => {
      setIsAdmin(!!data);
    });
  }, [user]);

  const loadAll = async () => {
    setLoading(true);
    const [{ data: rep }, { data: ev }] = await Promise.all([
      supabase.from("live_reports").select("*").order("created_at", { ascending: false }).limit(200),
      supabase.from("live_moderation_events").select("*").order("created_at", { ascending: false }).limit(200),
    ]);
    setReports((rep as Report[]) || []);
    setEvents((ev as AuditEvent[]) || []);
    setLoading(false);
  };

  useEffect(() => { if (isAdmin) loadAll(); }, [isAdmin]);

  const logEvent = async (
    streamId: string,
    targetUserId: string | null,
    action: string,
    reason: string | null,
    metadata: any = {}
  ) => {
    if (!user) return;
    await supabase.from("live_moderation_events").insert({
      stream_id: streamId,
      actor_id: user.id,
      target_user_id: targetUserId,
      action,
      reason,
      metadata,
    });
  };

  const resolveReport = async (r: Report, status: "resolved" | "dismissed") => {
    if (!user) return;
    const note = noteDraft[r.id] || null;
    const { error } = await supabase
      .from("live_reports")
      .update({ status, resolved_by: user.id, resolved_at: new Date().toISOString(), resolution_note: note })
      .eq("id", r.id);
    if (error) return toast.error(error.message);
    await logEvent(r.stream_id, r.reported_user_id, status === "resolved" ? "report_resolved" : "report_dismissed", note);
    toast.success(`Report ${status}`);
    loadAll();
  };

  const removeViewer = async (r: Report) => {
    const { error } = await supabase
      .from("live_stream_viewers")
      .update({ left_at: new Date().toISOString() })
      .eq("stream_id", r.stream_id)
      .eq("user_id", r.reported_user_id);
    if (error) return toast.error(error.message);
    await logEvent(r.stream_id, r.reported_user_id, "remove_viewer", noteDraft[r.id] || null);
    toast.success("Viewer removed from stream");
    loadAll();
  };

  const hideAllMessages = async (r: Report) => {
    if (!user) return;
    const { error } = await supabase
      .from("live_chat_messages")
      .update({ hidden: true, hidden_by: user.id, hidden_at: new Date().toISOString() })
      .eq("stream_id", r.stream_id)
      .eq("user_id", r.reported_user_id);
    if (error) return toast.error(error.message);
    await logEvent(r.stream_id, r.reported_user_id, "hide_message", noteDraft[r.id] || "Hid all messages from user");
    toast.success("Messages hidden");
    loadAll();
  };

  const filtered = useMemo(
    () => statusFilter === "all" ? reports : reports.filter((r) => r.status === statusFilter),
    [reports, statusFilter]
  );

  if (isAdmin === null) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="pt-24 container flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </main>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="pt-24 container">
          <Card className="p-8 bg-card border-border text-center">
            <Shield className="h-10 w-10 mx-auto text-muted-foreground" />
            <h1 className="mt-3 font-display text-2xl font-bold text-foreground">Admins only</h1>
            <p className="mt-1 text-sm text-muted-foreground">You need an admin role to access live moderation.</p>
            <Button onClick={() => navigate("/")} className="mt-4">Go home</Button>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-24 pb-20 container max-w-6xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground flex items-center gap-2">
              <Shield className="h-7 w-7 text-primary" /> Live Moderation
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Review reports, take action, and audit moderator activity.</p>
          </div>
          <Button variant="outline" onClick={loadAll} disabled={loading}>Refresh</Button>
        </div>

        <Tabs defaultValue="reports">
          <TabsList>
            <TabsTrigger value="reports"><Flag className="mr-2 h-4 w-4" />Reports ({reports.filter((r) => r.status === "open").length})</TabsTrigger>
            <TabsTrigger value="audit"><History className="mr-2 h-4 w-4" />Audit Log</TabsTrigger>
          </TabsList>

          <TabsContent value="reports" className="mt-4">
            <div className="flex gap-2 mb-4">
              {(["open", "resolved", "dismissed", "all"] as const).map((s) => (
                <Button
                  key={s}
                  size="sm"
                  variant={statusFilter === s ? "default" : "outline"}
                  onClick={() => setStatusFilter(s)}
                  className="capitalize"
                >
                  {s}
                </Button>
              ))}
            </div>

            {loading ? (
              <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
            ) : filtered.length === 0 ? (
              <Card className="p-8 bg-card border-border text-center text-muted-foreground">
                No reports {statusFilter !== "all" ? `in "${statusFilter}"` : ""} yet.
              </Card>
            ) : (
              <div className="space-y-3">
                {filtered.map((r) => (
                  <Card key={r.id} className="p-4 bg-card border-border">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge className={STATUS_COLORS[r.status] || ""}>{r.status}</Badge>
                          <span className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString()}</span>
                        </div>
                        <p className="mt-2 text-sm text-foreground">
                          <span className="text-muted-foreground">Reporter:</span>{" "}
                          <code className="text-xs">{r.reporter_id.slice(0, 8)}</code>
                          <span className="text-muted-foreground"> · Reported:</span>{" "}
                          <code className="text-xs">{r.reported_user_id.slice(0, 8)}</code>
                          <span className="text-muted-foreground"> · Stream:</span>{" "}
                          <button
                            className="text-xs text-primary hover:underline"
                            onClick={() => navigate(`/live/${r.stream_id}`)}
                          >
                            {r.stream_id.slice(0, 8)}
                          </button>
                        </p>
                        {r.reason && (
                          <p className="mt-2 text-sm text-foreground bg-secondary/40 rounded p-2 border border-border">
                            "{r.reason}"
                          </p>
                        )}
                        {r.resolution_note && (
                          <p className="mt-2 text-xs text-muted-foreground italic">Resolution: {r.resolution_note}</p>
                        )}
                      </div>
                    </div>

                    {r.status === "open" && (
                      <div className="mt-3 space-y-2">
                        <Textarea
                          placeholder="Resolution note (optional)"
                          value={noteDraft[r.id] || ""}
                          onChange={(e) => setNoteDraft((d) => ({ ...d, [r.id]: e.target.value }))}
                          rows={2}
                          className="bg-secondary border-border text-foreground text-sm"
                        />
                        <div className="flex flex-wrap gap-2">
                          <Button size="sm" variant="outline" onClick={() => hideAllMessages(r)}>
                            <EyeOff className="mr-1.5 h-3.5 w-3.5" /> Hide messages
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => removeViewer(r)}>
                            <UserX className="mr-1.5 h-3.5 w-3.5" /> Remove viewer
                          </Button>
                          <Button size="sm" onClick={() => resolveReport(r, "resolved")}>
                            Mark resolved
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => resolveReport(r, "dismissed")}>
                            Dismiss
                          </Button>
                        </div>
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="audit" className="mt-4">
            <Card className="bg-card border-border">
              <ScrollArea className="h-[600px]">
                <ul className="divide-y divide-border">
                  {events.length === 0 && (
                    <li className="p-6 text-center text-sm text-muted-foreground">No moderation activity yet.</li>
                  )}
                  {events.map((e) => (
                    <li key={e.id} className="p-3 flex items-start gap-3 text-sm">
                      <span className="mt-0.5 text-primary">{ACTION_ICONS[e.action] || <History className="h-3.5 w-3.5" />}</span>
                      <div className="min-w-0 flex-1">
                        <p className="text-foreground">
                          <span className="font-semibold capitalize">{e.action.replace(/_/g, " ")}</span>
                          <span className="text-muted-foreground"> · actor </span>
                          <code className="text-xs">{e.actor_id.slice(0, 8)}</code>
                          {e.target_user_id && (
                            <>
                              <span className="text-muted-foreground"> · target </span>
                              <code className="text-xs">{e.target_user_id.slice(0, 8)}</code>
                            </>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {new Date(e.created_at).toLocaleString()} ·{" "}
                          <button className="hover:text-foreground" onClick={() => navigate(`/live/${e.stream_id}`)}>
                            stream {e.stream_id.slice(0, 8)}
                          </button>
                        </p>
                        {e.reason && <p className="mt-1 text-xs text-foreground italic">"{e.reason}"</p>}
                      </div>
                    </li>
                  ))}
                </ul>
              </ScrollArea>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default AdminLiveModeration;

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { CheckCircle, XCircle, Eye, ShieldCheck, Clock, UserCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Verification {
  id: string;
  artist_id: string;
  user_id: string;
  selfie_url: string;
  id_card_url: string;
  ai_result: any;
  status: string;
  admin_notes: string | null;
  created_at: string;
  artist?: { name: string } | null;
}

interface Application {
  id: string;
  user_id: string;
  artist_name: string;
  specialty: string | null;
  bio: string | null;
  portfolio_url: string | null;
  status: string;
  admin_notes: string | null;
  created_at: string;
  profile?: { display_name: string | null } | null;
}

const AdminVerificationPanel = () => {
  const [verifications, setVerifications] = useState<Verification[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [subTab, setSubTab] = useState<"verifications" | "applications">("applications");
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [viewingSelfie, setViewingSelfie] = useState<string | null>(null);
  const [viewingId, setViewingId] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    const [verRes, appRes] = await Promise.all([
      supabase
        .from("artist_verifications")
        .select("*, artists(name)")
        .order("created_at", { ascending: false }),
      supabase
        .from("artist_applications")
        .select("*, profiles(display_name)")
        .order("created_at", { ascending: false }),
    ]);
    setVerifications(
      (verRes.data ?? []).map((v: any) => ({ ...v, artist: v.artists }))
    );
    setApplications(
      (appRes.data ?? []).map((a: any) => ({ ...a, profile: a.profiles }))
    );
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleVerificationAction = async (id: string, status: "approved" | "rejected", artistId: string) => {
    const { error } = await supabase
      .from("artist_verifications")
      .update({ status, admin_notes: notes[id] || null })
      .eq("id", id);
    if (error) { toast.error("Failed to update"); return; }

    if (status === "approved") {
      await supabase.from("artists").update({ verified: true, verification_status: "approved" }).eq("id", artistId);
    } else {
      await supabase.from("artists").update({ verification_status: "rejected" }).eq("id", artistId);
    }
    toast.success(`Verification ${status}`);
    fetchData();
  };

  const handleApplicationAction = async (app: Application, status: "approved" | "rejected") => {
    const { error } = await supabase
      .from("artist_applications")
      .update({ status, admin_notes: notes[app.id] || null })
      .eq("id", app.id);
    if (error) { toast.error("Failed to update"); return; }

    if (status === "approved") {
      // Create artist record linked to user
      const { error: artistErr } = await supabase.from("artists").insert({
        name: app.artist_name,
        specialty: app.specialty,
        bio: app.bio,
        user_id: app.user_id,
      });
      if (artistErr) { toast.error("Failed to create artist profile"); return; }
    }
    toast.success(`Application ${status}`);
    fetchData();
  };

  const getSignedUrl = async (path: string): Promise<string | null> => {
    const { data, error } = await supabase.storage
      .from("verification-docs")
      .createSignedUrl(path, 300);
    if (error) { toast.error("Could not load image"); return null; }
    return data.signedUrl;
  };

  const viewImage = async (path: string, type: "selfie" | "id") => {
    const url = await getSignedUrl(path);
    if (!url) return;
    if (type === "selfie") setViewingSelfie(url);
    else setViewingId(url);
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case "pending": return <Badge variant="outline" className="border-primary/30 text-primary"><Clock className="mr-1 h-3 w-3" />Pending</Badge>;
      case "approved": return <Badge className="bg-primary/20 text-primary"><CheckCircle className="mr-1 h-3 w-3" />Approved</Badge>;
      case "rejected": return <Badge variant="destructive"><XCircle className="mr-1 h-3 w-3" />Rejected</Badge>;
      default: return null;
    }
  };

  if (loading) return <p className="text-muted-foreground">Loading...</p>;

  return (
    <div className="space-y-6">
      {/* Sub-tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setSubTab("applications")}
          className={`flex items-center gap-2 rounded-sm px-3 py-1.5 text-xs font-medium transition-all ${
            subTab === "applications" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
          }`}
        >
          <UserCheck className="h-3 w-3" /> Applications ({applications.length})
        </button>
        <button
          onClick={() => setSubTab("verifications")}
          className={`flex items-center gap-2 rounded-sm px-3 py-1.5 text-xs font-medium transition-all ${
            subTab === "verifications" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
          }`}
        >
          <ShieldCheck className="h-3 w-3" /> ID Verifications ({verifications.length})
        </button>
      </div>

      {/* Applications */}
      {subTab === "applications" && (
        <div className="space-y-3">
          {applications.length === 0 && <p className="text-muted-foreground">No artist applications yet.</p>}
          {applications.map((app) => (
            <div key={app.id} className="rounded-lg border border-border bg-card p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-medium text-foreground">{app.artist_name}</h3>
                  <p className="text-sm text-muted-foreground">
                    Applied by: {app.profile?.display_name || "Unknown"} · {new Date(app.created_at).toLocaleDateString()}
                  </p>
                  {app.specialty && <p className="text-sm text-primary mt-1">{app.specialty}</p>}
                  {app.bio && <p className="text-sm text-muted-foreground mt-1">{app.bio}</p>}
                  {app.portfolio_url && (
                    <a href={app.portfolio_url} target="_blank" rel="noopener" className="text-sm text-primary underline mt-1 block">
                      Portfolio
                    </a>
                  )}
                </div>
                {statusBadge(app.status)}
              </div>
              {app.status === "pending" && (
                <div className="space-y-2 border-t border-border pt-3">
                  <Textarea
                    placeholder="Admin notes (optional)"
                    value={notes[app.id] || ""}
                    onChange={(e) => setNotes({ ...notes, [app.id]: e.target.value })}
                    className="bg-secondary border-border text-foreground text-sm"
                    rows={2}
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => handleApplicationAction(app, "approved")} className="bg-gradient-gold text-primary-foreground">
                      <CheckCircle className="mr-1 h-3 w-3" /> Approve
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => handleApplicationAction(app, "rejected")}>
                      <XCircle className="mr-1 h-3 w-3" /> Reject
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Verifications */}
      {subTab === "verifications" && (
        <div className="space-y-3">
          {verifications.length === 0 && <p className="text-muted-foreground">No verification requests yet.</p>}
          {verifications.map((v) => (
            <div key={v.id} className="rounded-lg border border-border bg-card p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-medium text-foreground">{v.artist?.name || "Unknown Artist"}</h3>
                  <p className="text-sm text-muted-foreground">
                    Submitted {new Date(v.created_at).toLocaleDateString()}
                  </p>
                  {v.ai_result && (
                    <div className="mt-2 text-xs text-muted-foreground space-y-1">
                      <p>AI Result: Faces match: {v.ai_result.faces_match ? "Yes" : "No"} · Valid ID: {v.ai_result.is_valid_id ? "Yes" : "No"} · Confidence: {v.ai_result.confidence}</p>
                      <p>{v.ai_result.reason}</p>
                    </div>
                  )}
                </div>
                {statusBadge(v.status)}
              </div>

              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => viewImage(v.selfie_url, "selfie")} className="border-border text-foreground">
                  <Eye className="mr-1 h-3 w-3" /> Selfie
                </Button>
                <Button size="sm" variant="outline" onClick={() => viewImage(v.id_card_url, "id")} className="border-border text-foreground">
                  <Eye className="mr-1 h-3 w-3" /> ID Card
                </Button>
              </div>

              {/* Image previews */}
              {(viewingSelfie || viewingId) && (
                <div className="flex gap-4 flex-wrap">
                  {viewingSelfie && <img src={viewingSelfie} alt="Selfie" className="h-32 rounded border border-border object-cover" />}
                  {viewingId && <img src={viewingId} alt="ID Card" className="h-32 rounded border border-border object-contain" />}
                </div>
              )}

              {v.status === "pending" && (
                <div className="space-y-2 border-t border-border pt-3">
                  <Textarea
                    placeholder="Admin notes (optional)"
                    value={notes[v.id] || ""}
                    onChange={(e) => setNotes({ ...notes, [v.id]: e.target.value })}
                    className="bg-secondary border-border text-foreground text-sm"
                    rows={2}
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => handleVerificationAction(v.id, "approved", v.artist_id)} className="bg-gradient-gold text-primary-foreground">
                      <CheckCircle className="mr-1 h-3 w-3" /> Approve
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => handleVerificationAction(v.id, "rejected", v.artist_id)}>
                      <XCircle className="mr-1 h-3 w-3" /> Reject
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminVerificationPanel;

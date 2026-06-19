import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Home as HomeIcon, Video, Plus, Calendar as CalendarIcon, MoreHorizontal,
  MessageSquare, Settings as SettingsIcon, ChevronDown, Users, Radio, Mic, Camera,
  Search, TrendingUp, Activity, Eye, PlayCircle, History,
} from "lucide-react";

// Generate a fresh 10-digit meeting code
const generateMeetingCode = () => {
  const n = Math.floor(1000000000 + Math.random() * 9000000000).toString();
  return `${n.slice(0, 3)} ${n.slice(3, 6)} ${n.slice(6, 10)}`;
};
import { toast } from "sonner";

interface LiveStreamRow {
  id: string;
  host_id: string;
  title: string;
  description: string | null;
  status: string;
  viewer_count: number;
  started_at: string;
  ended_at: string | null;
}

interface Organizer { user_id: string; display_name: string | null; }

const THEMES = [
  { id: "classic", label: "Classic", swatch: "bg-gradient-to-br from-foreground to-background" },
  { id: "bloom", label: "Bloom", swatch: "bg-blue-600" },
  { id: "agave", label: "Agave", swatch: "bg-emerald-700" },
  { id: "rose", label: "Rose", swatch: "bg-rose-500" },
];

const Live = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [streams, setStreams] = useState<LiveStreamRow[]>([]);
  const [organizers, setOrganizers] = useState<Record<string, string>>({});
  const [now, setNow] = useState<Date>(new Date());

  // Filters & search
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("recent");

  // New meeting dialog
  const [newOpen, setNewOpen] = useState(false);
  const [usePMI, setUsePMI] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);
  // Auto-generated meeting code for the next new meeting
  const [meetingCode, setMeetingCode] = useState<string>(generateMeetingCode());

  // Join dialog
  const [joinOpen, setJoinOpen] = useState(false);
  const [joinCode, setJoinCode] = useState("");

  // Schedule dialog
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [schedTitle, setSchedTitle] = useState("");
  const [schedTime, setSchedTime] = useState("");

  // Settings
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [theme, setTheme] = useState("classic");
  const [autoCall, setAutoCall] = useState(false);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [chatSounds, setChatSounds] = useState(true);

  // Personal Meeting ID derived from user id (stable)
  const pmi = useMemo(() => {
    const seed = (user?.id || "agms").replace(/\D/g, "").padEnd(10, "9");
    return `${seed.slice(0, 3)} ${seed.slice(3, 6)} ${seed.slice(6, 10)}`;
  }, [user]);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  // Auto-open New Meeting dialog when redirected with ?start=new (e.g. after ending a stream)
  useEffect(() => {
    if (searchParams.get("start") === "new") {
      setMeetingCode(generateMeetingCode());
      setTitle("");
      setDescription("");
      setUsePMI(false);
      setNewOpen(true);
      searchParams.delete("start");
      setSearchParams(searchParams, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const fetchStreams = async () => {
    const { data } = await supabase
      .from("live_streams")
      .select("*")
      .order("started_at", { ascending: false })
      .limit(100);
    const rows = (data as LiveStreamRow[]) || [];
    setStreams(rows);

    const ids = Array.from(new Set(rows.map((r) => r.host_id)));
    if (ids.length) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("user_id, display_name")
        .in("user_id", ids);
      const map: Record<string, string> = {};
      ((profs as Organizer[]) || []).forEach((p) => {
        map[p.user_id] = p.display_name || "Host";
      });
      setOrganizers(map);
    }
  };

  useEffect(() => {
    fetchStreams();
    const channel = supabase
      .channel("live-hub-list")
      .on("postgres_changes", { event: "*", schema: "public", table: "live_streams" }, fetchStreams)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  // Filtered + sorted streams
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = streams.filter((s) => {
      if (statusFilter !== "all" && s.status !== statusFilter) return false;
      if (!q) return true;
      const org = (organizers[s.host_id] || "").toLowerCase();
      return s.title.toLowerCase().includes(q) || org.includes(q) || s.id.includes(q);
    });
    list = [...list].sort((a, b) => {
      if (sortBy === "viewers") return (b.viewer_count || 0) - (a.viewer_count || 0);
      if (sortBy === "scheduled") return new Date(a.started_at).getTime() - new Date(b.started_at).getTime();
      return new Date(b.started_at).getTime() - new Date(a.started_at).getTime();
    });
    return list;
  }, [streams, organizers, search, statusFilter, sortBy]);

  // Analytics
  const analytics = useMemo(() => {
    const total = streams.reduce((s, r) => s + (r.viewer_count || 0), 0);
    const peak = streams.reduce((m, r) => Math.max(m, r.viewer_count || 0), 0);
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    const recent = streams.filter((r) => new Date(r.started_at).getTime() > cutoff).length;
    const liveNow = streams.filter((r) => r.status === "live").length;
    return { total, peak, recent, liveNow };
  }, [streams]);

  const startMeeting = async () => {
    if (!user) return navigate("/auth");
    if (!title.trim()) return toast.error("Please add a meeting title");
    setCreating(true);
    const { data, error } = await supabase
      .from("live_streams")
      .insert({
        host_id: user.id,
        title: usePMI ? `${title} · PMI ${pmi}` : `${title} · MID ${meetingCode}`,
        description,
        status: "live",
      })
      .select()
      .single();
    setCreating(false);
    if (error) return toast.error(error.message);
    setNewOpen(false);
    // Generate next code for subsequent new meetings
    setMeetingCode(generateMeetingCode());
    navigate(`/live/${data.id}`);
  };

  const joinMeeting = async () => {
    const code = joinCode.trim();
    if (!code) return toast.error("Enter a meeting ID or link");

    // Full UUID or link with UUID
    const uuidMatch = code.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
    if (uuidMatch) {
      setJoinOpen(false);
      return navigate(`/live/${uuidMatch[0]}`);
    }

    // Otherwise treat as PMI / MID / numeric code → look up host's live stream
    const digits = code.replace(/\D/g, "");
    if (digits.length >= 6) {
      const formatted = `${digits.slice(0,3)} ${digits.slice(3,6)} ${digits.slice(6,10)}`;
      const { data } = await supabase
        .from("live_streams")
        .select("id, title, status")
        .or(`title.ilike.%PMI ${formatted}%,title.ilike.%MID ${formatted}%`)
        .eq("status", "live")
        .order("started_at", { ascending: false })
        .limit(1);
      if (data && data.length) {
        setJoinOpen(false);
        return navigate(`/live/${data[0].id}`);
      }
    }

    // Fallback: title search
    const { data: byTitle } = await supabase
      .from("live_streams")
      .select("id")
      .ilike("title", `%${code}%`)
      .eq("status", "live")
      .limit(1);
    if (byTitle && byTitle.length) {
      setJoinOpen(false);
      return navigate(`/live/${byTitle[0].id}`);
    }
    toast.error("No live meeting found for that ID");
  };

  const quickJoin = (s: LiveStreamRow) => {
    if (!user) return navigate("/auth");
    navigate(`/live/${s.id}`);
  };

  const scheduleMeeting = () => {
    if (!schedTitle.trim() || !schedTime) return toast.error("Title and time required");
    toast.success(`Scheduled "${schedTitle}" for ${new Date(schedTime).toLocaleString()}`);
    setSchedTitle(""); setSchedTime(""); setScheduleOpen(false);
  };

  const time = now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  const date = now.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-16">
        <div className="container max-w-7xl py-6">
          {/* Workplace shell */}
          <div className="min-h-[calc(100vh-160px)]">
            {/* Main panel */}
            <section className="rounded-xl border border-border bg-card/40 backdrop-blur p-6 md:p-8 space-y-8">
              <div className="text-center">
                <h1 className="font-display text-5xl md:text-6xl font-bold text-gradient-gold tracking-tight">{time}</h1>
                <p className="mt-1 text-sm text-muted-foreground">{date}</p>
                {user && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Your Personal Meeting ID: <span className="font-mono text-foreground">{pmi}</span>
                  </p>
                )}
              </div>

              {/* Action tiles */}
              <div className="grid grid-cols-3 gap-6 max-w-2xl mx-auto">
                <DropdownMenu>
                  <div className="flex flex-col items-center gap-2">
                    <DropdownMenuTrigger asChild>
                      <button className="group flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-destructive to-orange-500 text-destructive-foreground shadow-lg hover:scale-105 transition-transform">
                        <Video className="h-8 w-8" strokeWidth={2.5} />
                      </button>
                    </DropdownMenuTrigger>
                    <div className="flex items-center gap-1 text-sm text-foreground">
                      New meeting
                      <DropdownMenuTrigger asChild>
                        <button aria-label="New meeting options"><ChevronDown className="h-4 w-4 text-muted-foreground" /></button>
                      </DropdownMenuTrigger>
                    </div>
                  </div>
                  <DropdownMenuContent align="center" className="w-72 bg-popover border-border">
                    <DropdownMenuLabel className="text-xs text-muted-foreground">New meeting options</DropdownMenuLabel>
                    <DropdownMenuItem onClick={(e) => e.preventDefault()} className="flex items-center gap-2">
                      <Checkbox id="pmi" checked={usePMI} onCheckedChange={(v) => setUsePMI(!!v)} />
                      <label htmlFor="pmi" className="text-sm cursor-pointer">Use my Personal Meeting ID (PMI)</label>
                    </DropdownMenuItem>
                    <div className="px-2 py-1 text-sm text-foreground">{pmi}</div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setNewOpen(true)}>
                      <Plus className="mr-2 h-4 w-4" /> Start a new meeting
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <div className="flex flex-col items-center gap-2">
                  <button
                    onClick={() => setJoinOpen(true)}
                    className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-yellow-500 text-primary-foreground shadow-lg hover:scale-105 transition-transform"
                  >
                    <Plus className="h-8 w-8" strokeWidth={2.5} />
                  </button>
                  <span className="text-sm text-foreground">Join</span>
                </div>

                <div className="flex flex-col items-center gap-2">
                  <button
                    onClick={() => setScheduleOpen(true)}
                    className="relative flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg hover:scale-105 transition-transform"
                  >
                    <CalendarIcon className="h-8 w-8" strokeWidth={2.5} />
                    <span className="absolute text-[10px] font-bold mt-1.5">{now.getDate()}</span>
                  </button>
                  <span className="text-sm text-foreground">Schedule</span>
                </div>
              </div>

              {/* Analytics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <AnalyticsCard icon={<Users className="h-4 w-4" />} label="Total Viewers" value={analytics.total} accent="text-primary" />
                <AnalyticsCard icon={<TrendingUp className="h-4 w-4" />} label="Peak Viewers" value={analytics.peak} accent="text-emerald-500" />
                <AnalyticsCard icon={<Activity className="h-4 w-4" />} label="Recent (24h)" value={analytics.recent} accent="text-blue-500" />
                <AnalyticsCard icon={<Radio className="h-4 w-4" />} label="Live Now" value={analytics.liveNow} accent="text-destructive" />
              </div>

              {/* Search + Filters */}
              <div className="flex flex-col md:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by title, organizer, or meeting ID"
                    className="pl-9 bg-secondary border-border"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="md:w-44 bg-secondary border-border"><SelectValue placeholder="Status" /></SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    <SelectItem value="all">All statuses</SelectItem>
                    <SelectItem value="live">Live</SelectItem>
                    <SelectItem value="ended">Ended</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="md:w-48 bg-secondary border-border"><SelectValue placeholder="Sort by" /></SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    <SelectItem value="recent">Most recent</SelectItem>
                    <SelectItem value="viewers">Top viewers</SelectItem>
                    <SelectItem value="scheduled">Scheduled time</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Meetings list */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-display text-xl text-foreground">Meetings</h2>
                  <span className="text-xs text-muted-foreground">{filtered.length} result{filtered.length === 1 ? "" : "s"}</span>
                </div>
                {filtered.length === 0 ? (
                  <Card className="bg-secondary/30 border-border p-8 text-center text-sm text-muted-foreground">
                    No meetings match your filters.
                  </Card>
                ) : (
                  <div className="grid gap-3 md:grid-cols-2">
                    {filtered.map((s) => (
                      <Card key={s.id} className="bg-card border-border p-4 flex flex-col gap-3 hover:border-primary/40 transition-colors">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-semibold text-foreground truncate">{s.title}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              by {organizers[s.host_id] || "Host"} · {new Date(s.started_at).toLocaleString()}
                            </p>
                          </div>
                          <Badge variant={s.status === "live" ? "destructive" : "secondary"} className="shrink-0">
                            {s.status === "live" ? "● LIVE" : s.status}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="inline-flex items-center gap-1"><Eye className="h-3.5 w-3.5" />{s.viewer_count || 0}</span>
                          <span className="font-mono truncate">{s.id.slice(0, 8)}…</span>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => quickJoin(s)}
                            disabled={s.status !== "live"}
                            className="flex-1 bg-gradient-gold text-primary-foreground"
                          >
                            <PlayCircle className="h-4 w-4" /> Quick Join
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              navigator.clipboard.writeText(`${window.location.origin}/live/${s.id}`);
                              toast.success("Meeting link copied");
                            }}
                          >
                            Copy link
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>
      </main>
      <Footer />

      {/* Floating More menu (merged sidebar) */}
      <div className="fixed bottom-6 right-6 z-50">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="icon" className="h-14 w-14 rounded-full bg-gradient-gold text-primary-foreground shadow-lg hover:opacity-90">
              <MoreHorizontal className="h-6 w-6" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side="top" className="w-48 bg-card border-border">
            <DropdownMenuLabel>Menu</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate("/live")}>
              <HomeIcon className="mr-2 h-4 w-4" /> Home
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => fetchStreams()}>
              <Video className="mr-2 h-4 w-4" /> Meetings
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate("/live/ended")}>
              <History className="mr-2 h-4 w-4" /> Ended
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate("/messages")}>
              <MessageSquare className="mr-2 h-4 w-4" /> Chat
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setSettingsOpen(true)}>
              <SettingsIcon className="mr-2 h-4 w-4" /> Settings
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>


      {/* New Meeting Dialog */}
      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-display">Start a new meeting</DialogTitle>
            <DialogDescription>Configure your live broadcast and go on air.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs uppercase tracking-wider text-muted-foreground">Title</label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Studio session" className="mt-1 bg-secondary border-border" />
            </div>
            <div>
              <label className="text-xs uppercase tracking-wider text-muted-foreground">Description</label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="mt-1 bg-secondary border-border resize-none" />
            </div>
            <div className="rounded-md border border-border bg-secondary/40 p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-wider text-muted-foreground">
                  {usePMI ? "Personal Meeting ID" : "Auto-generated Meeting ID"}
                </span>
                {!usePMI && (
                  <button
                    type="button"
                    onClick={() => setMeetingCode(generateMeetingCode())}
                    className="text-xs text-primary hover:underline"
                  >
                    Regenerate
                  </button>
                )}
              </div>
              <p className="mt-1 font-mono text-lg text-foreground">{usePMI ? pmi : meetingCode}</p>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={usePMI} onCheckedChange={(v) => setUsePMI(!!v)} />
              Use my Personal Meeting ID instead
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewOpen(false)}>Cancel</Button>
            <Button disabled={creating} onClick={startMeeting} className="bg-gradient-gold text-primary-foreground">
              {creating ? "Starting…" : "Start Meeting"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Join Dialog */}
      <Dialog open={joinOpen} onOpenChange={setJoinOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-display">Join a meeting</DialogTitle>
            <DialogDescription>
              Enter the host's Personal Meeting ID, a meeting link, or paste a meeting ID.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value)}
            placeholder="e.g. 123 456 7890 or meeting link"
            className="bg-secondary border-border"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setJoinOpen(false)}>Cancel</Button>
            <Button onClick={joinMeeting} className="bg-gradient-gold text-primary-foreground">Join</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Schedule Dialog */}
      <Dialog open={scheduleOpen} onOpenChange={setScheduleOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-display">Schedule a meeting</DialogTitle>
            <DialogDescription>Pick a title and date/time. We'll remind you.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input value={schedTitle} onChange={(e) => setSchedTitle(e.target.value)} placeholder="Title" className="bg-secondary border-border" />
            <Input type="datetime-local" value={schedTime} onChange={(e) => setSchedTime(e.target.value)} className="bg-secondary border-border" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setScheduleOpen(false)}>Cancel</Button>
            <Button onClick={scheduleMeeting} className="bg-gradient-gold text-primary-foreground">Schedule</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Settings Dialog */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="bg-card border-border max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              <SettingsIcon className="h-5 w-5 text-primary" /> Settings
            </DialogTitle>
          </DialogHeader>
          <Tabs defaultValue="general" className="w-full">
            <TabsList className="grid w-full grid-cols-4 bg-secondary">
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="audio"><Mic className="mr-1 h-3.5 w-3.5" />Audio</TabsTrigger>
              <TabsTrigger value="video"><Camera className="mr-1 h-3.5 w-3.5" />Video</TabsTrigger>
              <TabsTrigger value="chat"><MessageSquare className="mr-1 h-3.5 w-3.5" />Chat</TabsTrigger>
            </TabsList>

            <TabsContent value="general" className="space-y-6 pt-4">
              <div>
                <p className="text-sm font-medium text-foreground">Theme</p>
                <p className="text-xs text-muted-foreground">Only applied when the system is using light mode.</p>
                <div className="mt-3 flex gap-4">
                  {THEMES.map((t) => (
                    <button key={t.id} onClick={() => setTheme(t.id)}
                      className={`flex flex-col items-center gap-1 ${theme === t.id ? "" : "opacity-70"}`}>
                      <span className={`h-12 w-12 rounded-full border-2 ${theme === t.id ? "border-primary" : "border-border"} ${t.swatch}`} />
                      <span className="text-xs text-foreground">{t.label}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="border-t border-border pt-4">
                <p className="text-sm font-medium text-foreground">Auto-call</p>
                <label className="mt-2 flex items-center gap-2 text-sm">
                  <Checkbox checked={autoCall} onCheckedChange={(v) => setAutoCall(!!v)} />
                  Automatically receive a call when a scheduled meeting starts
                </label>
              </div>
            </TabsContent>

            <TabsContent value="audio" className="space-y-3 pt-4">
              <Row label="Microphone on join" checked={micOn} onChange={setMicOn} />
              <Row label="Test speaker on entry" checked={true} onChange={() => {}} />
            </TabsContent>

            <TabsContent value="video" className="space-y-3 pt-4">
              <Row label="Camera on join" checked={camOn} onChange={setCamOn} />
              <Row label="Mirror my video" checked={true} onChange={() => {}} />
            </TabsContent>

            <TabsContent value="chat" className="space-y-3 pt-4">
              <Row label="Chat sound notifications" checked={chatSounds} onChange={setChatSounds} />
            </TabsContent>
          </Tabs>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSettingsOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const SideItem = ({
  icon, label, active, onClick,
}: { icon: React.ReactNode; label: string; active?: boolean; onClick?: () => void }) => (
  <button onClick={onClick}
    className={`flex w-full flex-col items-center gap-1 rounded-lg p-2 text-[11px] transition-colors ${
      active ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-secondary hover:text-foreground"
    }`}>
    {icon}
    <span>{label}</span>
  </button>
);

const Row = ({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) => (
  <div className="flex items-center justify-between rounded-md border border-border bg-secondary/40 px-3 py-2">
    <span className="text-sm text-foreground">{label}</span>
    <Switch checked={checked} onCheckedChange={onChange} />
  </div>
);

const AnalyticsCard = ({
  icon, label, value, accent,
}: { icon: React.ReactNode; label: string; value: number; accent: string }) => (
  <Card className="bg-card border-border p-4">
    <div className={`flex items-center gap-2 text-xs ${accent}`}>
      {icon}<span className="uppercase tracking-wider">{label}</span>
    </div>
    <p className="mt-2 font-display text-2xl font-bold text-foreground">{value.toLocaleString()}</p>
  </Card>
);

export default Live;

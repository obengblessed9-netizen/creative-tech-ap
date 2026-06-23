import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ArrowRight,
  Palette,
  Upload,
  CheckCircle2,
  Sparkles,
  Search,
  Pencil,
  Dumbbell,
  FolderOpen,
  MessageCircle,
  Fingerprint,
  Megaphone,
  Users,
  Briefcase,
  GraduationCap,
  Play,
  Bookmark,
  BookmarkCheck,
  ExternalLink,
  X,
} from "lucide-react";

const platformSteps = [
  {
    icon: Palette,
    title: "Create Your Artist Profile",
    desc: "Set up a profile that introduces who you are, your style, and your story.",
  },
  {
    icon: Upload,
    title: "Submit Your Artworks",
    desc: "Upload high-quality photos of your work with titles, descriptions, and pricing.",
  },
  {
    icon: CheckCircle2,
    title: "Get Verified",
    desc: "Complete identity verification so collectors can trust and purchase with confidence.",
  },
  {
    icon: Sparkles,
    title: "Sell & Grow",
    desc: "Get discovered by collectors, accept secure payments, and build your audience.",
  },
];

type Topic = "basics" | "practice" | "portfolio" | "feedback" | "style" | "business" | "learning";

interface ArtistStep {
  number: number;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  desc: string;
  topics: Topic[];
  videoId?: string;
  videoTitle?: string;
  source?: string;
  /** Fallback clickable link if no embed is available */
  watchUrl?: string;
}

const artistSteps: ArtistStep[] = [
  {
    number: 1,
    icon: Search,
    title: "Discover Your Talent and Interest",
    desc: "A beginner-friendly introduction to drawing fundamentals and artistic growth. Explore different mediums and find what excites you most.",
    topics: ["basics"],
    videoId: "2szSyXx8cZQ",
    videoTitle: "Intro to Drawing Basics",
    source: "Proko",
  },
  {
    number: 2,
    icon: Pencil,
    title: "Learn the Basics",
    desc: "Covers drawing materials, sketching techniques, and shading fundamentals. Building a strong foundation is essential for every artist.",
    topics: ["basics"],
    videoId: "ewMksAbgdBI",
    videoTitle: "Learn To Draw #01 – Sketching Basics + Materials",
    source: "SchaeferArt",
  },
  {
    number: 3,
    icon: Dumbbell,
    title: "Practice Consistently",
    desc: "Drawing experts recommend regular practice with shapes, perspective, and shading to build skill over time. Set aside time daily to draw, even if it's just for 15 minutes. Consistency beats intensity.",
    topics: ["practice"],
    videoId: "nGgPwChc9Lo",
    videoTitle: "How To Practice Drawing Effectively",
    source: "YouTube",
  },
  {
    number: 4,
    icon: FolderOpen,
    title: "Build a Portfolio",
    desc: "Many artists document and share their work on platforms such as Instagram and YouTube to create a portfolio and attract audiences. Curate your best pieces and present them professionally.",
    topics: ["portfolio"],
    videoId: "Jl-gcqSzyWA",
    videoTitle: "How To Build An Art Portfolio",
    source: "YouTube",
  },
  {
    number: 5,
    icon: MessageCircle,
    title: "Get Feedback",
    desc: "Join art communities and share your work for critique. Feedback and comparing your current work only to your previous work helps steady improvement. Be open to constructive criticism.",
    topics: ["feedback"],
    videoId: "UrV6WPOasOo",
    videoTitle: "How To Get & Use Art Critique",
    source: "YouTube",
  },
  {
    number: 6,
    icon: Fingerprint,
    title: "Develop Your Own Style",
    desc: "Your artistic style develops from your unique perspective and experiences. This video provides practical methods for discovering and refining your personal style. Don't copy — be inspired and make it yours.",
    topics: ["style"],
    videoId: "hM_Mme3yvss",
    videoTitle: "How To Find Your Art Style (4 EASY WAYS)",
    source: "Aka",
  },
  {
    number: 7,
    icon: Megaphone,
    title: "Promote Your Work",
    desc: "Artists who consistently share artwork online can grow audiences and create professional opportunities. Use social media, art platforms, and your own website to reach collectors and fans.",
    topics: ["business"],
    videoId: "wXVkMtKl9DA",
    videoTitle: "How To Promote Your Art Online",
    source: "YouTube",
  },
  {
    number: 8,
    icon: Users,
    title: "Network with Other Artists",
    desc: "Participate in online art communities, exhibitions, and artist groups. Collaboration with other creators helps you improve and gain visibility. Surround yourself with people who inspire you.",
    topics: ["business"],
    videoId: "A2xVIR3uvZY",
    videoTitle: "How Artists Network & Build Community",
    source: "YouTube",
  },
  {
    number: 9,
    icon: Briefcase,
    title: "Learn the Business Side",
    desc: "Study how professional artists market themselves, price their work, and build an audience through social media and commissions. Art is a craft; selling it is a skill.",
    topics: ["business"],
    videoTitle: "The Business of Being an Artist",
    source: "YouTube",
    watchUrl: "https://www.youtube.com/results?search_query=business+of+being+an+artist+pricing+marketing",
  },
  {
    number: 10,
    icon: GraduationCap,
    title: "Never Stop Learning",
    desc: "Experienced artists consistently emphasize that improvement comes from ongoing practice, experimentation, and learning from others. Take courses, attend workshops, and always stay curious.",
    topics: ["learning"],
    videoTitle: "Lifelong Learning for Artists",
    source: "YouTube",
    watchUrl: "https://www.youtube.com/results?search_query=lifelong+learning+for+artists+improvement",
  },
];

const TOPIC_FILTERS: { id: "all" | Topic; label: string }[] = [
  { id: "all", label: "All" },
  { id: "basics", label: "Basics" },
  { id: "practice", label: "Practice" },
  { id: "portfolio", label: "Portfolio" },
  { id: "feedback", label: "Feedback" },
  { id: "style", label: "Style" },
  { id: "business", label: "Business" },
  { id: "learning", label: "Learning" },
];

interface TutorialSettings {
  videoUrl?: string;
  captionsUrl?: string;
  youtubeId?: string;
}

const DEFAULT_YOUTUBE_ID = "BMUxMP4bSTs"; // How to Become an Artist — confirmed playing
const BROKEN_YOUTUBE_IDS = ["ZK3pV2bcfPg", "TfAZt3O0sLY", "zL7L59iM66k"];
const LS_COMPLETED = "agms.becomeArtist.completed";
const LS_BOOKMARKS = "agms.becomeArtist.bookmarks";

function loadSet(key: string): Set<number> {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr.map(Number) : []);
  } catch {
    return new Set();
  }
}

function saveSet(key: string, set: Set<number>) {
  try {
    localStorage.setItem(key, JSON.stringify([...set]));
  } catch {
    /* ignore */
  }
}

function StepVideo({ videoId, title }: { videoId: string; title: string }) {
  const [loaded, setLoaded] = useState(false);
  return (
    <div className="relative w-full overflow-hidden rounded-xl border border-border bg-black/5">
      <div className="relative w-full" style={{ paddingTop: "56.25%" }}>
        {!loaded && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted/40">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Play className="h-6 w-6 fill-current" />
            </div>
            <p className="mt-3 text-sm font-medium text-muted-foreground">Loading video…</p>
          </div>
        )}
        <iframe
          className="absolute inset-0 h-full w-full"
          src={`https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1`}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          onLoad={() => setLoaded(true)}
        />
      </div>
    </div>
  );
}

function WatchLink({ url, title }: { url: string; title: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex w-full items-center justify-between gap-3 rounded-xl border border-dashed border-primary/30 bg-primary/5 p-4 transition-all hover:border-primary/60 hover:bg-primary/10"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15 text-primary">
          <Play className="h-4 w-4 fill-current" />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">{title}</p>
          <p className="text-xs text-muted-foreground">Open on YouTube</p>
        </div>
      </div>
      <ExternalLink className="h-4 w-4 text-primary opacity-70 group-hover:opacity-100" />
    </a>
  );
}

const BecomeArtist = () => {
  const navigate = useNavigate();
  const [tutorial, setTutorial] = useState<TutorialSettings>({ youtubeId: DEFAULT_YOUTUBE_ID });
  const [query, setQuery] = useState("");
  const [topic, setTopic] = useState<"all" | Topic>("all");
  const [completed, setCompleted] = useState<Set<number>>(() => loadSet(LS_COMPLETED));
  const [bookmarks, setBookmarks] = useState<Set<number>>(() => loadSet(LS_BOOKMARKS));
  const [showBookmarks, setShowBookmarks] = useState(false);

  useEffect(() => {
    supabase
      .from("site_settings")
      .select("value")
      .eq("key", "become_artist_tutorial")
      .maybeSingle()
      .then(({ data }) => {
        const v = (data?.value as TutorialSettings) || {};
        // Skip known-broken YouTube IDs — fall back to the working default
        if (v.youtubeId && BROKEN_YOUTUBE_IDS.includes(v.youtubeId)) {
          v.youtubeId = DEFAULT_YOUTUBE_ID;
        }
        if (v.videoUrl || v.youtubeId) setTutorial(v);
      });
  }, []);

  useEffect(() => saveSet(LS_COMPLETED, completed), [completed]);
  useEffect(() => saveSet(LS_BOOKMARKS, bookmarks), [bookmarks]);

  const toggleCompleted = (n: number) =>
    setCompleted((prev) => {
      const next = new Set(prev);
      next.has(n) ? next.delete(n) : next.add(n);
      return next;
    });

  const toggleBookmark = (n: number) =>
    setBookmarks((prev) => {
      const next = new Set(prev);
      next.has(n) ? next.delete(n) : next.add(n);
      return next;
    });

  const filteredSteps = useMemo(() => {
    const q = query.trim().toLowerCase();
    return artistSteps.filter((s) => {
      if (topic !== "all" && !s.topics.includes(topic)) return false;
      if (!q) return true;
      return (
        s.title.toLowerCase().includes(q) ||
        s.desc.toLowerCase().includes(q) ||
        s.topics.some((t) => t.includes(q)) ||
        (s.videoTitle || "").toLowerCase().includes(q)
      );
    });
  }, [query, topic]);

  const bookmarkedSteps = artistSteps.filter((s) => bookmarks.has(s.number));
  const progressPct = Math.round((completed.size / artistSteps.length) * 100);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-24 pb-20">
        <div className="container max-w-5xl">
          <div className="text-center">
            <h1 className="font-display text-4xl md:text-5xl font-bold text-foreground">
              Become an Artist
            </h1>
            <p className="mt-3 text-lg text-muted-foreground max-w-2xl mx-auto">
              Watch this step-by-step guide and learn exactly how to launch your art career on AGMS.
              Captions are available — click the CC button in the player.
            </p>
          </div>

          {/* Hero Video */}
          <div className="mt-10 overflow-hidden rounded-2xl border border-border shadow-gold bg-card">
            <div className="relative w-full" style={{ paddingTop: "56.25%" }}>
              {tutorial.videoUrl ? (
                <video
                  className="absolute inset-0 h-full w-full"
                  src={tutorial.videoUrl}
                  controls
                  playsInline
                  crossOrigin="anonymous"
                  aria-label="How to become an artist tutorial video"
                >
                  {tutorial.captionsUrl && (
                    <track
                      kind="captions"
                      src={tutorial.captionsUrl}
                      srcLang="en"
                      label="English"
                      default
                    />
                  )}
                </video>
              ) : (
                <iframe
                  className="absolute inset-0 h-full w-full"
                  src={`https://www.youtube.com/embed/${tutorial.youtubeId || DEFAULT_YOUTUBE_ID}?cc_load_policy=1&hl=en&cc_lang_pref=en&rel=0&modestbranding=1`}
                  title="How to Become an Artist — LEARN ART ON YOUR OWN: Complete Beginner Guide"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              )}
            </div>
          </div>

          {/* 10-Step Guide */}
          <div className="mt-20">
            <h2 className="font-display text-2xl font-semibold text-foreground text-center">
              The Complete Artist Journey
            </h2>
            <p className="mt-2 text-center text-muted-foreground max-w-xl mx-auto">
              A 10-step roadmap from discovering your talent to building a sustainable art career.
            </p>

            {/* Progress */}
            <div className="mt-8 rounded-2xl border border-border bg-card p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">Your progress</p>
                  <p className="text-xs text-muted-foreground">
                    {completed.size} of {artistSteps.length} steps completed
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-primary">{progressPct}%</span>
                  {completed.size > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setCompleted(new Set())}
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      Reset
                    </Button>
                  )}
                </div>
              </div>
              <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-gradient-gold transition-all"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>

            {/* Search + Filters + Bookmarks */}
            <div className="mt-6 space-y-3">
              <div className="flex flex-col gap-3 sm:flex-row">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search steps (e.g. portfolio, feedback, pricing)…"
                    className="pl-9"
                  />
                </div>
                <Button
                  type="button"
                  variant={showBookmarks ? "default" : "outline"}
                  onClick={() => setShowBookmarks((v) => !v)}
                  className={
                    showBookmarks
                      ? "bg-gradient-gold text-primary-foreground"
                      : "border-primary/30 text-primary hover:bg-primary/10"
                  }
                >
                  <Bookmark className="mr-2 h-4 w-4" />
                  Watch later ({bookmarks.size})
                </Button>
              </div>

              <div className="flex flex-wrap gap-2">
                {TOPIC_FILTERS.map((f) => {
                  const active = topic === f.id;
                  return (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setTopic(f.id)}
                      className={`rounded-full border px-3 py-1 text-xs font-medium transition-all ${
                        active
                          ? "border-primary bg-primary/15 text-primary"
                          : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground"
                      }`}
                    >
                      {f.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Bookmarks panel */}
            {showBookmarks && (
              <div className="mt-6 rounded-2xl border border-primary/30 bg-primary/5 p-5">
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-lg font-semibold text-foreground">
                    Your Watch Later
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowBookmarks(false)}
                    className="text-muted-foreground hover:text-foreground"
                    aria-label="Close bookmarks"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                {bookmarkedSteps.length === 0 ? (
                  <p className="mt-3 text-sm text-muted-foreground">
                    No saved videos yet. Tap the bookmark icon on any step to save it here.
                  </p>
                ) : (
                  <ul className="mt-3 space-y-2">
                    {bookmarkedSteps.map((s) => (
                      <li
                        key={s.number}
                        className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card p-3"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">
                            {s.number}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-foreground">
                              {s.title}
                            </p>
                            {s.videoTitle && (
                              <p className="truncate text-xs text-muted-foreground">
                                {s.videoTitle}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-shrink-0 items-center gap-1">
                          {s.videoId && (
                            <a
                              href={`https://www.youtube.com/watch?v=${s.videoId}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="rounded-md p-1.5 text-primary hover:bg-primary/10"
                              aria-label="Open video"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          )}
                          {!s.videoId && s.watchUrl && (
                            <a
                              href={s.watchUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="rounded-md p-1.5 text-primary hover:bg-primary/10"
                              aria-label="Open video"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          )}
                          <button
                            type="button"
                            onClick={() => toggleBookmark(s.number)}
                            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                            aria-label="Remove bookmark"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {/* Steps list */}
            <div className="mt-8 space-y-8">
              {filteredSteps.length === 0 && (
                <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
                  No steps match your search. Try a different keyword or topic.
                </div>
              )}
              {filteredSteps.map((step) => {
                const isDone = completed.has(step.number);
                const isSaved = bookmarks.has(step.number);
                return (
                  <div
                    key={step.number}
                    id={`step-${step.number}`}
                    className={`rounded-2xl border bg-card p-6 md:p-8 transition-all hover:shadow-gold ${
                      isDone ? "border-primary/60 bg-primary/[0.03]" : "border-border hover:border-primary/40"
                    }`}
                  >
                    <div className="flex flex-col gap-6 md:flex-row md:gap-8">
                      {/* Left: Text Content */}
                      <div className={`flex-1 ${step.videoId ? "md:max-w-md" : ""}`}>
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                              <step.icon className="h-5 w-5" />
                            </div>
                            <span className="text-xs font-bold uppercase tracking-wider text-primary">
                              Step {step.number}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => toggleBookmark(step.number)}
                            className={`rounded-md p-1.5 transition-colors ${
                              isSaved
                                ? "text-primary"
                                : "text-muted-foreground hover:text-primary"
                            }`}
                            aria-label={isSaved ? "Remove from Watch later" : "Save to Watch later"}
                          >
                            {isSaved ? (
                              <BookmarkCheck className="h-5 w-5 fill-current" />
                            ) : (
                              <Bookmark className="h-5 w-5" />
                            )}
                          </button>
                        </div>
                        <h3 className="mt-3 font-display text-xl font-semibold text-foreground">
                          {step.title}
                        </h3>
                        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                          {step.desc}
                        </p>
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          {step.topics.map((t) => (
                            <span
                              key={t}
                              className="rounded-full bg-muted px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"
                            >
                              {t}
                            </span>
                          ))}
                          {step.source && (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                              <Play className="h-3 w-3 fill-current" />
                              {step.videoId ? `Video by ${step.source}` : `Watch on ${step.source}`}
                            </span>
                          )}
                        </div>

                        <label className="mt-4 flex cursor-pointer items-center gap-2 text-sm text-foreground">
                          <Checkbox
                            checked={isDone}
                            onCheckedChange={() => toggleCompleted(step.number)}
                          />
                          <span className={isDone ? "font-medium text-primary" : ""}>
                            {isDone ? "Completed" : "Mark as completed"}
                          </span>
                        </label>
                      </div>

                      {/* Right: Video / Link */}
                      <div className="md:w-[360px] lg:w-[420px] flex-shrink-0">
                        {step.videoId ? (
                          <StepVideo
                            videoId={step.videoId}
                            title={step.videoTitle || step.title}
                          />
                        ) : step.watchUrl ? (
                          <WatchLink
                            url={step.watchUrl}
                            title={step.videoTitle || step.title}
                          />
                        ) : null}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Platform Steps */}
          <div className="mt-20">
            <h2 className="font-display text-2xl font-semibold text-foreground text-center">
              Your Journey on AGMS in 4 Steps
            </h2>
            <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {platformSteps.map((s, i) => (
                <div
                  key={s.title}
                  className="rounded-xl border border-border bg-card p-6 transition-all hover:border-primary/40 hover:shadow-gold"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <s.icon className="h-5 w-5" />
                  </div>
                  <p className="mt-4 text-xs font-medium text-primary">Step {i + 1}</p>
                  <h3 className="mt-1 font-display text-lg font-semibold text-foreground">
                    {s.title}
                  </h3>
                  <p className="mt-2 text-sm text-muted-foreground">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* CTAs */}
          <div className="mt-12 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Button
              onClick={() => navigate("/create-profile")}
              className="bg-gradient-gold text-primary-foreground shadow-gold hover:opacity-90"
            >
              Create My Profile <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate("/profile")}
              className="border-primary/30 text-primary hover:bg-primary/10"
            >
              Apply as Artist
            </Button>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default BecomeArtist;

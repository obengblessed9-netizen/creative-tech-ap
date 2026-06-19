import { useEffect, useMemo, useState } from "react";
import { Settings as SettingsIcon, Check } from "lucide-react";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger, SheetClose,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

type ThemeKey = "charcoal" | "midnight" | "ivory" | "sepia";
type AccentKey = "gold" | "rose" | "teal" | "violet";
type FontSize = "sm" | "md" | "lg";
type LineSpacing = "tight" | "normal" | "relaxed";

const THEMES: { key: ThemeKey; label: string; bg: string; fg: string; card: string; swatch: string }[] = [
  { key: "charcoal", label: "Charcoal", bg: "20 14% 9%",   fg: "40 38% 92%", card: "20 14% 12%", swatch: "#1a1714" },
  { key: "midnight", label: "Midnight", bg: "222 47% 8%",  fg: "210 40% 96%", card: "222 47% 12%", swatch: "#0b1220" },
  { key: "ivory",    label: "Ivory",    bg: "40 30% 96%",  fg: "20 14% 12%",  card: "40 30% 92%",  swatch: "#f6f1e7" },
  { key: "sepia",    label: "Sepia",    bg: "33 35% 90%",  fg: "25 35% 18%",  card: "33 35% 84%",  swatch: "#ead9c0" },
];

const ACCENTS: { key: AccentKey; label: string; hsl: string; swatch: string }[] = [
  { key: "gold",   label: "Gold",   hsl: "38 70% 55%",  swatch: "#d4a23a" },
  { key: "rose",   label: "Rose",   hsl: "346 77% 60%", swatch: "#e8527b" },
  { key: "teal",   label: "Teal",   hsl: "174 60% 45%", swatch: "#2dbab0" },
  { key: "violet", label: "Violet", hsl: "262 65% 62%", swatch: "#8b6ce2" },
];

const FONT_SIZES: { key: FontSize; label: string; px: string }[] = [
  { key: "sm", label: "Small",  px: "15px" },
  { key: "md", label: "Medium", px: "16px" },
  { key: "lg", label: "Large",  px: "18px" },
];

const LINE_SPACINGS: { key: LineSpacing; label: string; value: string }[] = [
  { key: "tight",   label: "Tight",   value: "1.35" },
  { key: "normal",  label: "Normal",  value: "1.55" },
  { key: "relaxed", label: "Relaxed", value: "1.85" },
];

function load<T extends string>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  const v = localStorage.getItem(key);
  return (v as T) ?? fallback;
}
function loadBool(key: string): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(key) === "true";
}

type Prefs = {
  theme: ThemeKey;
  accent: AccentKey;
  fontSize: FontSize;
  lineSpacing: LineSpacing;
  highContrast: boolean;
  reduceMotion: boolean;
  focusOutlines: boolean;
};

function readPrefs(): Prefs {
  return {
    theme: load<ThemeKey>("hs_theme", "charcoal"),
    accent: load<AccentKey>("hs_accent", "gold"),
    fontSize: load<FontSize>("hs_fontsize", "md"),
    lineSpacing: load<LineSpacing>("hs_linespacing", "normal"),
    highContrast: loadBool("hs_contrast"),
    reduceMotion: loadBool("hs_reducemotion"),
    focusOutlines: loadBool("hs_focusoutlines"),
  };
}

function applyPrefsToDom(p: Prefs) {
  if (typeof document === "undefined") return;
  const t = THEMES.find((x) => x.key === p.theme) ?? THEMES[0];
  const a = ACCENTS.find((x) => x.key === p.accent) ?? ACCENTS[0];
  const f = FONT_SIZES.find((x) => x.key === p.fontSize) ?? FONT_SIZES[1];
  const l = LINE_SPACINGS.find((x) => x.key === p.lineSpacing) ?? LINE_SPACINGS[1];

  const root = document.documentElement;
  root.style.setProperty("--background", t.bg);
  root.style.setProperty("--foreground", t.fg);
  root.style.setProperty("--card", t.card);
  root.style.setProperty("--popover", t.card);
  root.style.setProperty("--primary", a.hsl);
  root.style.setProperty("--accent", a.hsl);
  root.style.setProperty("--ring", a.hsl);
  root.style.fontSize = f.px;
  root.style.setProperty("--app-line-height", l.value);
  root.classList.toggle("hs-contrast", p.highContrast);
  root.classList.toggle("hs-reduce-motion", p.reduceMotion);
  root.classList.toggle("hs-focus-outlines", p.focusOutlines);
}

/** Called once at app startup — applies persisted preferences app-wide. */
export function applyHomeSettings() {
  applyPrefsToDom(readPrefs());
}

const HomeSettings = () => {
  const [open, setOpen] = useState(false);
  const [saved, setSaved] = useState<Prefs>(() => readPrefs());
  const [draft, setDraft] = useState<Prefs>(saved);

  // Live-preview draft while sheet is open
  useEffect(() => {
    if (open) applyPrefsToDom(draft);
  }, [draft, open]);

  // When sheet closes without applying, revert to saved
  const handleOpenChange = (next: boolean) => {
    if (!next) {
      applyPrefsToDom(saved);
      setDraft(saved);
    } else {
      setDraft(saved);
    }
    setOpen(next);
  };

  const apply = () => {
    localStorage.setItem("hs_theme", draft.theme);
    localStorage.setItem("hs_accent", draft.accent);
    localStorage.setItem("hs_fontsize", draft.fontSize);
    localStorage.setItem("hs_linespacing", draft.lineSpacing);
    localStorage.setItem("hs_contrast", String(draft.highContrast));
    localStorage.setItem("hs_reducemotion", String(draft.reduceMotion));
    localStorage.setItem("hs_focusoutlines", String(draft.focusOutlines));
    localStorage.setItem("heroVideoEnabled", String(!draft.reduceMotion));
    setSaved(draft);
    applyPrefsToDom(draft);
    setOpen(false);
  };

  const reset = () => {
    setDraft({
      theme: "charcoal", accent: "gold", fontSize: "md", lineSpacing: "normal",
      highContrast: false, reduceMotion: false, focusOutlines: false,
    });
  };

  const previewTheme = useMemo(
    () => THEMES.find((t) => t.key === draft.theme) ?? THEMES[0],
    [draft.theme]
  );
  const previewAccent = useMemo(
    () => ACCENTS.find((a) => a.key === draft.accent) ?? ACCENTS[0],
    [draft.accent]
  );

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetTrigger asChild>
        <Button
          size="icon"
          aria-label="Open appearance settings"
          className="fixed bottom-6 left-6 z-40 h-12 w-12 rounded-full bg-card border border-border text-foreground shadow-lg hover:bg-secondary"
        >
          <SettingsIcon className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto bg-background">
        <SheetHeader>
          <SheetTitle className="font-display text-2xl">Appearance & Settings</SheetTitle>
          <SheetDescription>
            Preview changes live. Tap Apply to save them across the whole app.
          </SheetDescription>
        </SheetHeader>

        {/* Live preview card */}
        <div
          className="mt-5 rounded-xl border p-4"
          style={{
            background: previewTheme.swatch,
            borderColor: previewAccent.swatch,
            color: `hsl(${previewTheme.fg})`,
          }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider opacity-70">Preview</span>
            <span
              className="h-3 w-3 rounded-full"
              style={{ background: previewAccent.swatch }}
              aria-hidden="true"
            />
          </div>
          <p className="mt-2 font-display text-lg" style={{ color: previewAccent.swatch }}>
            {previewTheme.label} · {previewAccent.label}
          </p>
          <p className="text-sm opacity-80">
            Sample text rendered with your chosen theme, accent, font size, and line spacing.
          </p>
          <button
            className="mt-3 rounded-md px-3 py-1.5 text-sm font-medium"
            style={{ background: previewAccent.swatch, color: "#111" }}
            type="button"
          >
            Accent button
          </button>
        </div>

        <div className="mt-6 space-y-6">
          <section>
            <Label className="text-sm font-semibold">Background theme</Label>
            <div className="mt-3 grid grid-cols-2 gap-3">
              {THEMES.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setDraft((d) => ({ ...d, theme: t.key }))}
                  className={`relative rounded-lg border p-3 text-left transition ${
                    draft.theme === t.key ? "border-primary ring-2 ring-primary/30" : "border-border hover:border-muted-foreground/50"
                  }`}
                >
                  <div className="h-10 w-full rounded-md mb-2 border border-border" style={{ background: t.swatch }} />
                  <span className="text-sm font-medium text-foreground">{t.label}</span>
                  {draft.theme === t.key && <Check className="absolute top-2 right-2 h-4 w-4 text-primary" />}
                </button>
              ))}
            </div>
          </section>

          <Separator />

          <section>
            <Label className="text-sm font-semibold">Accent color</Label>
            <div className="mt-3 flex flex-wrap gap-3">
              {ACCENTS.map((a) => (
                <button
                  key={a.key}
                  onClick={() => setDraft((d) => ({ ...d, accent: a.key }))}
                  aria-label={a.label}
                  className={`h-10 w-10 rounded-full border-2 transition ${
                    draft.accent === a.key ? "border-foreground scale-110" : "border-border"
                  }`}
                  style={{ background: a.swatch }}
                />
              ))}
            </div>
          </section>

          <Separator />

          <section>
            <Label className="text-sm font-semibold">Text size</Label>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {FONT_SIZES.map((f) => (
                <button
                  key={f.key}
                  onClick={() => setDraft((d) => ({ ...d, fontSize: f.key }))}
                  className={`rounded-lg border px-3 py-2 text-sm transition ${
                    draft.fontSize === f.key ? "border-primary text-primary bg-primary/10" : "border-border text-foreground hover:bg-secondary"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </section>

          <section>
            <Label className="text-sm font-semibold">Line spacing</Label>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {LINE_SPACINGS.map((l) => (
                <button
                  key={l.key}
                  onClick={() => setDraft((d) => ({ ...d, lineSpacing: l.key }))}
                  className={`rounded-lg border px-3 py-2 text-sm transition ${
                    draft.lineSpacing === l.key ? "border-primary text-primary bg-primary/10" : "border-border text-foreground hover:bg-secondary"
                  }`}
                >
                  {l.label}
                </button>
              ))}
            </div>
          </section>

          <Separator />

          <section className="space-y-4">
            <ToggleRow
              label="High contrast"
              hint="Boosts text and border visibility."
              checked={draft.highContrast}
              onChange={(v) => setDraft((d) => ({ ...d, highContrast: v }))}
            />
            <ToggleRow
              label="Reduce motion"
              hint="Disables hero video and animations."
              checked={draft.reduceMotion}
              onChange={(v) => setDraft((d) => ({ ...d, reduceMotion: v }))}
            />
            <ToggleRow
              label="Focus outlines"
              hint="Shows a clear ring on focused buttons, links and inputs."
              checked={draft.focusOutlines}
              onChange={(v) => setDraft((d) => ({ ...d, focusOutlines: v }))}
            />
          </section>

          <Separator />

          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={reset}>
              Reset
            </Button>
            <SheetClose asChild>
              <Button variant="ghost" className="flex-1">Cancel</Button>
            </SheetClose>
            <Button className="flex-1 bg-primary text-primary-foreground" onClick={apply}>
              Apply
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

const ToggleRow = ({
  label, hint, checked, onChange,
}: { label: string; hint: string; checked: boolean; onChange: (v: boolean) => void }) => (
  <div className="flex items-center justify-between">
    <div>
      <Label className="text-sm font-semibold">{label}</Label>
      <p className="text-xs text-muted-foreground">{hint}</p>
    </div>
    <Switch checked={checked} onCheckedChange={onChange} />
  </div>
);

export default HomeSettings;

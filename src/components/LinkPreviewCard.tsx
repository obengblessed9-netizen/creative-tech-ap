import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Link2, ShieldAlert } from "lucide-react";
import { isBlockedUrl } from "@/lib/safeLink";

interface Preview {
  url: string;
  title: string | null;
  description: string | null;
  image: string | null;
  siteName: string;
}

const cache = new Map<string, Preview | null>();
const inflight = new Map<string, Promise<Preview | null>>();

const FETCH_TIMEOUT_MS = 8000;

const fetchPreview = (url: string): Promise<Preview | null> => {
  if (cache.has(url)) return Promise.resolve(cache.get(url)!);
  if (inflight.has(url)) return inflight.get(url)!;
  const p = new Promise<Preview | null>((resolve) => {
    const timer = setTimeout(() => {
      cache.set(url, null);
      inflight.delete(url);
      resolve(null);
    }, FETCH_TIMEOUT_MS);
    supabase.functions
      .invoke("link-preview", { body: { url } })
      .then(({ data, error }) => {
        clearTimeout(timer);
        const result = error || !data || (data as any).error ? null : (data as Preview);
        cache.set(url, result);
        inflight.delete(url);
        resolve(result);
      })
      .catch(() => {
        clearTimeout(timer);
        cache.set(url, null);
        inflight.delete(url);
        resolve(null);
      });
  });
  inflight.set(url, p);
  return p;
};

const hostOf = (url: string) => {
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return url; }
};

export const LinkPreviewCard = ({ url }: { url: string }) => {
  const blocked = isBlockedUrl(url);
  const [preview, setPreview] = useState<Preview | null | "loading">(blocked ? null : "loading");

  useEffect(() => {
    if (blocked) return;
    let active = true;
    fetchPreview(url).then((p) => { if (active) setPreview(p); });
    return () => { active = false; };
  }, [url, blocked]);

  // Blocked domain — never fetch, show warning + plain link
  if (blocked) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer nofollow"
        className="mt-2 flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm">
        <ShieldAlert className="h-4 w-4 shrink-0 text-destructive mt-0.5" />
        <div className="min-w-0">
          <p className="font-semibold text-destructive">Preview blocked</p>
          <p className="text-xs text-muted-foreground">This domain is not allowed for previews. Open at your own risk:</p>
          <p className="mt-1 break-all text-xs text-foreground">{url}</p>
        </div>
      </a>
    );
  }

  if (preview === "loading") {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer"
        className="mt-2 block rounded-md border border-border bg-secondary/40 p-3 animate-pulse">
        <div className="h-3 w-1/3 rounded bg-muted" />
        <div className="mt-2 h-3 w-2/3 rounded bg-muted" />
      </a>
    );
  }

  // Graceful fallback: preview failed/timed out — show plain URL
  if (!preview) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer"
        className="mt-2 flex items-center gap-1.5 rounded-md border border-border bg-secondary/40 p-2 text-sm text-primary hover:underline break-all">
        <Link2 className="h-3.5 w-3.5 shrink-0" /> {url}
      </a>
    );
  }

  const host = hostOf(preview.url);
  return (
    <a href={preview.url} target="_blank" rel="noopener noreferrer"
      className="mt-2 block overflow-hidden rounded-md border border-border bg-secondary/40 hover:border-primary/60 transition-colors">
      {preview.image && (
        <img
          src={preview.image}
          alt={preview.title || host}
          loading="lazy"
          className="w-full max-h-48 object-cover bg-muted"
          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
        />
      )}
      <div className="p-3">
        <div className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground">
          <Link2 className="h-3 w-3" /> {preview.siteName || host}
        </div>
        {preview.title && (
          <p className="mt-1 text-sm font-semibold text-foreground line-clamp-2">{preview.title}</p>
        )}
        {preview.description && (
          <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{preview.description}</p>
        )}
      </div>
    </a>
  );
};

export const LinkPreviewList = ({ urls }: { urls: string[] }) => {
  if (!urls || urls.length === 0) return null;
  return (
    <div className="space-y-2">
      {urls.map((u) => <LinkPreviewCard key={u} url={u} />)}
    </div>
  );
};

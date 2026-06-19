// Fetches Open Graph / meta data for a URL to render a link preview card.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const pick = (html: string, regexes: RegExp[]): string | null => {
  for (const r of regexes) {
    const m = html.match(r);
    if (m && m[1]) return m[1].trim();
  }
  return null;
};

const decode = (s: string) =>
  s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, " ");

// Domains we refuse to fetch — kept in sync with src/lib/safeLink.ts
const BLOCKED_DOMAINS = [
  "bit.ly", "tinyurl.com", "goo.gl", "t.co", "ow.ly", "is.gd", "buff.ly", "rebrand.ly", "cutt.ly",
  "pornhub.com", "xvideos.com", "xnxx.com", "redtube.com",
  "grabify.link", "iplogger.org", "iplogger.com", "blasze.com", "yip.su",
];

const isBlockedHost = (host: string) => {
  const h = host.toLowerCase().replace(/^www\./, "");
  return BLOCKED_DOMAINS.some((d) => h === d || h.endsWith("." + d));
};

// Block private / loopback / link-local hosts to prevent SSRF
const isPrivateHost = (host: string) => {
  const h = host.toLowerCase();
  if (h === "localhost" || h.endsWith(".localhost") || h.endsWith(".local")) return true;
  if (/^127\./.test(h) || /^10\./.test(h) || /^192\.168\./.test(h)) return true;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(h)) return true;
  if (/^169\.254\./.test(h)) return true;
  if (h === "0.0.0.0" || h === "::1") return true;
  return false;
};

const json = (body: Record<string, unknown>, status = 200, extraHeaders: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", ...extraHeaders },
  });

const hasValidPublicHostname = (host: string) => {
  const h = host.toLowerCase();
  return /^[a-z0-9.-]+$/i.test(h) && h.includes(".") && /[a-z]{2,}$/i.test(h);
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { url } = await req.json();
    if (!url || typeof url !== "string") {
      return json({ error: "url required" }, 400);
    }
    const target = new URL(url);
    if (!/^https?:$/.test(target.protocol)) {
      return json({ error: "unsupported protocol" }, 400);
    }
    // Reject hostnames without a TLD (e.g. "fcfddtf") to avoid DNS errors bubbling up as 500
    if (!hasValidPublicHostname(target.hostname)) {
      return json({ error: "invalid hostname", url: target.toString() });
    }
    if (isBlockedHost(target.hostname) || isPrivateHost(target.hostname)) {
      return json({ error: "domain blocked" }, 403);
    }

    const ctrl = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(), 6000);
    let res: Response;
    try {
      res = await fetch(target.toString(), {
        signal: ctrl.signal,
        headers: { "User-Agent": "Mozilla/5.0 (compatible; AGMSLinkPreview/1.0)" },
        redirect: "follow",
      });
    } catch (fetchErr) {
      clearTimeout(timeout);
      return json({ error: "fetch failed", message: (fetchErr as Error).message, url: target.toString() });
    }
    clearTimeout(timeout);

    const html = (await res.text()).slice(0, 500_000);

    const title = pick(html, [
      /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+name=["']twitter:title["'][^>]+content=["']([^"']+)["']/i,
      /<title>([^<]+)<\/title>/i,
    ]);
    const description = pick(html, [
      /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+name=["']twitter:description["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i,
    ]);
    let image = pick(html, [
      /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i,
    ]);
    if (image && !/^https?:\/\//i.test(image)) {
      try { image = new URL(image, target).toString(); } catch { image = null; }
    }
    const siteName = pick(html, [
      /<meta[^>]+property=["']og:site_name["'][^>]+content=["']([^"']+)["']/i,
    ]) || target.hostname.replace(/^www\./, "");

    return new Response(
      JSON.stringify({
        url: target.toString(),
        title: title ? decode(title) : null,
        description: description ? decode(description) : null,
        image: image || null,
        siteName: decode(siteName),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "public, max-age=3600" } }
    );
  } catch (e) {
    return json({ error: (e as Error).message });
  }
});

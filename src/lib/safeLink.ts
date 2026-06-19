// Safe-link helpers shared by client and edge function intent.
// Domains we refuse to fetch previews for (malware, phishing-prone shorteners,
// adult, or otherwise unsafe). Blocking happens BEFORE any network fetch.
export const BLOCKED_DOMAINS = [
  // URL shorteners (hide destination)
  "bit.ly", "tinyurl.com", "goo.gl", "t.co", "ow.ly", "is.gd", "buff.ly", "rebrand.ly", "cutt.ly",
  // Adult / unsafe
  "pornhub.com", "xvideos.com", "xnxx.com", "redtube.com",
  // Known malware / abuse hosts
  "grabify.link", "iplogger.org", "iplogger.com", "blasze.com", "yip.su",
];

export const isBlockedUrl = (raw: string): boolean => {
  try {
    const u = new URL(raw);
    if (!/^https?:$/.test(u.protocol)) return true;
    const host = u.hostname.toLowerCase().replace(/^www\./, "");
    if (!host.includes(".") || !/[a-z]{2,}$/i.test(host)) return true;
    if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local")) return true;
    if (/^127\./.test(host) || /^10\./.test(host) || /^192\.168\./.test(host)) return true;
    if (/^172\.(1[6-9]|2\d|3[01])\./.test(host) || /^169\.254\./.test(host)) return true;
    if (host === "0.0.0.0" || host === "::1") return true;
    return BLOCKED_DOMAINS.some((d) => host === d || host.endsWith("." + d));
  } catch {
    return true;
  }
};

export const normalizeUrl = (raw: string): string | null => {
  let v = raw.trim();
  if (!v) return null;
  if (!/^https?:\/\//i.test(v)) v = `https://${v}`;
  try {
    const u = new URL(v);
    return u.toString();
  } catch {
    return null;
  }
};

// Extract URLs from free text or newline/comma separated input.
export const extractUrls = (text: string): string[] => {
  if (!text) return [];
  const tokens = text.split(/[\s,]+/).filter(Boolean);
  const out: string[] = [];
  const seen = new Set<string>();
  for (const t of tokens) {
    const n = normalizeUrl(t);
    if (n && !seen.has(n)) {
      seen.add(n);
      out.push(n);
    }
  }
  return out;
};

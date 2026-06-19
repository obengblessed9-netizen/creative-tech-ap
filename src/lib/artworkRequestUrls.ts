import { supabase } from "@/integrations/supabase/client";

/**
 * Resolve a stored value to a viewable URL.
 * Older rows stored full public URLs; newer rows store only the storage path.
 * Returns null if the value is empty or signing fails.
 */
export async function resolveArtworkRequestUrl(value: string | null | undefined, expiresIn = 3600): Promise<string | null> {
  if (!value) return null;
  if (value.startsWith("http://") || value.startsWith("https://")) return value;
  const { data, error } = await supabase.storage
    .from("artwork-requests")
    .createSignedUrl(value, expiresIn);
  if (error) return null;
  return data?.signedUrl ?? null;
}

export async function resolveArtworkRequestUrls(values: (string | null | undefined)[] | null | undefined): Promise<string[]> {
  if (!values || values.length === 0) return [];
  const out = await Promise.all(values.map((v) => resolveArtworkRequestUrl(v)));
  return out.filter((u): u is string => !!u);
}


-- Secure function to expose followers (name + email) only to the artist owner
CREATE OR REPLACE FUNCTION public.get_artist_followers(_artist_id uuid)
RETURNS TABLE (
  follower_id uuid,
  display_name text,
  email text,
  avatar_url text,
  followed_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Authorize: caller must own the artist row OR be admin
  IF NOT EXISTS (
    SELECT 1 FROM public.artists a
    WHERE a.id = _artist_id
      AND (a.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role))
  ) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  RETURN QUERY
  SELECT
    f.follower_id,
    p.display_name,
    u.email::text,
    p.avatar_url,
    f.created_at
  FROM public.followers f
  LEFT JOIN public.profiles p ON p.user_id = f.follower_id
  LEFT JOIN auth.users u ON u.id = f.follower_id
  WHERE f.artist_id = _artist_id
  ORDER BY f.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_artist_followers(uuid) TO authenticated;

-- Tighten storage: drop broad listing policies on public buckets.
-- Public URLs still resolve because the buckets are marked public.
DROP POLICY IF EXISTS "Authenticated read artwork-images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated read profile-pictures" ON storage.objects;
DROP POLICY IF EXISTS "Public read artwork-images by URL" ON storage.objects;
DROP POLICY IF EXISTS "Public read profile-pictures by URL" ON storage.objects;

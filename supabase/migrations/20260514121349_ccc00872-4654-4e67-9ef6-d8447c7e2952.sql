-- Recreate get_artist_followers with pagination + total count
DROP FUNCTION IF EXISTS public.get_artist_followers(uuid);
DROP FUNCTION IF EXISTS public.get_artist_followers(uuid, integer, integer);

CREATE OR REPLACE FUNCTION public.get_artist_followers(
  _artist_id uuid,
  _limit integer DEFAULT 20,
  _offset integer DEFAULT 0
)
RETURNS TABLE(
  follower_id uuid,
  display_name text,
  email text,
  avatar_url text,
  followed_at timestamp with time zone,
  total_count bigint
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.artists a
    WHERE a.id = _artist_id
      AND (a.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role))
  ) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  RETURN QUERY
  WITH total AS (
    SELECT count(*)::bigint AS c FROM public.followers WHERE artist_id = _artist_id
  )
  SELECT
    f.follower_id,
    p.display_name,
    u.email::text,
    p.avatar_url,
    f.created_at,
    (SELECT c FROM total)
  FROM public.followers f
  LEFT JOIN public.profiles p ON p.user_id = f.follower_id
  LEFT JOIN auth.users u ON u.id = f.follower_id
  WHERE f.artist_id = _artist_id
  ORDER BY f.created_at DESC
  LIMIT GREATEST(_limit, 1)
  OFFSET GREATEST(_offset, 0);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_artist_followers(uuid, integer, integer) TO authenticated;
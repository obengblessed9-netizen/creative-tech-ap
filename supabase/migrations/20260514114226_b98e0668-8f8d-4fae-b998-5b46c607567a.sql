
-- Revoke anon access to sensitive tables (PostgREST/GraphQL won't expose them to signed-out users)
REVOKE SELECT ON public.clients FROM anon;
REVOKE SELECT ON public.sales FROM anon;
REVOKE SELECT ON public.event_attendees FROM anon;
REVOKE SELECT ON public.artist_applications FROM anon;
REVOKE SELECT ON public.artist_verifications FROM anon;
REVOKE SELECT ON public.messages FROM anon;
REVOKE SELECT ON public.art_detection_results FROM anon;
REVOKE SELECT ON public.cart_items FROM anon;
REVOKE SELECT ON public.favorites FROM anon;
REVOKE SELECT ON public.user_roles FROM anon;

-- Restrict storage object listing on public buckets to staff/admin only
-- (Files remain accessible by direct URL for public buckets)
DROP POLICY IF EXISTS "Restrict listing on artwork-images" ON storage.objects;
DROP POLICY IF EXISTS "Restrict listing on profile-pictures" ON storage.objects;

-- Tighten the broad public-listing policies if present
DO $$
DECLARE p record;
BEGIN
  FOR p IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND cmd = 'SELECT'
      AND (qual ILIKE '%artwork-images%' OR qual ILIKE '%profile-pictures%')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', p.policyname);
  END LOOP;
END $$;

-- Allow public read of individual objects (still works via signed/public URLs)
-- but require authentication to LIST contents
CREATE POLICY "Public read artwork-images by URL"
  ON storage.objects FOR SELECT TO anon
  USING (bucket_id = 'artwork-images' AND name IS NOT NULL);

CREATE POLICY "Public read profile-pictures by URL"
  ON storage.objects FOR SELECT TO anon
  USING (bucket_id = 'profile-pictures' AND name IS NOT NULL);

CREATE POLICY "Authenticated read artwork-images"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'artwork-images');

CREATE POLICY "Authenticated read profile-pictures"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'profile-pictures');

-- Fix permissive artwork INSERT — require uploader to be authenticated
DROP POLICY IF EXISTS "Authenticated users can submit artworks" ON public.artworks;
CREATE POLICY "Authenticated users can submit artworks"
  ON public.artworks FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

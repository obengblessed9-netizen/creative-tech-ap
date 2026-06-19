-- Allow any authenticated user to upload to artwork-images bucket
-- (The original policy only allowed admins)
CREATE POLICY "Authenticated users can upload artwork images"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'artwork-images' AND auth.uid() IS NOT NULL);

-- Allow authenticated users to read artwork-images
CREATE POLICY "Authenticated users can read artwork images"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'artwork-images');

-- Allow public/anon users to read artwork-images (for gallery display)
CREATE POLICY "Public read artwork images"
  ON storage.objects FOR SELECT TO anon
  USING (bucket_id = 'artwork-images');

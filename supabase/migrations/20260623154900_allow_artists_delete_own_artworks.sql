-- Allow artists to update their own artworks (where the artwork belongs to their artist profile)
CREATE POLICY "Artists can update own artworks"
ON public.artworks
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.artists
    WHERE artists.id = artworks.artist_id
      AND artists.user_id = auth.uid()
  )
);

-- Allow artists to delete their own artworks (where the artwork belongs to their artist profile)
CREATE POLICY "Artists can delete own artworks"
ON public.artworks
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.artists
    WHERE artists.id = artworks.artist_id
      AND artists.user_id = auth.uid()
  )
);

-- Also allow artists to delete their own images from storage
CREATE POLICY "Artists can delete own artwork images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'artwork-images'
  AND EXISTS (
    SELECT 1 FROM public.artworks
    JOIN public.artists ON artists.id = artworks.artist_id
    WHERE artists.user_id = auth.uid()
      AND artworks.image_url LIKE '%' || storage.objects.name
  )
);

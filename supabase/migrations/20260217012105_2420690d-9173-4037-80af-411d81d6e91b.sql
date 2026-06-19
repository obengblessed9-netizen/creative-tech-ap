-- Allow any authenticated user to insert artworks
CREATE POLICY "Authenticated users can submit artworks"
ON public.artworks
FOR INSERT
TO authenticated
WITH CHECK (true);

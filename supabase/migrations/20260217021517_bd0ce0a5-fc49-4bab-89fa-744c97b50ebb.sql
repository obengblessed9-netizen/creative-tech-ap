-- Allow artists to update their own profile
CREATE POLICY "Artists can update own profile"
ON public.artists
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
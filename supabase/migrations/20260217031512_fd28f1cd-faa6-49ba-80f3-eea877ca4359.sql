-- Allow authenticated users to create their own artist profile
CREATE POLICY "Users can create own artist profile"
ON public.artists FOR INSERT
WITH CHECK (auth.uid() = user_id);
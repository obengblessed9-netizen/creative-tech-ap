CREATE TABLE public.live_stream_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  stream_id UUID NOT NULL REFERENCES public.live_streams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.live_stream_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view stream posts" ON public.live_stream_posts FOR SELECT USING (true);
CREATE POLICY "Authenticated can post" ON public.live_stream_posts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Authors can delete own posts" ON public.live_stream_posts FOR DELETE USING (auth.uid() = user_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.live_stream_posts;
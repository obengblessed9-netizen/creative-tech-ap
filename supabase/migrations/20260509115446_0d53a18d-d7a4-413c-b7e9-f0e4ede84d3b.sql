CREATE TABLE public.live_stream_viewers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  stream_id uuid NOT NULL,
  user_id uuid NOT NULL,
  display_name text,
  joined_at timestamp with time zone NOT NULL DEFAULT now(),
  left_at timestamp with time zone,
  UNIQUE (stream_id, user_id)
);

CREATE INDEX idx_lsv_stream ON public.live_stream_viewers(stream_id);

ALTER TABLE public.live_stream_viewers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Viewers can join"
ON public.live_stream_viewers FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Viewers can update own row"
ON public.live_stream_viewers FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Viewers see own row"
ON public.live_stream_viewers FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Hosts see viewers of their streams"
ON public.live_stream_viewers FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.live_streams ls
  WHERE ls.id = live_stream_viewers.stream_id AND ls.host_id = auth.uid()
));

CREATE POLICY "Hosts can remove viewers"
ON public.live_stream_viewers FOR DELETE
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.live_streams ls
  WHERE ls.id = live_stream_viewers.stream_id AND ls.host_id = auth.uid()
));

ALTER PUBLICATION supabase_realtime ADD TABLE public.live_stream_viewers;

-- Admin audit log
CREATE TABLE public.admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid NOT NULL,
  action text NOT NULL,
  target_type text NOT NULL,
  target_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins view audit log" ON public.admin_audit_log
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins insert audit log" ON public.admin_audit_log
  FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role) AND auth.uid() = actor_id);

-- Artist ratings
CREATE TABLE public.artist_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id uuid NOT NULL,
  user_id uuid NOT NULL,
  rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  review text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(artist_id, user_id)
);
ALTER TABLE public.artist_ratings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone views artist ratings" ON public.artist_ratings
  FOR SELECT USING (true);
CREATE POLICY "Auth users rate artists" ON public.artist_ratings
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own artist rating" ON public.artist_ratings
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users delete own artist rating" ON public.artist_ratings
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE TRIGGER trg_artist_ratings_updated BEFORE UPDATE ON public.artist_ratings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Allow artists to view their followers' profile info via a policy on followers (already public select)
-- Add explicit policy to ensure the artist can read followers list
CREATE POLICY "Artists can view their followers" ON public.followers
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.artists a WHERE a.id = followers.artist_id AND a.user_id = auth.uid()));

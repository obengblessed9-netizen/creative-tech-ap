-- Audit log for moderation actions
CREATE TABLE public.live_moderation_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  stream_id UUID NOT NULL,
  actor_id UUID NOT NULL,
  target_user_id UUID,
  action TEXT NOT NULL,
  reason TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.live_moderation_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can record own moderation events"
ON public.live_moderation_events FOR INSERT TO authenticated
WITH CHECK (auth.uid() = actor_id);

CREATE POLICY "Users can read own moderation events"
ON public.live_moderation_events FOR SELECT TO authenticated
USING (auth.uid() = actor_id);

CREATE POLICY "Admins manage moderation events"
ON public.live_moderation_events FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_mod_events_stream ON public.live_moderation_events(stream_id);
CREATE INDEX idx_mod_events_target ON public.live_moderation_events(target_user_id);

-- Hidden flag for chat moderation
ALTER TABLE public.live_chat_messages
  ADD COLUMN IF NOT EXISTS hidden BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS hidden_by UUID,
  ADD COLUMN IF NOT EXISTS hidden_at TIMESTAMP WITH TIME ZONE;

-- Tighten chat SELECT: hide hidden messages from everyone except author and admins
DROP POLICY IF EXISTS "Anyone can view chat" ON public.live_chat_messages;

CREATE POLICY "Public can view non-hidden chat"
ON public.live_chat_messages FOR SELECT
USING (hidden = false);

CREATE POLICY "Authors can view own chat"
ON public.live_chat_messages FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all chat"
ON public.live_chat_messages FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update chat"
ON public.live_chat_messages FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete chat"
ON public.live_chat_messages FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admin viewer management
CREATE POLICY "Admins can manage viewers"
ON public.live_stream_viewers FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Report resolution fields
ALTER TABLE public.live_reports
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'open',
  ADD COLUMN IF NOT EXISTS resolved_by UUID,
  ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS resolution_note TEXT;
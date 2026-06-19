CREATE TABLE public.live_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  stream_id UUID NOT NULL,
  reporter_id UUID NOT NULL,
  reported_user_id UUID NOT NULL,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.live_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can submit reports"
ON public.live_reports
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Reporters can view own reports"
ON public.live_reports
FOR SELECT
TO authenticated
USING (auth.uid() = reporter_id);

CREATE POLICY "Admins can manage reports"
ON public.live_reports
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_live_reports_stream ON public.live_reports(stream_id);
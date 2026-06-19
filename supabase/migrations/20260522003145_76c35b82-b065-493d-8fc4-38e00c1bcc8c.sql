
-- Site settings (key/value JSON)
CREATE TABLE IF NOT EXISTS public.site_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "site_settings readable by everyone"
  ON public.site_settings FOR SELECT USING (true);

CREATE POLICY "site_settings admin insert"
  ON public.site_settings FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "site_settings admin update"
  ON public.site_settings FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "site_settings admin delete"
  ON public.site_settings FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_site_settings_updated
  BEFORE UPDATE ON public.site_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Public bucket for tutorial videos / captions
INSERT INTO storage.buckets (id, name, public)
VALUES ('tutorials', 'tutorials', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "tutorials public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'tutorials');

CREATE POLICY "tutorials admin write"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'tutorials' AND public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "tutorials admin update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'tutorials' AND public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "tutorials admin delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'tutorials' AND public.has_role(auth.uid(), 'admin'::app_role));

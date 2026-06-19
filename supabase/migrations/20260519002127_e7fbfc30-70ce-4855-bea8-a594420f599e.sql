
-- Create artwork-requests storage bucket (public so previews work)
INSERT INTO storage.buckets (id, name, public)
VALUES ('artwork-requests', 'artwork-requests', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Anyone can view artwork request files"
ON storage.objects FOR SELECT
USING (bucket_id = 'artwork-requests');

CREATE POLICY "Authenticated users upload to their own folder"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'artwork-requests'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own request files"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'artwork-requests'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Requests table
CREATE TABLE public.artwork_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  category text,
  title text,
  description text,
  budget numeric,
  reference_image_urls text[] DEFAULT '{}',
  sketch_url text,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.artwork_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own requests"
ON public.artwork_requests FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Artists/admins can view all open requests"
ON public.artwork_requests FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (SELECT 1 FROM public.artists a WHERE a.user_id = auth.uid())
);

CREATE POLICY "Users create own requests"
ON public.artwork_requests FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own requests"
ON public.artwork_requests FOR UPDATE TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users delete own requests"
ON public.artwork_requests FOR DELETE TO authenticated
USING (auth.uid() = user_id);

CREATE TRIGGER artwork_requests_updated_at
BEFORE UPDATE ON public.artwork_requests
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

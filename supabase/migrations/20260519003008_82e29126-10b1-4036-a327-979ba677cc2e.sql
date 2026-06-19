-- 1. Make artwork-requests bucket private
UPDATE storage.buckets SET public = false WHERE id = 'artwork-requests';

-- 2. Storage policies for artwork-requests
DROP POLICY IF EXISTS "ar_owner_select" ON storage.objects;
DROP POLICY IF EXISTS "ar_owner_insert" ON storage.objects;
DROP POLICY IF EXISTS "ar_owner_delete" ON storage.objects;
DROP POLICY IF EXISTS "ar_artists_admins_select" ON storage.objects;

CREATE POLICY "ar_owner_select" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'artwork-requests' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "ar_owner_insert" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'artwork-requests' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "ar_owner_delete" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'artwork-requests' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "ar_artists_admins_select" ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'artwork-requests' AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (SELECT 1 FROM public.artists a WHERE a.user_id = auth.uid())
  )
);

-- 3. Allow artists/admins to update artwork_requests (status)
DROP POLICY IF EXISTS "Artists/admins can update requests" ON public.artwork_requests;
CREATE POLICY "Artists/admins can update requests" ON public.artwork_requests
FOR UPDATE TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (SELECT 1 FROM public.artists a WHERE a.user_id = auth.uid())
);

-- Constrain status values via trigger (avoid CHECK with non-immutable concerns is fine, but use CHECK here)
ALTER TABLE public.artwork_requests DROP CONSTRAINT IF EXISTS artwork_requests_status_check;
ALTER TABLE public.artwork_requests ADD CONSTRAINT artwork_requests_status_check
CHECK (status IN ('open','accepted','declined','in_progress','done'));

-- 4. Notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id uuid NOT NULL,
  type text NOT NULL,
  title text NOT NULL,
  body text,
  link_url text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users view own notifications" ON public.notifications;
DROP POLICY IF EXISTS "users update own notifications" ON public.notifications;
DROP POLICY IF EXISTS "users delete own notifications" ON public.notifications;
DROP POLICY IF EXISTS "system inserts notifications" ON public.notifications;

CREATE POLICY "users view own notifications" ON public.notifications
FOR SELECT TO authenticated USING (auth.uid() = recipient_id);

CREATE POLICY "users update own notifications" ON public.notifications
FOR UPDATE TO authenticated USING (auth.uid() = recipient_id);

CREATE POLICY "users delete own notifications" ON public.notifications
FOR DELETE TO authenticated USING (auth.uid() = recipient_id);

-- Inserts come from a SECURITY DEFINER trigger; block direct inserts by default by not creating an insert policy.

CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON public.notifications(recipient_id, read, created_at DESC);

-- 5. Trigger: notify artists/admins on new artwork request
CREATE OR REPLACE FUNCTION public.notify_on_artwork_request()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  recip uuid;
  link text;
BEGIN
  link := '/admin/artwork-requests?id=' || NEW.id::text;

  FOR recip IN
    SELECT user_id FROM public.user_roles WHERE role = 'admin'::app_role
    UNION
    SELECT user_id FROM public.artists WHERE user_id IS NOT NULL
  LOOP
    INSERT INTO public.notifications (recipient_id, type, title, body, link_url, metadata)
    VALUES (
      recip,
      'artwork_request',
      'New artwork request: ' || COALESCE(NEW.title,'Untitled'),
      COALESCE(NEW.description, 'A new commission request was submitted.'),
      link,
      jsonb_build_object(
        'request_id', NEW.id,
        'category', NEW.category,
        'budget', NEW.budget,
        'reference_image_urls', NEW.reference_image_urls,
        'sketch_url', NEW.sketch_url
      )
    );
  END LOOP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_artwork_request ON public.artwork_requests;
CREATE TRIGGER trg_notify_artwork_request
AFTER INSERT ON public.artwork_requests
FOR EACH ROW EXECUTE FUNCTION public.notify_on_artwork_request();

-- updated_at trigger for artwork_requests
DROP TRIGGER IF EXISTS trg_artwork_requests_updated_at ON public.artwork_requests;
CREATE TRIGGER trg_artwork_requests_updated_at
BEFORE UPDATE ON public.artwork_requests
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
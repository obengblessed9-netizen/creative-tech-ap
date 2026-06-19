
-- Artist applications table for users requesting artist status
CREATE TABLE public.artist_applications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  artist_name TEXT NOT NULL,
  specialty TEXT,
  bio TEXT,
  portfolio_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.artist_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own application" ON public.artist_applications FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can submit application" ON public.artist_applications FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own pending application" ON public.artist_applications FOR UPDATE TO authenticated USING (auth.uid() = user_id AND status = 'pending');
CREATE POLICY "Admins can manage all applications" ON public.artist_applications FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_artist_applications_updated_at
BEFORE UPDATE ON public.artist_applications
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

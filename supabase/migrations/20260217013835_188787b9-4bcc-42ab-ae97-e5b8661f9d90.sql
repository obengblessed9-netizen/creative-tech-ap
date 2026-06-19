
-- Add user_id to artists table to link artists to auth users
ALTER TABLE public.artists ADD COLUMN IF NOT EXISTS user_id UUID UNIQUE;
ALTER TABLE public.artists ADD COLUMN IF NOT EXISTS verified BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.artists ADD COLUMN IF NOT EXISTS verification_status TEXT NOT NULL DEFAULT 'none' CHECK (verification_status IN ('none', 'pending', 'approved', 'rejected'));

-- Followers table
CREATE TABLE public.followers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  follower_id UUID NOT NULL,
  artist_id UUID NOT NULL REFERENCES public.artists(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(follower_id, artist_id)
);
ALTER TABLE public.followers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view follower counts" ON public.followers FOR SELECT USING (true);
CREATE POLICY "Users can follow artists" ON public.followers FOR INSERT TO authenticated WITH CHECK (auth.uid() = follower_id);
CREATE POLICY "Users can unfollow artists" ON public.followers FOR DELETE TO authenticated USING (auth.uid() = follower_id);

-- Artist verification requests table
CREATE TABLE public.artist_verifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  artist_id UUID NOT NULL REFERENCES public.artists(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  selfie_url TEXT NOT NULL,
  id_card_url TEXT NOT NULL,
  ai_result JSONB,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.artist_verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own verifications" ON public.artist_verifications FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can submit verifications" ON public.artist_verifications FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can manage verifications" ON public.artist_verifications FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_artist_verifications_updated_at
BEFORE UPDATE ON public.artist_verifications
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket for verification documents
INSERT INTO storage.buckets (id, name, public) VALUES ('verification-docs', 'verification-docs', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for verification docs
CREATE POLICY "Users can upload own verification docs"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'verification-docs' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view own verification docs"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'verification-docs' AND (auth.uid()::text = (storage.foldername(name))[1] OR has_role(auth.uid(), 'admin'::app_role)));

CREATE POLICY "Admins can view all verification docs"
ON storage.objects FOR SELECT
USING (bucket_id = 'verification-docs' AND has_role(auth.uid(), 'admin'::app_role));

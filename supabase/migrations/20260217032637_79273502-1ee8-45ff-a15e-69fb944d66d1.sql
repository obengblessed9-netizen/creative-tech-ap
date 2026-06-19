
-- Add professional details columns to artist_applications
ALTER TABLE public.artist_applications
  ADD COLUMN IF NOT EXISTS art_style text,
  ADD COLUMN IF NOT EXISTS medium_used text,
  ADD COLUMN IF NOT EXISTS full_biography text,
  ADD COLUMN IF NOT EXISTS years_active integer,
  ADD COLUMN IF NOT EXISTS education text,
  ADD COLUMN IF NOT EXISTS exhibitions text,
  ADD COLUMN IF NOT EXISTS awards text,
  ADD COLUMN IF NOT EXISTS tags text[];

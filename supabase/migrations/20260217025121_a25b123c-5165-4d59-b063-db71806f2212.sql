
-- ========================================
-- ENHANCED ARTIST PROFILE FIELDS
-- ========================================

-- Add new columns to artists table
ALTER TABLE public.artists ADD COLUMN IF NOT EXISTS real_name text;
ALTER TABLE public.artists ADD COLUMN IF NOT EXISTS username text UNIQUE;
ALTER TABLE public.artists ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE public.artists ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE public.artists ADD COLUMN IF NOT EXISTS city text;
ALTER TABLE public.artists ADD COLUMN IF NOT EXISTS country text;
ALTER TABLE public.artists ADD COLUMN IF NOT EXISTS date_of_birth date;
ALTER TABLE public.artists ADD COLUMN IF NOT EXISTS gender text;
ALTER TABLE public.artists ADD COLUMN IF NOT EXISTS art_style text;
ALTER TABLE public.artists ADD COLUMN IF NOT EXISTS medium_used text;
ALTER TABLE public.artists ADD COLUMN IF NOT EXISTS full_biography text;
ALTER TABLE public.artists ADD COLUMN IF NOT EXISTS years_active integer;
ALTER TABLE public.artists ADD COLUMN IF NOT EXISTS education text;
ALTER TABLE public.artists ADD COLUMN IF NOT EXISTS exhibitions text;
ALTER TABLE public.artists ADD COLUMN IF NOT EXISTS awards text;
ALTER TABLE public.artists ADD COLUMN IF NOT EXISTS tags text[];

-- Social links
ALTER TABLE public.artists ADD COLUMN IF NOT EXISTS website_url text;
ALTER TABLE public.artists ADD COLUMN IF NOT EXISTS instagram_url text;
ALTER TABLE public.artists ADD COLUMN IF NOT EXISTS facebook_url text;
ALTER TABLE public.artists ADD COLUMN IF NOT EXISTS pinterest_url text;
ALTER TABLE public.artists ADD COLUMN IF NOT EXISTS tiktok_url text;
ALTER TABLE public.artists ADD COLUMN IF NOT EXISTS youtube_url text;
ALTER TABLE public.artists ADD COLUMN IF NOT EXISTS behance_url text;
ALTER TABLE public.artists ADD COLUMN IF NOT EXISTS dribbble_url text;
ALTER TABLE public.artists ADD COLUMN IF NOT EXISTS linkedin_url text;

-- ========================================
-- ENHANCED ARTWORK FIELDS
-- ========================================

ALTER TABLE public.artworks ADD COLUMN IF NOT EXISTS additional_images text[];
ALTER TABLE public.artworks ADD COLUMN IF NOT EXISTS inspiration text;
ALTER TABLE public.artworks ADD COLUMN IF NOT EXISTS certificate_url text;
ALTER TABLE public.artworks ADD COLUMN IF NOT EXISTS availability_status text NOT NULL DEFAULT 'available';
ALTER TABLE public.artworks ADD COLUMN IF NOT EXISTS views_count integer NOT NULL DEFAULT 0;
ALTER TABLE public.artworks ADD COLUMN IF NOT EXISTS likes_count integer NOT NULL DEFAULT 0;
ALTER TABLE public.artworks ADD COLUMN IF NOT EXISTS shares_count integer NOT NULL DEFAULT 0;

-- ========================================
-- COMMENTS TABLE
-- ========================================

CREATE TABLE public.comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  artwork_id uuid NOT NULL REFERENCES public.artworks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view comments" ON public.comments FOR SELECT USING (true);
CREATE POLICY "Authenticated users can add comments" ON public.comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own comments" ON public.comments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own comments" ON public.comments FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_comments_updated_at BEFORE UPDATE ON public.comments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ========================================
-- RATINGS TABLE
-- ========================================

CREATE TABLE public.ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  artwork_id uuid NOT NULL REFERENCES public.artworks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(artwork_id, user_id)
);

ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view ratings" ON public.ratings FOR SELECT USING (true);
CREATE POLICY "Authenticated users can rate" ON public.ratings FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own rating" ON public.ratings FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own rating" ON public.ratings FOR DELETE USING (auth.uid() = user_id);

-- ========================================
-- MESSAGES TABLE (Contact Artist)
-- ========================================

CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL,
  recipient_id uuid NOT NULL,
  artwork_id uuid REFERENCES public.artworks(id) ON DELETE SET NULL,
  subject text,
  content text NOT NULL,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own messages" ON public.messages FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = recipient_id);
CREATE POLICY "Authenticated users can send messages" ON public.messages FOR INSERT TO authenticated WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "Recipients can mark as read" ON public.messages FOR UPDATE USING (auth.uid() = recipient_id);
CREATE POLICY "Users can delete own sent messages" ON public.messages FOR DELETE USING (auth.uid() = sender_id);

-- ========================================
-- LIKES TABLE (separate from favorites)
-- ========================================

CREATE TABLE public.likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  artwork_id uuid NOT NULL REFERENCES public.artworks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(artwork_id, user_id)
);

ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view likes" ON public.likes FOR SELECT USING (true);
CREATE POLICY "Authenticated users can like" ON public.likes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unlike" ON public.likes FOR DELETE USING (auth.uid() = user_id);

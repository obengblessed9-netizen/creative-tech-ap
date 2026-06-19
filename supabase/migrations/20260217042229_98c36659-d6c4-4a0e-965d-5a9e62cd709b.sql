
-- Featured Artists table (admin selects featured artist of the month)
CREATE TABLE public.featured_artists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  artist_id UUID NOT NULL REFERENCES public.artists(id) ON DELETE CASCADE,
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  title TEXT NOT NULL DEFAULT 'Featured Artist of the Month',
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID,
  UNIQUE(month, year)
);

ALTER TABLE public.featured_artists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view featured artists" ON public.featured_artists FOR SELECT USING (true);
CREATE POLICY "Admins can manage featured artists" ON public.featured_artists FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Blog Posts table
CREATE TABLE public.blog_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  author_id UUID NOT NULL,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  excerpt TEXT,
  content TEXT NOT NULL,
  cover_image_url TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  tags TEXT[] DEFAULT '{}',
  published BOOLEAN NOT NULL DEFAULT false,
  published_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  views_count INTEGER NOT NULL DEFAULT 0,
  likes_count INTEGER NOT NULL DEFAULT 0
);

ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view published posts" ON public.blog_posts FOR SELECT USING (published = true);
CREATE POLICY "Authors can view own drafts" ON public.blog_posts FOR SELECT USING (auth.uid() = author_id);
CREATE POLICY "Authenticated users can create posts" ON public.blog_posts FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Authors can update own posts" ON public.blog_posts FOR UPDATE USING (auth.uid() = author_id);
CREATE POLICY "Authors can delete own posts" ON public.blog_posts FOR DELETE USING (auth.uid() = author_id);
CREATE POLICY "Admins can manage all posts" ON public.blog_posts FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Auctions table
CREATE TABLE public.auctions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  artwork_id UUID NOT NULL REFERENCES public.artworks(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL,
  starting_price NUMERIC NOT NULL DEFAULT 0,
  reserve_price NUMERIC,
  current_bid NUMERIC NOT NULL DEFAULT 0,
  bid_count INTEGER NOT NULL DEFAULT 0,
  starts_at TIMESTAMP WITH TIME ZONE NOT NULL,
  ends_at TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL DEFAULT 'upcoming',
  winner_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.auctions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view auctions" ON public.auctions FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create auctions" ON public.auctions FOR INSERT WITH CHECK (auth.uid() = seller_id);
CREATE POLICY "Sellers can update own auctions" ON public.auctions FOR UPDATE USING (auth.uid() = seller_id);
CREATE POLICY "Admins can manage auctions" ON public.auctions FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Bids table
CREATE TABLE public.bids (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  auction_id UUID NOT NULL REFERENCES public.auctions(id) ON DELETE CASCADE,
  bidder_id UUID NOT NULL,
  amount NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.bids ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view bids" ON public.bids FOR SELECT USING (true);
CREATE POLICY "Authenticated users can place bids" ON public.bids FOR INSERT WITH CHECK (auth.uid() = bidder_id);

-- AI Art Detection results table
CREATE TABLE public.art_detection_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  artwork_id UUID REFERENCES public.artworks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  image_url TEXT NOT NULL,
  is_ai_generated BOOLEAN,
  confidence_score NUMERIC,
  analysis_details JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.art_detection_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own detection results" ON public.art_detection_results FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create detection results" ON public.art_detection_results FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can view all results" ON public.art_detection_results FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

-- Enable realtime for auctions and bids
ALTER PUBLICATION supabase_realtime ADD TABLE public.auctions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.bids;

-- Update trigger for blog_posts
CREATE TRIGGER update_blog_posts_updated_at BEFORE UPDATE ON public.blog_posts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_auctions_updated_at BEFORE UPDATE ON public.auctions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

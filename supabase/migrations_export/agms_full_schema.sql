-- ============================================================
-- AGMS — Full Secured Schema Export
-- Single runnable migration recreating tables, functions, RLS,
-- storage buckets, and policies for the AGMS platform.
-- Run on a fresh Supabase project. Idempotent where possible.
-- ============================================================

-- ============ EXTENSIONS ============
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============ ENUMS ============
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'staff', 'user');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============ HELPER: updated_at trigger ============
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- ============ CORE TABLES ============

-- profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  display_name text,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- user_roles
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL DEFAULT 'user',
  UNIQUE (user_id, role)
);

-- artists
CREATE TABLE IF NOT EXISTS public.artists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  name text NOT NULL,
  real_name text, username text, email text, phone text,
  city text, country text, gender text, date_of_birth date,
  bio text, full_biography text, specialty text,
  art_style text, medium_used text,
  years_active integer, education text, exhibitions text, awards text,
  tags text[], image_url text,
  website_url text, instagram_url text, facebook_url text, pinterest_url text,
  tiktok_url text, youtube_url text, behance_url text, dribbble_url text, linkedin_url text,
  verified boolean NOT NULL DEFAULT false,
  verification_status text NOT NULL DEFAULT 'none',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- artworks
CREATE TABLE IF NOT EXISTS public.artworks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id uuid,
  title text NOT NULL,
  description text, inspiration text,
  price numeric NOT NULL DEFAULT 0,
  medium text, dimensions text, year integer, category text,
  image_url text, additional_images text[], certificate_url text,
  available boolean NOT NULL DEFAULT true,
  availability_status text NOT NULL DEFAULT 'available',
  views_count integer NOT NULL DEFAULT 0,
  likes_count integer NOT NULL DEFAULT 0,
  shares_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- clients (CRM)
CREATE TABLE IF NOT EXISTS public.clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid,
  name text NOT NULL,
  email text, phone text, address text, city text, country text,
  notes text, tags text[] DEFAULT '{}',
  total_spent numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- sales
CREATE TABLE IF NOT EXISTS public.sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid,
  artwork_id uuid,
  client_id uuid,
  amount numeric NOT NULL DEFAULT 0,
  payment_method text NOT NULL DEFAULT 'cash',
  status text NOT NULL DEFAULT 'completed',
  notes text,
  sale_date timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- gallery_events
CREATE TABLE IF NOT EXISTS public.gallery_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid,
  title text NOT NULL,
  description text, location text, cover_image_url text,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz,
  capacity integer,
  status text NOT NULL DEFAULT 'upcoming',
  published boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- event_attendees
CREATE TABLE IF NOT EXISTS public.event_attendees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL,
  user_id uuid,
  client_id uuid,
  name text, email text,
  status text NOT NULL DEFAULT 'registered',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- followers
CREATE TABLE IF NOT EXISTS public.followers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id uuid NOT NULL,
  follower_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (artist_id, follower_id)
);

-- artist_ratings
CREATE TABLE IF NOT EXISTS public.artist_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id uuid NOT NULL,
  user_id uuid NOT NULL,
  rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  review text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (artist_id, user_id)
);

-- featured_artists
CREATE TABLE IF NOT EXISTS public.featured_artists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id uuid NOT NULL,
  created_by uuid,
  month integer NOT NULL,
  year integer NOT NULL,
  title text NOT NULL DEFAULT 'Featured Artist of the Month',
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- admin_audit_log
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid NOT NULL,
  action text NOT NULL,
  target_type text NOT NULL,
  target_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============ TIMESTAMP TRIGGERS ============
DO $$ DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'profiles','artists','artworks','clients','sales',
    'gallery_events','artist_ratings'
  ]) LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS set_updated_at ON public.%I;
       CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.%I
       FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();', t, t);
  END LOOP;
END $$;

-- ============ SECURITY DEFINER HELPERS ============
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.is_staff_or_admin(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('admin'::public.app_role,'staff'::public.app_role)
  )
$$;

-- Auto-create profile + default role for new auth users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email));
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Secure paginated followers RPC (artist-owner / admin only)
CREATE OR REPLACE FUNCTION public.get_artist_followers(
  _artist_id uuid, _limit integer DEFAULT 20, _offset integer DEFAULT 0
)
RETURNS TABLE(
  follower_id uuid, display_name text, email text,
  avatar_url text, followed_at timestamptz, total_count bigint
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.artists a
    WHERE a.id = _artist_id
      AND (a.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::public.app_role))
  ) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  RETURN QUERY
  WITH total AS (SELECT count(*)::bigint AS c FROM public.followers WHERE artist_id = _artist_id)
  SELECT f.follower_id, p.display_name, u.email::text, p.avatar_url, f.created_at,
         (SELECT c FROM total)
  FROM public.followers f
  LEFT JOIN public.profiles p ON p.user_id = f.follower_id
  LEFT JOIN auth.users u ON u.id = f.follower_id
  WHERE f.artist_id = _artist_id
  ORDER BY f.created_at DESC
  LIMIT GREATEST(_limit, 1) OFFSET GREATEST(_offset, 0);
END; $$;

GRANT EXECUTE ON FUNCTION public.get_artist_followers(uuid, integer, integer) TO authenticated;

-- ============ ENABLE RLS ============
ALTER TABLE public.profiles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.artists           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.artworks          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gallery_events    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_attendees   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.followers         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.artist_ratings    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.featured_artists  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_log   ENABLE ROW LEVEL SECURITY;

-- ============ RLS POLICIES ============

-- profiles: public read, self insert/update
CREATE POLICY "Profiles viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- user_roles: admin manages, users read own
CREATE POLICY "Admins can manage all roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Users can read own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- artists
CREATE POLICY "Artists viewable by everyone" ON public.artists FOR SELECT USING (true);
CREATE POLICY "Users can create own artist profile" ON public.artists FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Artists can update own profile" ON public.artists FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can manage artists" ON public.artists FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- artworks
CREATE POLICY "Artworks viewable by everyone" ON public.artworks FOR SELECT USING (true);
CREATE POLICY "Authenticated users can submit artworks" ON public.artworks FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Admins can manage artworks" ON public.artworks FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- clients (staff/admin only)
CREATE POLICY "Staff/Admin manage clients" ON public.clients FOR ALL TO authenticated
  USING (public.is_staff_or_admin(auth.uid())) WITH CHECK (public.is_staff_or_admin(auth.uid()));

-- sales (staff/admin only)
CREATE POLICY "Staff/Admin manage sales" ON public.sales FOR ALL TO authenticated
  USING (public.is_staff_or_admin(auth.uid())) WITH CHECK (public.is_staff_or_admin(auth.uid()));

-- gallery_events
CREATE POLICY "Anyone views published events" ON public.gallery_events FOR SELECT USING (published = true);
CREATE POLICY "Staff/Admin manage events" ON public.gallery_events FOR ALL TO authenticated
  USING (public.is_staff_or_admin(auth.uid())) WITH CHECK (public.is_staff_or_admin(auth.uid()));

-- event_attendees
CREATE POLICY "Users register self" ON public.event_attendees FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users view own registrations" ON public.event_attendees FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Staff/Admin manage attendees" ON public.event_attendees FOR ALL TO authenticated
  USING (public.is_staff_or_admin(auth.uid())) WITH CHECK (public.is_staff_or_admin(auth.uid()));

-- followers
-- Aggregate counts only (no PII): keep public SELECT, but identity comes via RPC.
CREATE POLICY "Anyone can view follower counts" ON public.followers FOR SELECT USING (true);
CREATE POLICY "Artists can view their followers" ON public.followers FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.artists a WHERE a.id = followers.artist_id AND a.user_id = auth.uid()));
CREATE POLICY "Users can follow artists" ON public.followers FOR INSERT TO authenticated WITH CHECK (auth.uid() = follower_id);
CREATE POLICY "Users can unfollow artists" ON public.followers FOR DELETE TO authenticated USING (auth.uid() = follower_id);

-- artist_ratings
CREATE POLICY "Anyone views artist ratings" ON public.artist_ratings FOR SELECT USING (true);
CREATE POLICY "Auth users rate artists" ON public.artist_ratings FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own artist rating" ON public.artist_ratings FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users delete own artist rating" ON public.artist_ratings FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- featured_artists
CREATE POLICY "Anyone can view featured artists" ON public.featured_artists FOR SELECT USING (true);
CREATE POLICY "Admins can manage featured artists" ON public.featured_artists FOR ALL USING (public.has_role(auth.uid(),'admin'));

-- admin_audit_log
CREATE POLICY "Admins view audit log" ON public.admin_audit_log FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins insert audit log" ON public.admin_audit_log FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin') AND auth.uid() = actor_id);

-- ============ STORAGE BUCKETS ============
INSERT INTO storage.buckets (id, name, public) VALUES
  ('artwork-images',   'artwork-images',   true),
  ('profile-pictures', 'profile-pictures', true),
  ('verification-docs','verification-docs',false)
ON CONFLICT (id) DO NOTHING;

-- Public buckets: read via public URL works without listing policies.
-- Authenticated users can upload to their own folder.
CREATE POLICY "Users upload own artwork images" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'artwork-images' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users upload own profile pictures" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'profile-pictures' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Verification docs: private; only owner + admins can read.
CREATE POLICY "Owners read own verification docs" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'verification-docs' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Admins read verification docs" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'verification-docs' AND public.has_role(auth.uid(),'admin'));
CREATE POLICY "Owners upload verification docs" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'verification-docs' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ============ REVOKE ANON FROM SENSITIVE TABLES ============
REVOKE SELECT ON public.clients, public.sales, public.event_attendees,
  public.admin_audit_log, public.user_roles FROM anon;

-- ============ ANALYTICS VIEWS (optional convenience) ============
CREATE OR REPLACE VIEW public.v_sales_report AS
  SELECT s.id, s.sale_date, s.amount, s.payment_method, s.status,
         c.name AS client_name, a.title AS artwork_title
  FROM public.sales s
  LEFT JOIN public.clients  c ON c.id = s.client_id
  LEFT JOIN public.artworks a ON a.id = s.artwork_id;

CREATE OR REPLACE VIEW public.v_artist_stats AS
  SELECT ar.id AS artist_id, ar.name,
         COALESCE((SELECT count(*) FROM public.followers f WHERE f.artist_id = ar.id), 0) AS followers,
         COALESCE((SELECT avg(rating)::numeric(3,2) FROM public.artist_ratings r WHERE r.artist_id = ar.id), 0) AS avg_rating,
         COALESCE((SELECT count(*) FROM public.artworks aw WHERE aw.artist_id = ar.id), 0) AS artworks
  FROM public.artists ar;

-- ============ END ============

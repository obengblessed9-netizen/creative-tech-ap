-- Add is_trending column to artworks table
ALTER TABLE public.artworks
ADD COLUMN is_trending BOOLEAN NOT NULL DEFAULT false;

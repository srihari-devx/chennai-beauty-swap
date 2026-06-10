-- =============================================
-- Articles table for admin-only blog posts
-- Run this in Supabase Dashboard → SQL Editor
-- =============================================

CREATE TABLE IF NOT EXISTS public.articles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  excerpt TEXT,
  category TEXT DEFAULT 'general',
  cover_image_url TEXT,
  is_published BOOLEAN DEFAULT false,
  author_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;

-- Anyone can read published articles
DROP POLICY IF EXISTS "Anyone can read published articles" ON public.articles;
CREATE POLICY "Anyone can read published articles"
  ON public.articles FOR SELECT
  USING (is_published = true);

-- Admins can also read unpublished articles
DROP POLICY IF EXISTS "Admins can read all articles" ON public.articles;
CREATE POLICY "Admins can read all articles"
  ON public.articles FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- Only admins can insert articles
DROP POLICY IF EXISTS "Admins can insert articles" ON public.articles;
CREATE POLICY "Admins can insert articles"
  ON public.articles FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- Only admins can update articles
DROP POLICY IF EXISTS "Admins can update articles" ON public.articles;
CREATE POLICY "Admins can update articles"
  ON public.articles FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- Only admins can delete articles
DROP POLICY IF EXISTS "Admins can delete articles" ON public.articles;
CREATE POLICY "Admins can delete articles"
  ON public.articles FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );


-- =============================================================
-- Migration: Influencer Referral System
-- Creates influencers + referral_clicks tables with RLS
-- =============================================================

-- 1. Influencers table
CREATE TABLE IF NOT EXISTS public.influencers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL,
  referral_code text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),

  -- Each user can only be one influencer
  CONSTRAINT influencers_user_id_unique UNIQUE (user_id),
  -- Slug must be unique and lowercase alphanumeric + hyphens
  CONSTRAINT influencers_slug_unique UNIQUE (slug),
  CONSTRAINT influencers_slug_format CHECK (slug ~ '^[a-z0-9][a-z0-9-]*[a-z0-9]$' OR slug ~ '^[a-z0-9]$'),
  -- Referral code must be unique
  CONSTRAINT influencers_referral_code_unique UNIQUE (referral_code),
  -- Status must be valid
  CONSTRAINT influencers_status_check CHECK (status IN ('active', 'inactive'))
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_influencers_slug ON public.influencers (slug);
CREATE INDEX IF NOT EXISTS idx_influencers_user_id ON public.influencers (user_id);

-- 2. Referral clicks table
CREATE TABLE IF NOT EXISTS public.referral_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  influencer_id uuid NOT NULL REFERENCES public.influencers(id) ON DELETE CASCADE,
  clicked_at timestamptz NOT NULL DEFAULT now(),
  referral_source text DEFAULT 'direct',
  user_agent text,

  -- Source must be a known value
  CONSTRAINT referral_clicks_source_check CHECK (
    referral_source IN ('instagram', 'youtube', 'whatsapp', 'facebook', 'direct')
  )
);

-- Index for querying clicks by influencer
CREATE INDEX IF NOT EXISTS idx_referral_clicks_influencer_id ON public.referral_clicks (influencer_id);
CREATE INDEX IF NOT EXISTS idx_referral_clicks_clicked_at ON public.referral_clicks (clicked_at DESC);

-- =============================================================
-- RLS Policies
-- =============================================================

ALTER TABLE public.influencers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_clicks ENABLE ROW LEVEL SECURITY;

-- Influencers: anyone can read (needed for slug lookup on public referral URLs)
CREATE POLICY "influencers_public_read"
  ON public.influencers FOR SELECT
  USING (true);

-- Influencers: only admins can insert
CREATE POLICY "influencers_admin_insert"
  ON public.influencers FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role = 'admin'
    )
  );

-- Influencers: only admins can update
CREATE POLICY "influencers_admin_update"
  ON public.influencers FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role = 'admin'
    )
  );

-- Influencers: only admins can delete
CREATE POLICY "influencers_admin_delete"
  ON public.influencers FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role = 'admin'
    )
  );

-- Referral clicks: anyone can insert (visitors clicking referral links)
CREATE POLICY "referral_clicks_public_insert"
  ON public.referral_clicks FOR INSERT
  WITH CHECK (true);

-- Referral clicks: influencers can read their own clicks, admins can read all
CREATE POLICY "referral_clicks_owner_read"
  ON public.referral_clicks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.influencers
      WHERE influencers.id = referral_clicks.influencer_id
        AND influencers.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role = 'admin'
    )
  );

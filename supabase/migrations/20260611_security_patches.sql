-- ============================================================
-- SECURITY PATCHES — Run in Supabase Dashboard SQL Editor
-- Covers: H-2, H-5, L-3, M-1 (DB side), C-3 schema changes
-- ============================================================

-- ─── H-5: Fix admin_delete_user search_path ───
-- Remove 'auth' from search_path to prevent privilege escalation
CREATE OR REPLACE FUNCTION admin_delete_user(target_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public   -- H-5: Only 'public', use full path for auth schema
AS $$
DECLARE
  is_admin BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  ) INTO is_admin;

  IF NOT is_admin THEN
    RAISE EXCEPTION 'Unauthorized: Only admins can permanently delete users.';
  END IF;

  DELETE FROM auth.users WHERE id = target_user_id;
END;
$$;


-- ─── H-2: Fix storage policies to enforce file ownership ───
DROP POLICY IF EXISTS "Users can update own product images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own product images" ON storage.objects;

CREATE POLICY "Users can update own product images"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'product-images'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can delete own product images"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'product-images'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  );


-- ─── L-3: Restrict profiles visibility to authenticated users only ───
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;

CREATE POLICY "Profiles are viewable by authenticated users"
  ON public.profiles FOR SELECT
  USING (auth.uid() IS NOT NULL);


-- ─── C-3 + M-1: OTP table schema — hash storage + rate limiting ───
-- Add otp_hash column (hashed OTP), rename old plaintext column if needed
DO $$
BEGIN
  -- Add otp_hash column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'otp_verifications' AND column_name = 'otp_hash'
  ) THEN
    -- If old plaintext 'otp' column exists, rename it
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'otp_verifications' AND column_name = 'otp'
    ) THEN
      ALTER TABLE otp_verifications RENAME COLUMN otp TO otp_hash;
    ELSE
      ALTER TABLE otp_verifications ADD COLUMN otp_hash TEXT NOT NULL DEFAULT '';
    END IF;
  END IF;

  -- Add failed_attempts column for brute-force protection
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'otp_verifications' AND column_name = 'failed_attempts'
  ) THEN
    ALTER TABLE otp_verifications ADD COLUMN failed_attempts INTEGER NOT NULL DEFAULT 0;
  END IF;
END $$;


-- ─── M-2: Add length constraints to products table ───
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'products') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'products_brand_length') THEN
      ALTER TABLE public.products ADD CONSTRAINT products_brand_length CHECK (char_length(brand) <= 100);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'products_name_length') THEN
      ALTER TABLE public.products ADD CONSTRAINT products_name_length CHECK (char_length(name) <= 200);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'products_reason_length') THEN
      ALTER TABLE public.products ADD CONSTRAINT products_reason_length CHECK (char_length(reason_for_selling) <= 1000);
    END IF;
  END IF;
END $$;

-- ─── M-2: Add length constraints to articles table (if it exists) ───
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'articles') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'articles_title_length') THEN
      ALTER TABLE public.articles ADD CONSTRAINT articles_title_length CHECK (char_length(title) <= 300);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'articles_excerpt_length') THEN
      ALTER TABLE public.articles ADD CONSTRAINT articles_excerpt_length CHECK (char_length(excerpt) <= 500);
    END IF;
  ELSE
    RAISE NOTICE 'articles table not found — skipping constraints. Run 20260418_create_articles_table.sql first.';
  END IF;
END $$;

-- ─── M-2: Add length constraints to feedback table (if it exists) ───
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'feedback') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'feedback_name_length') THEN
      ALTER TABLE public.feedback ADD CONSTRAINT feedback_name_length CHECK (char_length(name) <= 100);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'feedback_message_length') THEN
      ALTER TABLE public.feedback ADD CONSTRAINT feedback_message_length CHECK (char_length(message) <= 2000);
    END IF;
  ELSE
    RAISE NOTICE 'feedback table not found — skipping constraints. Run 20250608_create_feedback_newsletter.sql first.';
  END IF;
END $$;

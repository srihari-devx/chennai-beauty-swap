-- =============================================
-- SECURITY FIX: admin_delete_user function
-- Run in Supabase Dashboard SQL Editor
-- =============================================

-- H-5 FIX: Removed 'auth' from search_path in SECURITY DEFINER function.
-- Using fully-qualified schema paths (auth.users, auth.uid()) instead.
-- H-2 FIX: Fixed storage policies to enforce file ownership via folder path.
-- L-3 FIX: Restrict profiles SELECT to authenticated users only.

-- ─── H-5: Fix admin_delete_user search_path ───
CREATE OR REPLACE FUNCTION admin_delete_user(target_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public  -- H-5: removed 'auth' from search_path — use full schema path below
AS $$
DECLARE
  is_admin BOOLEAN;
BEGIN
  -- 1. Check if the user executing this function has the 'admin' role
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  ) INTO is_admin;

  -- If not an admin, immediately fail
  IF NOT is_admin THEN
    RAISE EXCEPTION 'Unauthorized: Only admins can permanently delete users.';
  END IF;

  -- 2. Delete the user from the protected auth.users schema (full schema reference)
  DELETE FROM auth.users WHERE id = target_user_id;

END;
$$;

-- ─── H-2: Fix storage policies — enforce file ownership via folder path ───
-- Drop the insecure policies first
DROP POLICY IF EXISTS "Users can update own product images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own product images" ON storage.objects;

-- Recreate with proper ownership check: files stored as userId/filename
-- so the first folder segment must match the authenticated user's UUID
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

-- ─── L-3: Restrict profiles SELECT to authenticated users ───
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;

CREATE POLICY "Profiles are viewable by authenticated users"
  ON public.profiles FOR SELECT
  USING (auth.uid() IS NOT NULL);

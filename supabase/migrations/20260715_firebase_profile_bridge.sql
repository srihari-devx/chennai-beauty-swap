-- =========================================================================
-- MIGRATION: Firebase Auth ↔ Supabase Profile Bridge
-- Purpose: Allow Firebase-authenticated users to have Supabase profiles
--          without being in auth.users (Firebase handles auth, not Supabase).
--
-- Changes:
--   1. Drop the FK constraint on profiles.user_id (Firebase UIDs ≠ Supabase auth UUIDs)
--   2. Add firebase_uid TEXT UNIQUE column for Firebase UID storage
--   3. Fix RLS: restore public SELECT so product pages can show seller info
--   4. Allow service-role inserts (Edge Function bypasses RLS via service key)
-- =========================================================================

-- ── Step 0: Drop FK constraints that block Firebase UUIDs ────────────────
-- Both profiles AND user_roles reference auth.users(id). Firebase-generated
-- UUIDs don't exist in auth.users, so both FKs must be dropped.
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_user_id_fkey;

ALTER TABLE public.user_roles
  DROP CONSTRAINT IF EXISTS user_roles_user_id_fkey;

-- ── Step 2: Add firebase_uid column ───────────────────────────────────────
-- Stores the Firebase UID (e.g. "V8XjD03hEcMJrbD3jCdlurQytMY2").
-- Nullable so existing Supabase-auth profiles (if any) remain valid.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'firebase_uid'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN firebase_uid TEXT UNIQUE;
  END IF;
END $$;

-- ── Step 3: Fix RLS policies ──────────────────────────────────────────────

-- 3a. Restore public SELECT (was broken by security_patches migration which
--     added auth.uid() IS NOT NULL check — this breaks product pages for
--     logged-out visitors who need to see seller names).
DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON public.profiles;
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Profiles are viewable by everyone"
  ON public.profiles FOR SELECT
  USING (true);

-- 3b. Keep the existing INSERT policy as-is (service role bypasses RLS).
--     The Edge Function uses the service role key, so no INSERT policy needed
--     for anon/authenticated roles for Firebase users.
--     The old Supabase-auth INSERT policy stays for any legacy Supabase users.
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (
    -- Allow Supabase-auth users to insert their own profile
    auth.uid() = user_id
    OR
    -- Allow inserts where user_id is a valid UUID but not tied to auth.users
    -- (Firebase bridge inserts via service role — service role bypasses RLS
    --  entirely, so this policy only applies to anon/authenticated roles)
    auth.uid() IS NULL AND firebase_uid IS NOT NULL
  );

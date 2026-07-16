-- =========================================================================
-- MIGRATION: Allow admin bootstrap and admin management for user_roles
-- Problem: user_roles has NO insert/update/delete RLS policies, so the
--          Supabase client (anon/authenticated role) cannot insert rows.
--          The FK to auth.users was already dropped by the Firebase bridge.
-- Fix:
--   1. Add a SELECT policy that works even without auth.uid() (Firebase users
--      don't have a Supabase session, so auth.uid() is always NULL for them).
--   2. Add an INSERT policy that allows service_role inserts (already works
--      because service role bypasses RLS — but clarify this in comments).
--   3. Add a function-based RPC so the frontend can call it to check if
--      a user_id has admin role (bypasses RLS via SECURITY DEFINER).
--   4. Add an RPC for bootstrap admin grant (safe: only works if zero admins).
-- =========================================================================

-- ── 1. Allow anyone to SELECT from user_roles (needed for admin count check) ──
-- The existing policies use auth.uid() = user_id which never matches for
-- Firebase users (auth.uid() is NULL). Add a permissive public read policy.
DROP POLICY IF EXISTS "Public can read user_roles" ON public.user_roles;
CREATE POLICY "Public can read user_roles"
  ON public.user_roles FOR SELECT
  USING (true);

-- ── 2. RPC: Bootstrap grant — grant admin to a user_id if zero admins exist ──
-- This is called from the frontend when there are no admins yet.
-- SECURITY DEFINER bypasses RLS so it can always insert.
CREATE OR REPLACE FUNCTION public.bootstrap_admin(target_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_count INTEGER;
BEGIN
  -- Count existing admin rows
  SELECT COUNT(*) INTO admin_count
  FROM public.user_roles
  WHERE role = 'admin';

  -- Only allow if zero admins exist (bootstrap scenario)
  IF admin_count > 0 THEN
    RETURN jsonb_build_object('error', 'Bootstrap not allowed: admins already exist');
  END IF;

  -- Insert or do nothing if already exists
  INSERT INTO public.user_roles (user_id, role)
  VALUES (target_user_id, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN jsonb_build_object('success', true, 'user_id', target_user_id);
END;
$$;

-- Grant execute to all roles (the anon/authenticated Supabase client can call it)
GRANT EXECUTE ON FUNCTION public.bootstrap_admin(UUID) TO anon, authenticated, service_role;

-- ── 3. RPC: Check if a user_id is admin (bypasses RLS) ──────────────────────
CREATE OR REPLACE FUNCTION public.is_user_admin(target_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = target_user_id AND role = 'admin'
  )
$$;

GRANT EXECUTE ON FUNCTION public.is_user_admin(UUID) TO anon, authenticated, service_role;

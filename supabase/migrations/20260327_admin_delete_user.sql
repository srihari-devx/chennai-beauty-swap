-- Helper function to allow admins to permanently delete users from auth.users
-- Since Edge Functions CLI deploy is problematic, you can run this block directly
-- inside the Supabase Dashboard SQL Editor (https://supabase.com/dashboard/project/_/sql)

CREATE OR REPLACE FUNCTION admin_delete_user(target_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  is_admin BOOLEAN;
BEGIN
  -- 1. Check if the user executing this function has the 'admin' role
  SELECT EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  ) INTO is_admin;
  
  -- If not an admin, immediately fail
  IF NOT is_admin THEN
    RAISE EXCEPTION 'Unauthorized: Only admins can permanently delete users.';
  END IF;

  -- 2. Delete the user from the protected auth.users schema
  -- (All related data in the public schema should cascade or be handled by the frontend before this)
  DELETE FROM auth.users WHERE id = target_user_id;

END;
$$;

-- Grant admin role to 2005srihari@gmail.com
-- This migration finds the user by email in auth.users and inserts/updates
-- their role in public.user_roles to 'admin'.

DO $$
DECLARE
  target_user_id uuid;
BEGIN
  -- Look up the user by email
  SELECT id INTO target_user_id
  FROM auth.users
  WHERE email = '2005srihari@gmail.com'
  LIMIT 1;

  IF target_user_id IS NULL THEN
    RAISE NOTICE 'User 2005srihari@gmail.com not found in auth.users. They must sign up first.';
  ELSE
    -- Upsert the admin role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (target_user_id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;

    RAISE NOTICE 'Admin role granted to user % (2005srihari@gmail.com)', target_user_id;
  END IF;
END;
$$;

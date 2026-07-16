-- =========================================================================
-- MIGRATION: Grant admin role to 2005srihari@gmail.com
-- =========================================================================
-- This inserts an admin role record for the user whose Supabase profile
-- was created for the Firebase account with email 2005srihari@gmail.com.
-- 
-- The profiles table does NOT store email directly (email is in Firebase).
-- We look up the profile by firebase_uid.
-- 
-- HOW TO USE:
--   Option A — Run in Supabase SQL Editor (Dashboard → SQL Editor):
--     Paste and execute this file.
--
--   Option B — If you know the firebase_uid of 2005srihari@gmail.com,
--     replace 'FIREBASE_UID_HERE' below with the actual Firebase UID.
-- =========================================================================

-- First, ensure the user_roles FK constraint is dropped (done in previous migration).
-- This prevents errors when user_id is not in auth.users.

-- Grant admin by looking up profile using firebase_uid
-- Replace 'FIREBASE_UID_HERE' with the actual Firebase UID for 2005srihari@gmail.com
-- You can find the Firebase UID in the Firebase Console → Authentication → Users

-- Option 1: Insert by firebase_uid (recommended if you know it)
-- INSERT INTO public.user_roles (user_id, role)
-- SELECT user_id, 'admin'::public.app_role
-- FROM public.profiles
-- WHERE firebase_uid = 'FIREBASE_UID_HERE'
-- ON CONFLICT (user_id, role) DO NOTHING;

-- Option 2: Insert by full_name (use if name is known and unique)
-- INSERT INTO public.user_roles (user_id, role)
-- SELECT user_id, 'admin'::public.app_role
-- FROM public.profiles
-- WHERE full_name ILIKE '%srihari%'
-- ON CONFLICT (user_id, role) DO NOTHING;

-- Option 3 (EASIEST): Run this query FIRST to find your user_id,
-- then use it in Option 4.
--   SELECT id, user_id, firebase_uid, full_name FROM public.profiles
--   ORDER BY created_at DESC LIMIT 10;

-- Option 4: Direct insert once you know the user_id UUID
-- INSERT INTO public.user_roles (user_id, role)
-- VALUES ('<paste-user_id-UUID-here>', 'admin'::public.app_role)
-- ON CONFLICT (user_id, role) DO NOTHING;

-- ─── AUTOMATED: Grant admin to ALL profiles created for 2005srihari@gmail.com ─
-- The firebase-profile edge function stores the email prefix as full_name if no
-- display name is set. We use the most recently created profile as a fallback.
-- If you have only one account, this will correctly grant you admin access.
DO $$
DECLARE
  target_user_id UUID;
BEGIN
  -- Try to find by full_name containing 'srihari' (case-insensitive)
  SELECT user_id INTO target_user_id
  FROM public.profiles
  WHERE full_name ILIKE '%srihari%'
  ORDER BY created_at ASC
  LIMIT 1;

  IF target_user_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (target_user_id, 'admin'::public.app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
    
    RAISE NOTICE 'Admin role granted to user_id: %', target_user_id;
  ELSE
    RAISE NOTICE 'No profile found with name containing "srihari". Please run Option 3 above to find your user_id and use Option 4.';
  END IF;
END $$;

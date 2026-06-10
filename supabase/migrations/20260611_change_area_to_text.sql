-- =========================================================================
-- DATABASE MIGRATION: Convert area columns from public.chennai_area (enum) to TEXT
-- Run this in the Supabase Dashboard SQL Editor to allow arbitrary place inputs
-- =========================================================================

-- 1. Remove column default constraints temporarily
ALTER TABLE public.profiles ALTER COLUMN area DROP DEFAULT;
ALTER TABLE public.products ALTER COLUMN area DROP DEFAULT;

-- 2. Alter column types to TEXT to support arbitrary free text
ALTER TABLE public.profiles ALTER COLUMN area TYPE text USING area::text;
ALTER TABLE public.products ALTER COLUMN area TYPE text USING area::text;

-- 3. Set new defaults to empty string
ALTER TABLE public.profiles ALTER COLUMN area SET DEFAULT '';
ALTER TABLE public.products ALTER COLUMN area SET DEFAULT '';

-- 4. Update the handle_new_user trigger function to remove cast to public.chennai_area
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, area, gender)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    COALESCE(NEW.raw_user_meta_data->>'area', ''),
    COALESCE(NEW.raw_user_meta_data->>'gender', 'female')
  );
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  RETURN NEW;
END;
$function$;

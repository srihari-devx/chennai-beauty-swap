-- ============================================================
-- SECURITY HARDENING MIGRATION
-- Addresses audit findings #7, #11, #19, and notification/badge policies
-- Run in Supabase Dashboard SQL Editor AFTER all previous migrations
-- ============================================================

-- ═══════════════════════════════════════════════════════════
-- FIX #7: Restrict user_roles visibility
-- Problem: "Admins can view all roles" policy used USING(true) 
-- effectively via has_role check, but "Users can view own roles"
-- plus the admin policy means non-admins can still probe.
-- Fix: Ensure only own-role reads for regular users, admin-only for all.
-- ═══════════════════════════════════════════════════════════

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Public can read user_roles" ON public.user_roles;

-- Users can ONLY see their own role entries
CREATE POLICY "Users can view own roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Admins can view all roles (for admin dashboard)
CREATE POLICY "Admins can view all roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Admins can insert/update/delete roles
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
CREATE POLICY "Admins can manage roles"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Anon/public cannot see roles at all (RLS is enabled, no anon policy = denied)


-- ═══════════════════════════════════════════════════════════
-- FIX #11: Atomic admin user deletion (server-side cascade)
-- Problem: Admin.tsx performs 15+ sequential client-side deletes
-- Fix: Single SECURITY DEFINER function handles everything atomically
-- ═══════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.admin_delete_user_cascade(target_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_admin BOOLEAN;
  product_ids UUID[];
  chat_ids UUID[];
  deleted_counts JSONB;
BEGIN
  -- 1. Verify caller is admin
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  ) INTO is_admin;

  IF NOT is_admin THEN
    RAISE EXCEPTION 'Unauthorized: Only admins can delete users.';
  END IF;

  -- 2. Prevent self-deletion
  IF auth.uid() = target_user_id THEN
    RAISE EXCEPTION 'Cannot delete your own account via admin panel.';
  END IF;

  -- 3. Collect product IDs for cascading
  SELECT ARRAY_AGG(id) INTO product_ids
  FROM public.products
  WHERE seller_id = target_user_id;

  -- 4. Delete product-related data
  IF product_ids IS NOT NULL AND array_length(product_ids, 1) > 0 THEN
    DELETE FROM public.product_views WHERE product_id = ANY(product_ids);
    DELETE FROM public.product_reports WHERE product_id = ANY(product_ids);
    DELETE FROM public.wishlists WHERE product_id = ANY(product_ids);

    -- Delete chats and messages for user's products
    SELECT ARRAY_AGG(id) INTO chat_ids
    FROM public.chats
    WHERE product_id = ANY(product_ids);

    IF chat_ids IS NOT NULL AND array_length(chat_ids, 1) > 0 THEN
      DELETE FROM public.messages WHERE chat_id = ANY(chat_ids);
    END IF;

    DELETE FROM public.chats WHERE product_id = ANY(product_ids);
    DELETE FROM public.products WHERE seller_id = target_user_id;
  END IF;

  -- 5. Delete user's buyer chats and their messages
  SELECT ARRAY_AGG(id) INTO chat_ids
  FROM public.chats
  WHERE buyer_id = target_user_id;

  IF chat_ids IS NOT NULL AND array_length(chat_ids, 1) > 0 THEN
    DELETE FROM public.messages WHERE chat_id = ANY(chat_ids);
    DELETE FROM public.chats WHERE buyer_id = target_user_id;
  END IF;

  -- 6. Delete user-specific data
  DELETE FROM public.wishlists WHERE user_id = target_user_id;
  DELETE FROM public.notifications WHERE user_id = target_user_id;
  DELETE FROM public.ratings WHERE rater_id = target_user_id;
  DELETE FROM public.ratings WHERE seller_id = target_user_id;
  DELETE FROM public.seller_badges WHERE user_id = target_user_id;
  DELETE FROM public.user_roles WHERE user_id = target_user_id;

  -- 7. Delete profile
  DELETE FROM public.profiles WHERE user_id = target_user_id;

  -- 8. Delete from auth.users (the CASCADE on foreign keys handles stragglers)
  DELETE FROM auth.users WHERE id = target_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'deleted_user_id', target_user_id
  );
END;
$$;

-- Only authenticated users (admins, checked inside function) can call this
REVOKE ALL ON FUNCTION public.admin_delete_user_cascade(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_delete_user_cascade(UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_delete_user_cascade(UUID) TO authenticated;


-- ═══════════════════════════════════════════════════════════
-- FIX #19: Business validation constraints
-- Problem: No DB-level enforcement of positive prices, lengths, etc.
-- ═══════════════════════════════════════════════════════════

-- Positive prices
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'products_positive_selling_price') THEN
    ALTER TABLE public.products ADD CONSTRAINT products_positive_selling_price
      CHECK (selling_price > 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'products_positive_original_price') THEN
    ALTER TABLE public.products ADD CONSTRAINT products_positive_original_price
      CHECK (original_price > 0);
  END IF;
  -- Selling price should not exceed original price
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'products_selling_lte_original') THEN
    ALTER TABLE public.products ADD CONSTRAINT products_selling_lte_original
      CHECK (selling_price <= original_price);
  END IF;
  -- Max images per product
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'products_max_images') THEN
    ALTER TABLE public.products ADD CONSTRAINT products_max_images
      CHECK (array_length(images, 1) IS NULL OR array_length(images, 1) <= 5);
  END IF;
  -- Non-empty brand and name
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'products_brand_nonempty') THEN
    ALTER TABLE public.products ADD CONSTRAINT products_brand_nonempty
      CHECK (char_length(trim(brand)) > 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'products_name_nonempty') THEN
    ALTER TABLE public.products ADD CONSTRAINT products_name_nonempty
      CHECK (char_length(trim(name)) > 0);
  END IF;
END $$;


-- ═══════════════════════════════════════════════════════════
-- Restrict notification INSERT policy
-- Problem: Any caller (including anon) can insert notifications
-- Fix: Only authenticated users can insert
-- ═══════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;
CREATE POLICY "Authenticated users can insert notifications"
  ON public.notifications FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);


-- ═══════════════════════════════════════════════════════════
-- Restrict badges INSERT policy
-- Problem: Any caller can insert badges
-- Fix: Only admins or service role can insert badges
-- ═══════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "System can insert badges" ON public.seller_badges;
CREATE POLICY "Admins can insert badges"
  ON public.seller_badges FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Admins can also manage badges (update/delete)
DROP POLICY IF EXISTS "Admins can manage badges" ON public.seller_badges;
CREATE POLICY "Admins can manage badges"
  ON public.seller_badges FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

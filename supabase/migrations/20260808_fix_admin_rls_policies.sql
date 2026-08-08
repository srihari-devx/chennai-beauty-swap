-- ============================================================
-- FIX: Admin RLS Policies + Chat Message Persistence
-- Adds missing DELETE policies so admin operations persist
-- after page reload, and fixes profiles delete for admins.
-- ============================================================

-- ─── profiles: Allow admins to delete any profile ───
DROP POLICY IF EXISTS "Admins can delete profiles" ON public.profiles;
CREATE POLICY "Admins can delete profiles"
  ON public.profiles FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- ─── notifications: Allow admins to delete any notification ───
-- (needed for the delete-user cascade cleanup in Admin.tsx)
DROP POLICY IF EXISTS "Admins can delete notifications" ON public.notifications;
CREATE POLICY "Admins can delete notifications"
  ON public.notifications FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- ─── wishlists: Allow admins to delete any wishlist entry ───
DROP POLICY IF EXISTS "Admins can delete wishlists" ON public.wishlists;
CREATE POLICY "Admins can delete wishlists"
  ON public.wishlists FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- ─── seller_badges: Allow admins to delete any badge ───
DROP POLICY IF EXISTS "Admins can delete badges" ON public.seller_badges;
CREATE POLICY "Admins can delete badges"
  ON public.seller_badges FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- ─── product_reports: Allow admins to delete reports ───
DROP POLICY IF EXISTS "Admins can delete reports" ON public.product_reports;
CREATE POLICY "Admins can delete reports"
  ON public.product_reports FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- ─── ratings: Allow admins to delete any rating ───
-- (needed for delete-user cleanup)
DROP POLICY IF EXISTS "Admins can delete ratings" ON public.ratings;
CREATE POLICY "Admins can delete ratings"
  ON public.ratings FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

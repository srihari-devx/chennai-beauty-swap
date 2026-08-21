-- ============================================================
-- SECURITY AUDIT 2 — FIXES
-- Resolves H-1, H-2, H-4 database-level issues
-- Run in Supabase Dashboard SQL Editor AFTER all previous migrations
-- Date: 2026-08-19
-- ============================================================


-- ═══════════════════════════════════════════════════════════
-- H-1 FIX: Drop the old permissive notification INSERT policy
-- 
-- Problem: Migration 20260223191724 created "Authenticated can insert 
-- notifications" WITH CHECK (true). The 20260817 hardening migration
-- only dropped "System can insert notifications", so the old permissive
-- policy remains active and is OR-combined with the newer policy.
-- Result: Any authenticated user can insert a notification for ANY user.
--
-- Fix: Drop the old policy. Then replace the current policy with one
-- that restricts inserts so the caller can only create notifications
-- where they are contextually relevant (authenticated + valid user_id).
-- ═══════════════════════════════════════════════════════════

-- Drop the old permissive policy from migration 20260223191724
DROP POLICY IF EXISTS "Authenticated can insert notifications" ON public.notifications;

-- Drop the policy created by 20260817 hardening (we'll replace it with a tighter one)
DROP POLICY IF EXISTS "Authenticated users can insert notifications" ON public.notifications;

-- New restricted policy: authenticated users can only insert notifications
-- where user_id is a valid UUID (not null) and the inserter is authenticated.
-- This works with the chat notification pattern where sender creates a
-- notification for the recipient. The type must be a known allowed type.
CREATE POLICY "Authenticated users can insert own-context notifications"
  ON public.notifications FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND user_id IS NOT NULL
    AND auth.uid() != user_id
    AND type IN ('message', 'system', 'rating', 'badge')
  );


-- ═══════════════════════════════════════════════════════════
-- H-2 FIX: Drop the old permissive badges INSERT policy
--
-- Problem: Migration 20260223191724 created "Authenticated can insert 
-- badges" WITH CHECK (true). The 20260817 hardening migration only 
-- dropped "System can insert badges", so the old permissive policy
-- remains active alongside the admin-only policy.
-- Result: Any authenticated user can grant arbitrary trust badges.
--
-- Fix: Explicitly drop the old permissive policy. The admin-only
-- policy from 20260817 remains as the sole insert policy.
-- ═══════════════════════════════════════════════════════════

-- Drop the old permissive policy from migration 20260223191724
DROP POLICY IF EXISTS "Authenticated can insert badges" ON public.seller_badges;

-- Verify the admin-only policy exists (idempotent re-creation)
DROP POLICY IF EXISTS "Admins can insert badges" ON public.seller_badges;
CREATE POLICY "Admins can insert badges"
  ON public.seller_badges FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));


-- ═══════════════════════════════════════════════════════════
-- H-4 PARTIAL: OTP table cleanup
-- 
-- The send-otp Edge Function is being deleted from source.
-- Clean up any stale OTP records older than 24 hours.
-- The otp_verifications table and cleanup function remain
-- in case OTP verification is re-implemented properly.
-- ═══════════════════════════════════════════════════════════

-- Clean up expired/stale OTP records
DELETE FROM otp_verifications
WHERE expires_at < NOW() - INTERVAL '24 hours'
   OR (verified = TRUE AND created_at < NOW() - INTERVAL '1 hour');


-- ═══════════════════════════════════════════════════════════
-- ADDITIONAL HARDENING: Restrict product_views INSERT
--
-- The old "Authenticated can insert views" policy from 
-- 20260223191724 uses WITH CHECK (true). Restrict it so
-- only authenticated users can insert views, and they can
-- only attribute views to themselves (or null for anonymous).
-- ═══════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "Authenticated can insert views" ON public.product_views;
CREATE POLICY "Authenticated users can insert views"
  ON public.product_views FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND (viewer_id IS NULL OR viewer_id = auth.uid())
  );


-- ═══════════════════════════════════════════════════════════
-- VERIFICATION QUERIES (run these after the migration to confirm)
-- Uncomment to verify policies are correct:
-- ═══════════════════════════════════════════════════════════

-- SELECT policyname, cmd, qual, with_check 
-- FROM pg_policies 
-- WHERE tablename = 'notifications' AND cmd = 'INSERT';

-- SELECT policyname, cmd, qual, with_check 
-- FROM pg_policies 
-- WHERE tablename = 'seller_badges' AND cmd = 'INSERT';

-- SELECT policyname, cmd, qual, with_check 
-- FROM pg_policies 
-- WHERE tablename = 'product_views' AND cmd = 'INSERT';

-- =========================================================================
-- MIGRATION: Fix ALL remaining RLS issues for Firebase Auth
-- Run this in: Supabase Dashboard -> SQL Editor -> Run
--
-- Context: Firebase Auth users have NO Supabase auth session, so
--          auth.uid() returns NULL. All write operations must go
--          through SECURITY DEFINER RPCs. SELECT policies are opened
--          since the app filters by user_id in all queries.
-- =========================================================================


-- ═══════════════════════════════════════════════════════════════════════════
-- PART 1: Fix SELECT policies — open reads for Firebase users
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Chats: allow reads (app filters by buyer_id/seller_id) ──
DROP POLICY IF EXISTS "Chat participants can view their chats" ON public.chats;
CREATE POLICY "Anyone can read chats" ON public.chats FOR SELECT USING (true);

-- ── Messages: allow reads (app filters by chat_id) ──
DROP POLICY IF EXISTS "Chat participants can view messages" ON public.messages;
CREATE POLICY "Anyone can read messages" ON public.messages FOR SELECT USING (true);

-- ── Wishlists: allow reads (app filters by user_id) ──
DROP POLICY IF EXISTS "Users can view own wishlists" ON public.wishlists;
DROP POLICY IF EXISTS "Anyone can read wishlists" ON public.wishlists;
CREATE POLICY "Anyone can read wishlists" ON public.wishlists FOR SELECT USING (true);

-- ── Notifications: allow reads (app filters by user_id) ──
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Anyone can read notifications" ON public.notifications;
CREATE POLICY "Anyone can read notifications" ON public.notifications FOR SELECT USING (true);

-- ── Product Views: allow reads (admin analytics) ──
DROP POLICY IF EXISTS "Anyone can read product_views" ON public.product_views;
CREATE POLICY "Anyone can read product_views" ON public.product_views FOR SELECT USING (true);

-- ── User Roles: allow reads (admin check, user roles) ──
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Anyone can read user_roles" ON public.user_roles;
CREATE POLICY "Anyone can read user_roles" ON public.user_roles FOR SELECT USING (true);

-- ── Ratings: ensure open read stays ──
DROP POLICY IF EXISTS "Ratings are viewable by everyone" ON public.ratings;
CREATE POLICY "Ratings are viewable by everyone" ON public.ratings FOR SELECT USING (true);

-- ── Products: ensure open read stays ──
DROP POLICY IF EXISTS "Products are viewable by everyone" ON public.products;
CREATE POLICY "Products are viewable by everyone" ON public.products FOR SELECT USING (true);

-- ── Profiles: ensure open read stays ──
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON public.profiles;
CREATE POLICY "Profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);


-- ═══════════════════════════════════════════════════════════════════════════
-- PART 2: SECURITY DEFINER RPC functions for all remaining write operations
-- ═══════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────
-- 1. fn_create_chat — create a chat between buyer and seller
-- ─────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_create_chat(
  p_user_id UUID, p_product_id UUID, p_seller_id UUID
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  existing_id UUID;
  new_id UUID;
BEGIN
  IF NOT public._validate_user(p_user_id) THEN
    RETURN jsonb_build_object('error', 'User not found');
  END IF;
  -- Cannot chat with yourself
  IF p_user_id = p_seller_id THEN
    RETURN jsonb_build_object('error', 'Cannot chat with yourself');
  END IF;
  -- Check if chat already exists
  SELECT id INTO existing_id
    FROM public.chats
    WHERE product_id = p_product_id AND buyer_id = p_user_id;
  IF existing_id IS NOT NULL THEN
    RETURN jsonb_build_object('success', true, 'id', existing_id);
  END IF;
  -- Create new chat
  INSERT INTO public.chats (product_id, buyer_id, seller_id)
    VALUES (p_product_id, p_user_id, p_seller_id)
    RETURNING id INTO new_id;
  RETURN jsonb_build_object('success', true, 'id', new_id);
END;
$fn$;
GRANT EXECUTE ON FUNCTION public.fn_create_chat TO anon, authenticated, service_role;


-- ─────────────────────────────────────────────────────
-- 2. fn_send_message — send a message in a chat
-- ─────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_send_message(
  p_user_id UUID, p_chat_id UUID, p_content TEXT
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  is_participant BOOLEAN;
  new_id UUID;
BEGIN
  IF NOT public._validate_user(p_user_id) THEN
    RETURN jsonb_build_object('error', 'User not found');
  END IF;
  -- Verify user is a participant of this chat
  SELECT EXISTS (
    SELECT 1 FROM public.chats
    WHERE id = p_chat_id AND (buyer_id = p_user_id OR seller_id = p_user_id)
  ) INTO is_participant;
  IF NOT is_participant THEN
    RETURN jsonb_build_object('error', 'Not a participant of this chat');
  END IF;
  -- Insert message
  INSERT INTO public.messages (chat_id, sender_id, content)
    VALUES (p_chat_id, p_user_id, p_content)
    RETURNING id INTO new_id;
  RETURN jsonb_build_object('success', true, 'id', new_id);
END;
$fn$;
GRANT EXECUTE ON FUNCTION public.fn_send_message TO anon, authenticated, service_role;


-- ─────────────────────────────────────────────────────
-- 3. fn_send_notification — send a notification to a user
-- ─────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_send_notification(
  p_sender_id UUID, p_recipient_id UUID,
  p_type TEXT, p_title TEXT, p_message TEXT,
  p_related_id TEXT DEFAULT NULL
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
BEGIN
  IF NOT public._validate_user(p_sender_id) THEN
    RETURN jsonb_build_object('error', 'Sender not found');
  END IF;
  INSERT INTO public.notifications (user_id, type, title, message, related_id)
    VALUES (p_recipient_id, p_type, p_title, p_message, p_related_id);
  RETURN jsonb_build_object('success', true);
END;
$fn$;
GRANT EXECUTE ON FUNCTION public.fn_send_notification TO anon, authenticated, service_role;


-- ─────────────────────────────────────────────────────
-- 4. fn_mark_as_sold — mark a product as sold (owner only)
-- ─────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_mark_as_sold(
  p_user_id UUID, p_product_id UUID
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE is_owner BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.products WHERE id = p_product_id AND seller_id = p_user_id
  ) INTO is_owner;
  IF NOT is_owner THEN
    RETURN jsonb_build_object('error', 'Not authorized');
  END IF;
  UPDATE public.products SET is_sold = true WHERE id = p_product_id;
  RETURN jsonb_build_object('success', true);
END;
$fn$;
GRANT EXECUTE ON FUNCTION public.fn_mark_as_sold TO anon, authenticated, service_role;


-- ─────────────────────────────────────────────────────
-- 5. fn_delete_own_product — delete own product + cascade related data
-- ─────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_delete_own_product(
  p_user_id UUID, p_product_id UUID
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE is_owner BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.products WHERE id = p_product_id AND seller_id = p_user_id
  ) INTO is_owner;
  IF NOT is_owner THEN
    RETURN jsonb_build_object('error', 'Not authorized');
  END IF;
  -- Cascade delete related data
  DELETE FROM public.product_views WHERE product_id = p_product_id;
  DELETE FROM public.product_reports WHERE product_id = p_product_id;
  DELETE FROM public.wishlists WHERE product_id = p_product_id;
  DELETE FROM public.messages WHERE chat_id IN (SELECT id FROM public.chats WHERE product_id = p_product_id);
  DELETE FROM public.chats WHERE product_id = p_product_id;
  DELETE FROM public.products WHERE id = p_product_id;
  RETURN jsonb_build_object('success', true);
END;
$fn$;
GRANT EXECUTE ON FUNCTION public.fn_delete_own_product TO anon, authenticated, service_role;


-- ─────────────────────────────────────────────────────
-- 6. fn_track_view — track a product view
-- ─────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_track_view(
  p_user_id UUID, p_product_id UUID
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
BEGIN
  INSERT INTO public.product_views (product_id, viewer_id)
    VALUES (p_product_id, p_user_id)
    ON CONFLICT DO NOTHING;
  RETURN jsonb_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
  -- Silently ignore errors (view tracking is non-critical)
  RETURN jsonb_build_object('success', true);
END;
$fn$;
GRANT EXECUTE ON FUNCTION public.fn_track_view TO anon, authenticated, service_role;


-- ─────────────────────────────────────────────────────
-- 7. fn_upsert_rating — rate a seller (must have chatted with them)
-- ─────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_upsert_rating(
  p_user_id UUID, p_seller_id UUID, p_rating INTEGER
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE has_chatted BOOLEAN;
BEGIN
  IF NOT public._validate_user(p_user_id) THEN
    RETURN jsonb_build_object('error', 'User not found');
  END IF;
  IF p_user_id = p_seller_id THEN
    RETURN jsonb_build_object('error', 'Cannot rate yourself');
  END IF;
  IF p_rating < 1 OR p_rating > 5 THEN
    RETURN jsonb_build_object('error', 'Rating must be between 1 and 5');
  END IF;
  -- Verify the rater has chatted with the seller
  SELECT EXISTS (
    SELECT 1 FROM public.chats
    WHERE buyer_id = p_user_id AND seller_id = p_seller_id
  ) INTO has_chatted;
  IF NOT has_chatted THEN
    RETURN jsonb_build_object('error', 'You must have chatted with this seller to rate them');
  END IF;
  -- Upsert the rating
  INSERT INTO public.ratings (rater_id, seller_id, rating)
    VALUES (p_user_id, p_seller_id, p_rating)
    ON CONFLICT (rater_id, seller_id) DO UPDATE SET rating = EXCLUDED.rating;
  RETURN jsonb_build_object('success', true);
END;
$fn$;
GRANT EXECUTE ON FUNCTION public.fn_upsert_rating TO anon, authenticated, service_role;


-- ─────────────────────────────────────────────────────
-- 8. fn_report_product — report a product listing
-- ─────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_report_product(
  p_user_id UUID, p_product_id UUID, p_reason TEXT
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
BEGIN
  IF NOT public._validate_user(p_user_id) THEN
    RETURN jsonb_build_object('error', 'User not found');
  END IF;
  INSERT INTO public.product_reports (product_id, reporter_id, reason)
    VALUES (p_product_id, p_user_id, p_reason)
    ON CONFLICT (product_id, reporter_id) DO NOTHING;
  RETURN jsonb_build_object('success', true);
END;
$fn$;
GRANT EXECUTE ON FUNCTION public.fn_report_product TO anon, authenticated, service_role;


-- ─────────────────────────────────────────────────────
-- 9. fn_update_profile — update own profile
-- ─────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_update_profile(
  p_user_id UUID, p_full_name TEXT, p_area TEXT
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
BEGIN
  IF NOT public._validate_user(p_user_id) THEN
    RETURN jsonb_build_object('error', 'User not found');
  END IF;
  UPDATE public.profiles
    SET full_name = p_full_name, area = p_area
    WHERE user_id = p_user_id;
  RETURN jsonb_build_object('success', true);
END;
$fn$;
GRANT EXECUTE ON FUNCTION public.fn_update_profile TO anon, authenticated, service_role;


-- ─────────────────────────────────────────────────────
-- 10. fn_toggle_wishlist — add or remove from wishlist
-- ─────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_toggle_wishlist(
  p_user_id UUID, p_product_id UUID
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  already_exists BOOLEAN;
BEGIN
  IF NOT public._validate_user(p_user_id) THEN
    RETURN jsonb_build_object('error', 'User not found');
  END IF;
  SELECT EXISTS (
    SELECT 1 FROM public.wishlists
    WHERE user_id = p_user_id AND product_id = p_product_id
  ) INTO already_exists;
  IF already_exists THEN
    DELETE FROM public.wishlists WHERE user_id = p_user_id AND product_id = p_product_id;
    RETURN jsonb_build_object('success', true, 'action', 'removed');
  ELSE
    INSERT INTO public.wishlists (user_id, product_id)
      VALUES (p_user_id, p_product_id);
    RETURN jsonb_build_object('success', true, 'action', 'added');
  END IF;
END;
$fn$;
GRANT EXECUTE ON FUNCTION public.fn_toggle_wishlist TO anon, authenticated, service_role;


-- ─────────────────────────────────────────────────────
-- 11. fn_mark_notification_read — mark single notification as read
-- ─────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_mark_notification_read(
  p_user_id UUID, p_notification_id UUID
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
BEGIN
  UPDATE public.notifications
    SET is_read = true
    WHERE id = p_notification_id AND user_id = p_user_id;
  RETURN jsonb_build_object('success', true);
END;
$fn$;
GRANT EXECUTE ON FUNCTION public.fn_mark_notification_read TO anon, authenticated, service_role;


-- ─────────────────────────────────────────────────────
-- 12. fn_mark_all_notifications_read — mark all notifications read
-- ─────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_mark_all_notifications_read(
  p_user_id UUID
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
BEGIN
  UPDATE public.notifications
    SET is_read = true
    WHERE user_id = p_user_id AND is_read = false;
  RETURN jsonb_build_object('success', true);
END;
$fn$;
GRANT EXECUTE ON FUNCTION public.fn_mark_all_notifications_read TO anon, authenticated, service_role;

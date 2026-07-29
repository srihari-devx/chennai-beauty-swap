-- =========================================================================
-- MIGRATION: Firebase Auth Write Bypass via SECURITY DEFINER RPCs
-- Run this in: Supabase Dashboard -> SQL Editor -> Run
-- =========================================================================

-- 1. Fix Storage policies (remove auth.uid() requirement for Firebase users)
DROP POLICY IF EXISTS "Authenticated users can upload product images" ON storage.objects;
CREATE POLICY "Anyone can upload product images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'product-images');

DROP POLICY IF EXISTS "Users can update own product images" ON storage.objects;
CREATE POLICY "Users can update product images"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'product-images');

DROP POLICY IF EXISTS "Users can delete own product images" ON storage.objects;
CREATE POLICY "Users can delete product images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'product-images');


-- 2. Helper validators
CREATE OR REPLACE FUNCTION public._validate_user(p_user_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS
$fn$ SELECT EXISTS (SELECT 1 FROM public.profiles WHERE user_id = p_user_id); $fn$;

CREATE OR REPLACE FUNCTION public._validate_admin(p_user_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS
$fn$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = p_user_id AND role = 'admin'); $fn$;


-- 3. fn_insert_product
CREATE OR REPLACE FUNCTION public.fn_insert_product(
  p_user_id UUID, p_brand TEXT, p_name TEXT, p_category TEXT, p_condition TEXT,
  p_original_price NUMERIC, p_selling_price NUMERIC, p_images TEXT[], p_area TEXT,
  p_expiry_date TEXT DEFAULT NULL, p_reason TEXT DEFAULT NULL
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE new_id UUID; BEGIN
  IF NOT public._validate_user(p_user_id) THEN RETURN jsonb_build_object('error', 'User not found'); END IF;
  INSERT INTO public.products (seller_id, brand, name, category, condition, original_price, selling_price, images, area, expiry_date, reason_for_selling)
  VALUES (p_user_id, p_brand, p_name, p_category::product_category, p_condition::product_condition,
          p_original_price, p_selling_price, p_images, p_area, p_expiry_date::DATE, p_reason)
  RETURNING id INTO new_id;
  RETURN jsonb_build_object('success', true, 'id', new_id);
END; $fn$;
GRANT EXECUTE ON FUNCTION public.fn_insert_product TO anon, authenticated, service_role;


-- 4. fn_update_product
CREATE OR REPLACE FUNCTION public.fn_update_product(
  p_user_id UUID, p_product_id UUID, p_brand TEXT, p_name TEXT, p_category TEXT, p_condition TEXT,
  p_original_price NUMERIC, p_selling_price NUMERIC, p_images TEXT[], p_area TEXT,
  p_expiry_date TEXT DEFAULT NULL, p_reason TEXT DEFAULT NULL,
  p_previous_price NUMERIC DEFAULT NULL, p_price_reduced_at TEXT DEFAULT NULL
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE is_owner BOOLEAN; BEGIN
  SELECT EXISTS (SELECT 1 FROM public.products WHERE id = p_product_id AND seller_id = p_user_id) INTO is_owner;
  IF NOT is_owner AND NOT public._validate_admin(p_user_id) THEN
    RETURN jsonb_build_object('error', 'Not authorized');
  END IF;
  UPDATE public.products SET
    brand = p_brand, name = p_name,
    category = p_category::product_category, condition = p_condition::product_condition,
    original_price = p_original_price, selling_price = p_selling_price,
    images = p_images, area = p_area,
    expiry_date = p_expiry_date::DATE, reason_for_selling = p_reason,
    previous_price = p_previous_price,
    price_reduced_at = p_price_reduced_at::TIMESTAMPTZ
  WHERE id = p_product_id;
  RETURN jsonb_build_object('success', true);
END; $fn$;
GRANT EXECUTE ON FUNCTION public.fn_update_product TO anon, authenticated, service_role;


-- 5. fn_delete_product
CREATE OR REPLACE FUNCTION public.fn_delete_product(p_user_id UUID, p_product_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE is_owner BOOLEAN; BEGIN
  SELECT EXISTS (SELECT 1 FROM public.products WHERE id = p_product_id AND seller_id = p_user_id) INTO is_owner;
  IF NOT is_owner AND NOT public._validate_admin(p_user_id) THEN
    RETURN jsonb_build_object('error', 'Not authorized');
  END IF;
  DELETE FROM public.product_views WHERE product_id = p_product_id;
  DELETE FROM public.product_reports WHERE product_id = p_product_id;
  DELETE FROM public.wishlists WHERE product_id = p_product_id;
  DELETE FROM public.messages WHERE chat_id IN (SELECT id FROM public.chats WHERE product_id = p_product_id);
  DELETE FROM public.chats WHERE product_id = p_product_id;
  DELETE FROM public.products WHERE id = p_product_id;
  RETURN jsonb_build_object('success', true);
END; $fn$;
GRANT EXECUTE ON FUNCTION public.fn_delete_product TO anon, authenticated, service_role;


-- 6. fn_admin_insert_article
CREATE OR REPLACE FUNCTION public.fn_admin_insert_article(
  p_user_id UUID, p_title TEXT, p_content TEXT, p_excerpt TEXT DEFAULT NULL,
  p_category TEXT DEFAULT 'general', p_cover_image TEXT DEFAULT NULL, p_is_published BOOLEAN DEFAULT false
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE new_id UUID; BEGIN
  IF NOT public._validate_admin(p_user_id) THEN RETURN jsonb_build_object('error', 'Admin access required'); END IF;
  INSERT INTO public.articles (author_id, title, content, excerpt, category, cover_image_url, is_published)
  VALUES (p_user_id, p_title, p_content, p_excerpt, p_category, p_cover_image, p_is_published)
  RETURNING id INTO new_id;
  RETURN jsonb_build_object('success', true, 'id', new_id);
END; $fn$;
GRANT EXECUTE ON FUNCTION public.fn_admin_insert_article TO anon, authenticated, service_role;


-- 7. fn_admin_update_article
CREATE OR REPLACE FUNCTION public.fn_admin_update_article(
  p_user_id UUID, p_article_id UUID, p_title TEXT, p_content TEXT, p_excerpt TEXT DEFAULT NULL,
  p_category TEXT DEFAULT 'general', p_cover_image TEXT DEFAULT NULL, p_is_published BOOLEAN DEFAULT false
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
BEGIN
  IF NOT public._validate_admin(p_user_id) THEN RETURN jsonb_build_object('error', 'Admin access required'); END IF;
  UPDATE public.articles SET
    title = p_title, content = p_content, excerpt = p_excerpt, category = p_category,
    cover_image_url = p_cover_image, is_published = p_is_published, updated_at = now()
  WHERE id = p_article_id;
  RETURN jsonb_build_object('success', true);
END; $fn$;
GRANT EXECUTE ON FUNCTION public.fn_admin_update_article TO anon, authenticated, service_role;


-- 8. fn_admin_delete_article
CREATE OR REPLACE FUNCTION public.fn_admin_delete_article(p_user_id UUID, p_article_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
BEGIN
  IF NOT public._validate_admin(p_user_id) THEN RETURN jsonb_build_object('error', 'Admin access required'); END IF;
  DELETE FROM public.articles WHERE id = p_article_id;
  RETURN jsonb_build_object('success', true);
END; $fn$;
GRANT EXECUTE ON FUNCTION public.fn_admin_delete_article TO anon, authenticated, service_role;


-- 9. fn_admin_toggle_publish
CREATE OR REPLACE FUNCTION public.fn_admin_toggle_publish(p_user_id UUID, p_article_id UUID, p_is_published BOOLEAN)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
BEGIN
  IF NOT public._validate_admin(p_user_id) THEN RETURN jsonb_build_object('error', 'Admin access required'); END IF;
  UPDATE public.articles SET is_published = p_is_published, updated_at = now() WHERE id = p_article_id;
  RETURN jsonb_build_object('success', true);
END; $fn$;
GRANT EXECUTE ON FUNCTION public.fn_admin_toggle_publish TO anon, authenticated, service_role;


-- 10. fn_admin_remove_subscriber
CREATE OR REPLACE FUNCTION public.fn_admin_remove_subscriber(p_user_id UUID, p_subscriber_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
BEGIN
  IF NOT public._validate_admin(p_user_id) THEN RETURN jsonb_build_object('error', 'Admin access required'); END IF;
  DELETE FROM public.newsletter_subscribers WHERE id = p_subscriber_id;
  RETURN jsonb_build_object('success', true);
END; $fn$;
GRANT EXECUTE ON FUNCTION public.fn_admin_remove_subscriber TO anon, authenticated, service_role;


-- 11. fn_admin_delete_feedback
CREATE OR REPLACE FUNCTION public.fn_admin_delete_feedback(p_user_id UUID, p_feedback_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
BEGIN
  IF NOT public._validate_admin(p_user_id) THEN RETURN jsonb_build_object('error', 'Admin access required'); END IF;
  DELETE FROM public.feedback WHERE id = p_feedback_id;
  RETURN jsonb_build_object('success', true);
END; $fn$;
GRANT EXECUTE ON FUNCTION public.fn_admin_delete_feedback TO anon, authenticated, service_role;


-- 12. fn_admin_revoke_role
CREATE OR REPLACE FUNCTION public.fn_admin_revoke_role(p_requesting_user_id UUID, p_target_user_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE admin_count INTEGER; BEGIN
  IF NOT public._validate_admin(p_requesting_user_id) THEN RETURN jsonb_build_object('error', 'Admin access required'); END IF;
  SELECT COUNT(*) INTO admin_count FROM public.user_roles WHERE role = 'admin';
  IF admin_count <= 1 THEN RETURN jsonb_build_object('error', 'Cannot remove the last admin'); END IF;
  DELETE FROM public.user_roles WHERE user_id = p_target_user_id AND role = 'admin';
  RETURN jsonb_build_object('success', true);
END; $fn$;
GRANT EXECUTE ON FUNCTION public.fn_admin_revoke_role TO anon, authenticated, service_role;


-- 13. fn_admin_delete_user (cascade delete)
CREATE OR REPLACE FUNCTION public.fn_admin_delete_user(p_requesting_user_id UUID, p_target_user_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE product_ids UUID[]; chat_ids UUID[];
BEGIN
  IF NOT public._validate_admin(p_requesting_user_id) THEN RETURN jsonb_build_object('error', 'Admin access required'); END IF;
  SELECT ARRAY(SELECT id FROM public.products WHERE seller_id = p_target_user_id) INTO product_ids;
  IF array_length(product_ids, 1) > 0 THEN
    DELETE FROM public.product_views WHERE product_id = ANY(product_ids);
    DELETE FROM public.product_reports WHERE product_id = ANY(product_ids);
    DELETE FROM public.wishlists WHERE product_id = ANY(product_ids);
    SELECT ARRAY(SELECT id FROM public.chats WHERE product_id = ANY(product_ids)) INTO chat_ids;
    IF array_length(chat_ids, 1) > 0 THEN DELETE FROM public.messages WHERE chat_id = ANY(chat_ids); END IF;
    DELETE FROM public.chats WHERE product_id = ANY(product_ids);
    DELETE FROM public.products WHERE seller_id = p_target_user_id;
  END IF;
  SELECT ARRAY(SELECT id FROM public.chats WHERE buyer_id = p_target_user_id) INTO chat_ids;
  IF array_length(chat_ids, 1) > 0 THEN
    DELETE FROM public.messages WHERE chat_id = ANY(chat_ids);
    DELETE FROM public.chats WHERE buyer_id = p_target_user_id;
  END IF;
  DELETE FROM public.wishlists WHERE user_id = p_target_user_id;
  DELETE FROM public.notifications WHERE user_id = p_target_user_id;
  DELETE FROM public.ratings WHERE rater_id = p_target_user_id;
  DELETE FROM public.ratings WHERE seller_id = p_target_user_id;
  DELETE FROM public.seller_badges WHERE user_id = p_target_user_id;
  DELETE FROM public.user_roles WHERE user_id = p_target_user_id;
  DELETE FROM public.profiles WHERE user_id = p_target_user_id;
  RETURN jsonb_build_object('success', true);
END; $fn$;
GRANT EXECUTE ON FUNCTION public.fn_admin_delete_user TO anon, authenticated, service_role;


-- 14. Fix SELECT policies so admin fetchData() can read admin-only tables
DROP POLICY IF EXISTS "Admins can read feedback" ON public.feedback;
CREATE POLICY "Admins can read feedback" ON public.feedback FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can view subscribers" ON public.newsletter_subscribers;
CREATE POLICY "Admins can view subscribers" ON public.newsletter_subscribers FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can read all articles" ON public.articles;
CREATE POLICY "Admins can read all articles" ON public.articles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can view reports" ON public.product_reports;
CREATE POLICY "Admins can view reports" ON public.product_reports FOR SELECT USING (true);

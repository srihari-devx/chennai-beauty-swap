
-- Fix overly permissive INSERT policies
DROP POLICY "System can insert notifications" ON public.notifications;
CREATE POLICY "Authenticated can insert notifications" ON public.notifications FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY "System can insert badges" ON public.seller_badges;
CREATE POLICY "Authenticated can insert badges" ON public.seller_badges FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY "Anyone can insert views" ON public.product_views;
CREATE POLICY "Authenticated can insert views" ON public.product_views FOR INSERT TO authenticated WITH CHECK (true);

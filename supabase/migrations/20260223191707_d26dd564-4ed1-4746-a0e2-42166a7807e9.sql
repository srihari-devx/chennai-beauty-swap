
-- 1. Add gender to profiles
ALTER TABLE public.profiles ADD COLUMN gender text DEFAULT 'female';

-- 2. Add verification fields to profiles
ALTER TABLE public.profiles ADD COLUMN is_verified boolean DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN verification_status text DEFAULT null;
ALTER TABLE public.profiles ADD COLUMN verification_submitted_at timestamp with time zone DEFAULT null;
ALTER TABLE public.profiles ADD COLUMN verification_document_url text DEFAULT null;

-- 3. Create wishlists table
CREATE TABLE public.wishlists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, product_id)
);
ALTER TABLE public.wishlists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own wishlist" ON public.wishlists FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can add to wishlist" ON public.wishlists FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can remove from wishlist" ON public.wishlists FOR DELETE USING (auth.uid() = user_id);

-- 4. Create notifications table
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  related_id uuid DEFAULT null,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "System can insert notifications" ON public.notifications FOR INSERT WITH CHECK (true);

-- 5. Create seller_badges table
CREATE TABLE public.seller_badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  badge_type text NOT NULL,
  earned_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, badge_type)
);
ALTER TABLE public.seller_badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Badges are viewable by everyone" ON public.seller_badges FOR SELECT USING (true);
CREATE POLICY "System can insert badges" ON public.seller_badges FOR INSERT WITH CHECK (true);

-- 6. Create product_views table for tracking
CREATE TABLE public.product_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  viewer_id uuid DEFAULT null,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.product_views ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can insert views" ON public.product_views FOR INSERT WITH CHECK (true);
CREATE POLICY "Views are viewable by everyone" ON public.product_views FOR SELECT USING (true);

-- 7. Add price_reduced_at to products for "Recently Reduced" tracking
ALTER TABLE public.products ADD COLUMN previous_price numeric DEFAULT null;
ALTER TABLE public.products ADD COLUMN price_reduced_at timestamp with time zone DEFAULT null;

-- 8. Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

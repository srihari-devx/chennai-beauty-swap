
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- Create condition enum
CREATE TYPE public.product_condition AS ENUM ('sealed', 'opened_once', 'swatched');

-- Create category enum
CREATE TYPE public.product_category AS ENUM ('foundation', 'lipstick', 'skincare', 'fragrance', 'nails', 'eyeshadow', 'blush', 'concealer', 'mascara', 'other');

-- Create Chennai areas enum
CREATE TYPE public.chennai_area AS ENUM (
  'T Nagar', 'Velachery', 'Anna Nagar', 'Adyar', 'Tambaram',
  'Porur', 'Sholinganallur', 'OMR', 'Mylapore', 'Besant Nagar',
  'Perambur', 'Ambattur', 'Chromepet', 'Guindy', 'Kodambakkam',
  'Nungambakkam', 'Egmore', 'Royapettah', 'Kilpauk', 'Other'
);

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  area chennai_area NOT NULL DEFAULT 'Other',
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'user',
  UNIQUE(user_id, role)
);

-- Create products table
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  brand TEXT NOT NULL,
  name TEXT NOT NULL,
  category product_category NOT NULL,
  condition product_condition NOT NULL,
  expiry_date DATE,
  original_price NUMERIC(10, 2) NOT NULL,
  selling_price NUMERIC(10, 2) NOT NULL,
  reason_for_selling TEXT,
  images TEXT[] DEFAULT '{}',
  area chennai_area NOT NULL DEFAULT 'Other',
  is_sold BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create chats table
CREATE TABLE public.chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  buyer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(product_id, buyer_id)
);

-- Create messages table
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID NOT NULL REFERENCES public.chats(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create ratings table
CREATE TABLE public.ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rater_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(rater_id, seller_id)
);

-- Create product_reports table
CREATE TABLE public.product_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  reporter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(product_id, reporter_id)
);

-- Create storage bucket for product images
INSERT INTO storage.buckets (id, name, public) VALUES ('product-images', 'product-images', true);

-- =====================
-- SECURITY DEFINER FUNCTION for role checks (prevents RLS recursion)
-- =====================
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- =====================
-- TIMESTAMPS
-- =====================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================
-- AUTO-CREATE PROFILE ON SIGNUP
-- =====================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, area)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    COALESCE((NEW.raw_user_meta_data->>'area')::chennai_area, 'Other')
  );
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================
-- AVERAGE RATING FUNCTION
-- =====================
CREATE OR REPLACE FUNCTION public.get_seller_rating(_seller_id UUID)
RETURNS NUMERIC
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(AVG(rating)::NUMERIC(3,1), 0)
  FROM public.ratings
  WHERE seller_id = _seller_id
$$;

-- =====================
-- RLS POLICIES
-- =====================

-- Profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- User Roles (read-only for users, admins can see all)
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Products
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Products are viewable by everyone" ON public.products FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create products" ON public.products FOR INSERT WITH CHECK (auth.uid() = seller_id);
CREATE POLICY "Sellers can update own products" ON public.products FOR UPDATE USING (auth.uid() = seller_id);
CREATE POLICY "Sellers can delete own products" ON public.products FOR DELETE USING (auth.uid() = seller_id);
CREATE POLICY "Admins can manage all products" ON public.products FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Chats
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Chat participants can view their chats" ON public.chats FOR SELECT USING (auth.uid() = buyer_id OR auth.uid() = seller_id);
CREATE POLICY "Buyers can create chats" ON public.chats FOR INSERT WITH CHECK (auth.uid() = buyer_id);

-- Messages
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Chat participants can view messages" ON public.messages FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.chats
    WHERE chats.id = messages.chat_id
    AND (chats.buyer_id = auth.uid() OR chats.seller_id = auth.uid())
  )
);
CREATE POLICY "Chat participants can send messages" ON public.messages FOR INSERT WITH CHECK (
  auth.uid() = sender_id AND
  EXISTS (
    SELECT 1 FROM public.chats
    WHERE chats.id = messages.chat_id
    AND (chats.buyer_id = auth.uid() OR chats.seller_id = auth.uid())
  )
);

-- Ratings
ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Ratings are viewable by everyone" ON public.ratings FOR SELECT USING (true);
CREATE POLICY "Users can rate sellers they chatted with" ON public.ratings FOR INSERT WITH CHECK (
  auth.uid() = rater_id AND
  auth.uid() != seller_id AND
  EXISTS (
    SELECT 1 FROM public.chats
    WHERE (chats.buyer_id = auth.uid() AND chats.seller_id = ratings.seller_id)
  )
);
CREATE POLICY "Users can update own ratings" ON public.ratings FOR UPDATE USING (auth.uid() = rater_id);

-- Product Reports
ALTER TABLE public.product_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can report products" ON public.product_reports FOR INSERT WITH CHECK (auth.uid() = reporter_id);
CREATE POLICY "Admins can view reports" ON public.product_reports FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Storage policies for product images
CREATE POLICY "Anyone can view product images" ON storage.objects FOR SELECT USING (bucket_id = 'product-images');
CREATE POLICY "Authenticated users can upload product images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'product-images' AND auth.uid() IS NOT NULL);
CREATE POLICY "Users can update own product images" ON storage.objects FOR UPDATE USING (bucket_id = 'product-images' AND auth.uid() IS NOT NULL);
CREATE POLICY "Users can delete own product images" ON storage.objects FOR DELETE USING (bucket_id = 'product-images' AND auth.uid() IS NOT NULL);

-- Enable Realtime for messages and chats
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chats;

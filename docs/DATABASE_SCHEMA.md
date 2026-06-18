# Swaptics Database Schema & Security (RLS)

This document contains a comprehensive blueprint of the PostgreSQL database hosted on Supabase, listing all database tables, columns, constraints, Custom Enums, Row Level Security (RLS) policies, and database triggers.

---

## 1. Custom Postgres Types & Enums

The database schema utilizes custom enums to enforce data integrity:

### `app_role`
Enumerates user authorization levels:
- `admin`
- `moderator`
- `user`

### `product_condition`
Enforces valid conditions for beauty swaps:
- `sealed`
- `opened_once`
- `swatched`

### `product_category`
Categorizes beauty products:
- `foundation`, `lipstick`, `skincare`, `fragrance`, `nails`, `eyeshadow`, `blush`, `concealer`, `mascara`, `other`

> [!NOTE]
> **Area Data**: Previously, a custom `chennai_area` enum restricted listings to specific neighborhoods in Chennai. A subsequent migration (`20260611_change_area_to_text.sql`) altered this column on both the `profiles` and `products` tables to a standard `TEXT` type to support user areas and zip codes across all of India.

---

## 2. Database Tables Blueprint

### `profiles`
Holds public identity information for users:
- `id` (UUID, PK, Default: `gen_random_uuid()`)
- `user_id` (UUID, Unique, FK → `auth.users(id)` ON DELETE CASCADE)
- `full_name` (TEXT, Not Null)
- `area` (TEXT, Not Null, Default: `'Other'`)
- `avatar_url` (TEXT, Nullable)
- `created_at` (TIMESTAMPTZ, Default: `now()`)
- `updated_at` (TIMESTAMPTZ, Default: `now()`)

### `user_roles`
Authorizations separated from profiles for enhanced security:
- `id` (UUID, PK)
- `user_id` (UUID, FK → `auth.users(id)` ON DELETE CASCADE)
- `role` (`app_role`, Default: `'user'`)
- *Constraints*: Unique pair (`user_id`, `role`)

### `products`
Beauty listings uploaded by sellers:
- `id` (UUID, PK)
- `seller_id` (UUID, FK → `auth.users(id)` ON DELETE CASCADE)
- `brand` (TEXT, Not Null)
- `name` (TEXT, Not Null)
- `category` (`product_category`, Not Null)
- `condition` (`product_condition`, Not Null)
- `expiry_date` (DATE, Nullable)
- `original_price` (NUMERIC(10,2), Not Null) (MRP)
- `selling_price` (NUMERIC(10,2), Not Null) (Swap/Selling price)
- `reason_for_selling` (TEXT, Nullable)
- `images` (TEXT[], Default: `'{}'`)
- `area` (TEXT, Default: `'Other'`)
- `is_sold` (BOOLEAN, Default: `false`)
- `created_at` (TIMESTAMPTZ, Default: `now()`)
- `updated_at` (TIMESTAMPTZ, Default: `now()`)

### `chats`
Links participants regarding a product listing:
- `id` (UUID, PK)
- `product_id` (UUID, FK → `public.products(id)` ON DELETE CASCADE)
- `buyer_id` (UUID, FK → `auth.users(id)` ON DELETE CASCADE)
- `seller_id` (UUID, FK → `auth.users(id)` ON DELETE CASCADE)
- `created_at` (TIMESTAMPTZ, Default: `now()`)
- *Constraints*: Unique pair (`product_id`, `buyer_id`)

### `messages`
Real-time chat text logs:
- `id` (UUID, PK)
- `chat_id` (UUID, FK → `public.chats(id)` ON DELETE CASCADE)
- `sender_id` (UUID, FK → `auth.users(id)` ON DELETE CASCADE)
- `content` (TEXT, Not Null)
- `created_at` (TIMESTAMPTZ, Default: `now()`)

### `ratings`
Stores reviews submitted by buyers for sellers:
- `id` (UUID, PK)
- `rater_id` (UUID, FK → `auth.users(id)` ON DELETE CASCADE)
- `seller_id` (UUID, FK → `auth.users(id)` ON DELETE CASCADE)
- `rating` (INTEGER, Check: `rating >= 1 AND rating <= 5`)
- `created_at` (TIMESTAMPTZ, Default: `now()`)
- *Constraints*: Unique pair (`rater_id`, `seller_id`)

### `product_reports`
Flagging mechanism for problematic listings:
- `id` (UUID, PK)
- `product_id` (UUID, FK → `public.products(id)` ON DELETE CASCADE)
- `reporter_id` (UUID, FK → `auth.users(id)` ON DELETE CASCADE)
- `reason` (TEXT, Not Null)
- `created_at` (TIMESTAMPTZ, Default: `now()`)
- *Constraints*: Unique pair (`product_id`, `reporter_id`)

### `otp_verifications`
Security-focused custom OTP storage for authentication:
- `id` (UUID, PK)
- `email` (TEXT, Not Null)
- `otp_hash` (TEXT, Not Null) (SHA-256 hash of OTP, never plaintext)
- `expires_at` (TIMESTAMPTZ, Not Null)
- `verified` (BOOLEAN, Default: `false`)
- `failed_attempts` (INTEGER, Default: `0`) (Brute-force protection tracking)
- `created_at` (TIMESTAMPTZ, Default: `now()`)

### `feedback`
Standard user reviews of the application:
- `id` (UUID, PK)
- `name` (TEXT, Not Null)
- `email` (TEXT, Not Null)
- `rating` (INTEGER, Check: `rating >= 1 AND rating <= 5`)
- `category` (TEXT, Default: `'general'`, Check: `category IN ('bug', 'feature', 'general')`)
- `message` (TEXT, Not Null)
- `user_id` (UUID, FK → `auth.users(id)` ON DELETE SET NULL)
- `created_at` (TIMESTAMPTZ, Default: `now()`)

### `newsletter_subscribers`
List of marketing emails subscribed to updates:
- `id` (UUID, PK)
- `email` (TEXT, Unique, Not Null)
- `name` (TEXT, Nullable)
- `subscribed_at` (TIMESTAMPTZ, Default: `now()`)
- `is_active` (BOOLEAN, Default: `true`)

### `articles`
Platform-wide blog content:
- `id` (UUID, PK)
- `title` (TEXT, Not Null)
- `content` (TEXT, Not Null)
- `excerpt` (TEXT, Nullable)
- `category` (TEXT, Default: `'general'`)
- `cover_image_url` (TEXT, Nullable)
- `is_published` (BOOLEAN, Default: `false`)
- `author_id` (UUID, Not Null)
- `created_at` (TIMESTAMPTZ, Default: `now()`)
- `updated_at` (TIMESTAMPTZ, Default: `now()`)

---

## 3. Database Triggers & Functions

### Profile Auto-Creation
Triggers on insertion to `auth.users` to automatically populate profiles and roles:
```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, area)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    COALESCE(NEW.raw_user_meta_data->>'area', 'Other')
  );
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Auto-Cleanup of OTPs
To optimize storage, expired or verified OTP verifications are cleaned automatically:
```sql
CREATE OR REPLACE FUNCTION cleanup_expired_otps()
RETURNS void AS $$
BEGIN
  DELETE FROM otp_verifications
  WHERE expires_at < NOW() - INTERVAL '1 hour'
     OR (verified = TRUE AND created_at < NOW() - INTERVAL '1 hour');
END;
$$ LANGUAGE plpgsql;
```

---

## 4. Row Level Security (RLS) Policy Specifications

Supabase enforces fine-grained access policies:

| Table | Operations | Allowed Role/Condition |
|---|---|---|
| `profiles` | SELECT | Anyone (Public) |
| | UPDATE/INSERT | Own record only (`auth.uid() = user_id`) |
| `user_roles` | SELECT | Own role OR Admin (`public.has_role(auth.uid(), 'admin')`) |
| `products` | SELECT | Anyone (Public) |
| | INSERT | Authenticated users setting themselves as seller |
| | UPDATE/DELETE | Owner only (`auth.uid() = seller_id`) |
| | ALL | Admin only |
| `chats` | SELECT | Chat participants only (`auth.uid() = buyer_id OR auth.uid() = seller_id`) |
| | INSERT | Buyer only |
| `messages` | SELECT/INSERT | Chat participants only (via cross-table check in `public.chats`) |
| `ratings` | SELECT | Anyone (Public) |
| | INSERT | Raters who have an open chat with the seller (prevents spam reviews) |
| | UPDATE | Rater owner only |
| `product_reports`| INSERT | Authenticated users |
| | SELECT | Admin only |
| `otp_verifications` | ALL | Service Role only (locked down; users access via secure edge function api) |
| `feedback` | INSERT | Anyone (Public) |
| | SELECT/DELETE | Admin only |
| `newsletter_subscribers`| INSERT | Anyone (Public) |
| | SELECT/UPDATE/DELETE | Admin only |
| `articles` | SELECT | Anyone if `is_published = true` OR Admin |
| | INSERT/UPDATE/DELETE | Admin only |

### Storage Bucket Security (`product-images`)
- **Read**: Public (`Anyone can view product images`)
- **Upload**: Authenticated users (`Authenticated users can upload product images`)
- **Update/Delete**: Authenticated users owning the image asset.

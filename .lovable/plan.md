
## Chennai Beauty Swap — Phase 1 MVP Plan

### Overview
A hyperlocal beauty marketplace for Chennai where students and young adults can list, browse, and swap unused cosmetics. No payments or delivery — buyers and sellers connect via in-app chat and meet in person.

---

### Design System
- **Color palette:** Pastel pink, beige, off-white, soft lavender
- **Style:** Minimal, clean, rounded cards with soft shadows — like a modern beauty brand
- **Typography:** Light, airy fonts with good contrast
- **Mobile-first** responsive layout throughout

---

### 1. Home Page
- **Hero section** with tagline: *"Rescue Beauty Products. Save Money. Reduce Waste."* — soft gradient background, CTA buttons (Browse, Sell Now)
- **How It Works** — 3-step visual flow: List → Chat → Meet & Buy
- **Browse by Category** — icon-based grid (Foundation, Lipstick, Skincare, Fragrance, Nails, etc.)
- **Recently Added Products** — horizontal scroll row of product cards
- **Safety Guidelines** — soft-colored info section with key safety tips
- **Disclaimer banner** — "This platform only connects buyers and sellers. We are not responsible for product authenticity, allergic reactions, or transaction disputes. Meet only in public places."
- **Call to Action** — "Join Chennai Beauty Swap" signup prompt

---

### 2. Authentication
- **Signup / Login pages** with a beautiful, on-brand form design
- Email + password authentication with email verification
- Signup collects:
  - Name
  - Email
  - Area in Chennai (dropdown: T Nagar, Velachery, Anna Nagar, Adyar, Tambaram, Porur, Sholinganallur, OMR, and more)
- Profile stored in Supabase with user area info

---

### 3. Browse / Product Listing Page
- Grid of product cards, each showing:
  - Product image
  - Brand name
  - Product name
  - **Condition badge** (color-coded: Sealed = green, Opened Once = blue, Swatched = yellow)
  - Price
  - Area in Chennai
  - **Available / Sold badge**
  - "Chat Seller" button
- **Filter sidebar / drawer:**
  - Category
  - Condition
  - Area
  - Price range (slider)
- Search bar at the top

---

### 4. Product Detail Page
- Large product image gallery
- Seller name + star rating display
- Full product details (Brand, Category, Condition, Expiry Date, Reason for selling)
- Original price vs. selling price
- Condition badge + Available/Sold badge
- **"Chat Seller"** primary CTA button
- Report product option (subtle link)

---

### 5. Sell a Product Page
- Form with fields:
  - Brand, Product Name
  - Category (dropdown)
  - Condition (Sealed / Opened Once / Swatched)
  - Expiry Date
  - Original Price & Selling Price
  - Reason for selling
  - Upload 3–5 images (stored in Supabase Storage)
  - Area in Chennai (pre-filled from profile, editable)
- Submit → listing goes live immediately
- Protected route (must be logged in)

---

### 6. Chat System
- Real-time messaging between buyer and seller (Supabase Realtime)
- Each chat thread tied to a specific product (product reference shown at top of chat)
- "Chat Seller" button on product page opens/creates a chat thread
- No payment integration — purely a connection tool

---

### 7. User Dashboard
- **My Listings tab** — all products listed by the user with:
  - Edit option
  - Mark as Sold button (changes badge to "Sold")
  - Delete listing
- **My Chats tab** — list of active chat threads with product thumbnails
- **Profile section** — name, area, rating display

---

### 8. Seller Ratings
- Any user who has chatted with a seller can leave a 1–5 star rating at any time
- Ratings shown on the seller's profile and product detail page
- Average rating displayed as star icons

---

### 9. Admin Dashboard
- Separate admin-only view
- Stats overview:
  - Total users
  - Total listings
  - Total sold products
  - Most active Chennai areas (bar chart)
  - Most popular categories (pie/donut chart)
- User and listing management table

---

### Backend (Lovable Cloud / Supabase)
- **Auth:** Email/password with email verification
- **Database:** Users/profiles, products, chats, messages, ratings, roles tables
- **Storage:** Product image uploads (Supabase Storage buckets)
- **Realtime:** Live chat messaging
- **Security:** Row-level security so users only see/edit their own data; admin role managed via a separate roles table

---

### What's Deferred to Phase 2
- Push notifications
- Product view/analytics tracking per listing
- Advanced seller verification
- Social sharing (Instagram-style sharing cards)

# Swaptics System Architecture

This document details the frontend and backend architecture, state management strategies, routing conventions, and performance optimization designs used in the **Swaptics** platform.

---

## 1. Overview & Core Philosophy

Swaptics is built using a modern **Single Page Application (SPA)** frontend decoupled from a serverless **Backend-as-a-Service (BaaS)**:

- **Frontend**: Vite + React + TypeScript + Tailwind CSS.
- **Backend**: Supabase (PostgreSQL database, Row Level Security, Edge Functions, Blob Storage, and WebSockets/Realtime).

The primary design philosophy is to minimize frontend bundle size, maximize page load speeds (focusing on Core Web Vitals), and maintain high accessibility standard compliance while preserving rich visual polish.

---

## 2. Frontend Architecture & Folder Conventions

Code organization is highly componentized and kept strict to ensure modularity:

- **`src/components/`**: Modular, reusable UI components.
  - Contains standard styling widgets like `ProductCard`, `VerifiedBadge`, `MeetupSpots`, and `NewsletterSection`.
  - **`src/components/ui/`**: Core design primitives managed by Radix UI & shadcn/ui. Styled using Tailwind CSS variables. These components are strictly isolated and contain no business logic.
- **`src/contexts/`**: Global react contexts.
  - **`AuthContext.tsx`**: Tracks Supabase session state, profile data (cached locally), and auth operations.
  - **`ThemeContext.tsx`**: Tracks the selected theme mode (`light`, `dark`, `blue`) and injects variables into the document element.
- **`src/hooks/`**: Custom reusable hooks.
  - **`useWishlist.ts`**: Caches and updates the current user's product wishlist.
  - **`useTrustScore.ts`**: Handles the rating query aggregation and seller trust badges.
  - **`useSEO.ts`**: Dynamically manages document head metadata tags for crawler indexing.
- **`src/pages/`**: Full page view components (each dynamically code-split at the route level).
- **`src/integrations/`**: Houses auto-generated database schemas and types directly mapping PostgreSQL to TypeScript (`src/integrations/supabase/types.ts`).

---

## 3. Routing & Code Splitting

Routing is powered by `react-router-dom` in `src/App.tsx`. 

### Route-Based Dynamic Loading
To prevent a bloated initial bundle size and optimize LCP (Largest Contentful Paint), all pages are loaded dynamically using `React.lazy()` with `Suspense` fallback loaders:

```tsx
const Index = lazy(() => import("./pages/Index"));
const ProductDetail = lazy(() => import("./pages/ProductDetail"));
const Browse = lazy(() => import("./pages/Browse"));
```

This configuration signals Vite to generate distinct JavaScript chunks for each page (e.g., `ArticleDetail.js`, `Dashboard.js`). On navigation, the client fetches the target page chunk on-demand, reducing the critical path bundle from **~324 KB** down to **~175 KB**.

### Route Protection
Route protection is enforced by `src/components/ProtectedRoute.tsx`, checking user sessions from `AuthContext` before mounting components, and handling redirection for admin-only routes:

```tsx
<Route path="/sell" element={<ProtectedRoute><Sell /></ProtectedRoute>} />
<Route path="/cbs-admin" element={<ProtectedRoute adminOnly><Admin /></ProtectedRoute>} />
```

---

## 4. State Management

Swaptics uses a hybrid approach to state, matching different lifecycles:

### A. Client-Side State
- **Global UI State**: Handled using native React contexts. This includes theme status (`ThemeContext`) and authentication session variables (`AuthContext`).
- **Local Page State**: Managed with native `useState` hooks for form states, inputs, and UI toggles.

### B. Server-Side Cache State (TanStack Query)
For data-heavy pages (like browsing, wishlist tracking, or search), the platform leverages `@tanstack/react-query`:
- **Query Caching**: Query keys are strictly structured to manage caching, background refetching, and automatic state updates.
- **Mutations**: Handles write requests, optimistic updates, and invalidations.

---

## 5. Styling, Typography & Design Tokens

Swaptics uses **Tailwind CSS** combined with CSS Custom Properties (`src/index.css`) to enforce its aesthetic system:

- **Premium Color Palette**: Hand-crafted HSL colors rather than default Tailwind swatches.
- **Contrast Ratios**: Strictly maintains HSL ratios for WCAG AA compliance (e.g., light-mode `--muted-foreground` at `308 10% 40%` and dark-mode at `308 10% 68%`).
- **Typography**: Imports **Playfair Display** (for headers/display texts) and **DM Sans** (for body readability) asynchronously using preconnected HTML link tags to prevent render-blocking delays:
  ```html
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?...&display=swap" media="print" onload="this.media='all'">
  ```

---

## 6. Performance & Hosting Configurations

High lighthouse scores (95+) are maintained via:

1. **Asset Optimization**:
   - Product/article cover images render with `loading="lazy"` and `decoding="async"` to prevent rendering delay on images below the fold.
   - Core elements (like the navigation logo) use `loading="eager"` with `fetchpriority="high"`.
2. **CDN-Level Cache Headers (`vercel.json`)**:
   - Enables immutable long-term caching headers (`Cache-Control: public, max-age=31536000, immutable`) for all content built under `/assets/*`.
   - Adds custom cache configurations for image extensions, SVGs, webp files, and fonts stored statically.

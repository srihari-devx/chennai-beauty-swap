# Swaptics Documentation Hub

Welcome to the comprehensive documentation suite for **Swaptics**, India's hyperlocal beauty product swap and sale platform.

This directory contains deep-dive developer guides and technical references explaining the architecture, database schema, codebase features, and maintenance runbooks.

---

## Documentation Map

1. **[System Architecture](ARCHITECTURE.md)**
   - Overview of the Vite + React single-page frontend.
   - Setup, routing system, code splitting, and styling guidelines.
   - Client-side data fetching & state management with TanStack Query and React Contexts.
   - Production optimizations (PageSpeed audit fixes, caching headers, performance metrics).

2. **[Database Schema & Security (RLS)](DATABASE_SCHEMA.md)**
   - Complete Postgres database structure (Supabase).
   - Column types, keys, custom PostgreSQL schemas, types, and triggers.
   - Row Level Security (RLS) security models for all user roles.
   - Brute-force and storage bucket security policies.

3. **[Features Guide](FEATURES_GUIDE.md)**
   - Auth flows (custom OTP system, profile generation).
   - Core Marketplace (listings, categories, hyperlocal filters, wishlists).
   - Real-time Chat (message synchronization, unread counters, webhooks).
   - Trust & Ratings (trust metrics, seller badges, reports).
   - Blog & SEO (dynamic article routing, social sharing, `useSEO` hook).
   - Admin Console (metrics, controls, user deletions, newsletters).

4. **[Maintenance & Extension Guide](MAINTENANCE.md)**
   - Local environment setup (prerequisites, run commands).
   - Database migrations workflow (CLI schema upgrades).
   - Edge Functions deployments.
   - Extensibility standards & code review checklist for future features.

---

## Directory Structure Overview

The repository is organized following clean-architecture principles for React single-page apps integrated with Supabase:

```
chennai-beauty-swap/
├── public/                 # Static assets, robots.txt, redirect rules
├── src/                    # Frontend Application Source Code
│   ├── components/         # Reusable UI widgets & layout wrappers
│   │   ├── ui/             # Radix UI + shadcn primitive design system
│   ├── contexts/           # Global React Contexts (Auth, Theme)
│   ├── hooks/              # Custom React Hooks (trust, wishlist, SEO)
│   ├── integrations/       # Supabase client instances & auto-generated types
│   ├── lib/                # Static helpers, utilities, & configurations
│   ├── pages/              # Main route component views
│   ├── App.tsx             # Route management & code splitting config
│   ├── index.css           # Styling system rules, typography, & CSS tokens
│   └── main.tsx            # Main application bootstrapper
├── supabase/               # Backend-as-a-Service configuration
│   ├── functions/          # Deno Edge Functions (send-otp, delete-user)
│   └── migrations/         # PostgreSQL database migrations
└── vercel.json             # Vercel deployment headers & rewrite patterns
```

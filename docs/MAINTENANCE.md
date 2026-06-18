# Swaptics Maintenance & Extension Guide

This guide details local development commands, database migrations, Edge Function deployments, and the documentation maintenance playbook for developers and AI assistants.

---

## 1. Local Development Operations

### Prerequisites
- **Node.js**: v18.0.0 or higher.
- **npm**: v9.0.0 or higher.
- **Supabase CLI**: installed locally (recommended for migration and Edge Function management).

### Setup and Running
```bash
# 1. Install dependencies
npm install

# 2. Configure local environment variables (.env)
# Copy template: cp .env.example .env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# 3. Launch Vite local dev server
npm run dev
# Server boots at http://localhost:8080 by default

# 4. Run production build verification
npm run build
```

---

## 2. Database Migrations Workflow

Swaptics uses PostgreSQL migrations managed through the Supabase CLI. Migrations are stored chronologically in `supabase/migrations/`.

### Creating a New Migration
When altering database schemas (adding tables, views, changing constraints, or RLS):
```bash
# Generate a blank sql migration file
supabase migration new custom_migration_name

# OR automatic schema difference generation against your local database
supabase db diff -f add_new_feature_table
```

### Applying Migrations
```bash
# Apply migrations to your local development database
supabase db reset

# Push migrations to the live production database
supabase db push
```

---

## 3. Supabase Edge Functions

Backend Deno Edge Functions are located in `supabase/functions/`.

### Local Execution (Testing)
```bash
# Run Deno function servers locally
supabase functions serve --no-verify-jwt
```
Access the function endpoint locally at `http://localhost:54321/functions/v1/[function-name]`.

### Production Deployment
```bash
# Deploy to Supabase cloud hosting
supabase functions deploy delete-user
supabase functions deploy send-otp
supabase functions deploy setup-admin
```

---

## 4. Documentation Maintenance Playbook (Critical Checklist)

To ensure this documentation suite remains accurate as Swaptics scales, developers (and AI coding agents) **must** run through this checklist when implementing new changes:

### ☐ Database Alteration?
- **Action**: If you add, modify, or remove any database table, column, enum, or custom function:
  1. Open [docs/DATABASE_SCHEMA.md](DATABASE_SCHEMA.md).
  2. Update section `1. Custom Postgres Types & Enums` or `2. Database Tables Blueprint`.
  3. Document any new Row Level Security (RLS) policies or triggers added.

### ☐ Architecture, Performance, or Package Changes?
- **Action**: If you install new core libraries (e.g. state management, animations), adjust caching policies, or alter code splitting:
  1. Open [docs/ARCHITECTURE.md](ARCHITECTURE.md).
  2. Update section `3. Routing & Code Splitting`, `4. State Management`, or `6. Performance & Hosting Configurations` as appropriate.

### ☐ New Feature Implementation?
- **Action**: If you build a new page or add functional capabilities (e.g. payment channels, advanced maps):
  1. Open [docs/FEATURES_GUIDE.md](FEATURES_GUIDE.md).
  2. Add a sub-heading and detail the UI flows, edge cases, and helper hooks used.

### ☐ Edge Functions or Deployment Upgrades?
- **Action**: If you deploy a new Edge Function or configure vercel proxy redirects:
  1. Open [docs/MAINTENANCE.md](MAINTENANCE.md).
  2. Add the deploy CLI scripts or system variables to the documentation list.

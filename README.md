# Swaptics

A beauty product swap platform for India, built with modern web technologies.

---

## 📖 Developer Documentation Hub

For details regarding software design, database schemas, and codebase workflows, explore our documentation guides:

- **[Documentation Index](docs/README.md)**: Master directory and file map.
- **[System Architecture](docs/ARCHITECTURE.md)**: Front-end code-splitting, routing structure, state contexts, and styling guidelines.
- **[Database Schema & Security](docs/DATABASE_SCHEMA.md)**: Tables blueprint, custom Postgres types/triggers, and Supabase RLS security policies.
- **[Functional Features Guide](docs/FEATURES_GUIDE.md)**: Walkthroughs of OTP logins, marketplace filters, real-time chats, trust scores, and admin modules.
- **[Maintenance & Extension Checklist](docs/MAINTENANCE.md)**: Local start commands, migration policies, Edge Functions deployments, and code-review expansion playbook.

---

## Tech Stack

- **Vite** — Fast build tool & dev server
- **React** + **TypeScript** — UI framework
- **Tailwind CSS** — Utility-first styling
- **shadcn/ui** — Component library
- **Supabase** — Auth, Database, Storage & Edge Functions

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- npm

### Setup

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

The app will be available at `http://localhost:8080`.

### Environment Variables

Create a `.env` file with:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
```

### Build for Production

```bash
npm run build
npm run preview
```

## Project Structure

```
src/
├── components/    # Reusable UI components
├── contexts/      # React context providers (Auth, Theme)
├── hooks/         # Custom React hooks
├── integrations/  # Supabase client & types
├── lib/           # Utilities & constants
├── pages/         # Route pages
└── main.tsx       # App entry point
```

## Deployment

Deploy the `dist/` folder (after `npm run build`) to any static hosting:
- **Vercel**: `npx vercel`
- **Netlify**: Drag & drop `dist/` folder
- **GitHub Pages**, **Cloudflare Pages**, etc.

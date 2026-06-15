# Swaptics

A beauty product swap platform for India, built with modern web technologies.

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

# bioERGOtech Foundation

The official website and member portal for the bioERGOtech Foundation, built
with Next.js (App Router) and TypeScript, styled with Tailwind CSS and a
custom design system, and powered by Supabase for authentication and data.

## Tech stack

- **Framework:** [Next.js 16](https://nextjs.org) (App Router) with React 19
- **Language:** TypeScript
- **Styling:** [Tailwind CSS](https://tailwindcss.com) with a custom design
  system in `app/globals.css` (Poppins font, teal primary `#2EC4B6`, and
  `.card` / `.badge` / `.btn-primary` utilities)
- **UI components:** [shadcn/ui](https://ui.shadcn.com/) and
  [lucide-react](https://lucide.dev) icons
- **Auth and database:** [Supabase](https://supabase.com) via `@supabase/ssr`
- **Email:** [Resend](https://resend.com)
- **Document generation:** `docx`, `pptxgenjs`, `jspdf`, `qrcode` for
  certificates and exports
- **Maps:** Leaflet

## Project structure

```
app/                 Next.js App Router pages and API routes
  about-us/          Foundation pages (about, careers, contact, join-us, ...)
  articles/          Articles and newsletters
  auth/              Login, sign-up, password reset flows
  courses/           Course pages
  eventi/            Events and registration
  member-portal/     Authenticated member area
  protected/         Auth-gated routes
  api/               Route handlers (apply, contact, courses, events,
                     newsletter, webhooks, cron, ...)
components/          Shared React components
lib/
  supabase/          Supabase client, server, and proxy helpers
  eventi/            Event registration, email, and admin helpers
  certificate/       Certificate generation
supabase/
  migrations/        SQL migrations (profiles, membership, benefits, events)
public/              Static assets
```

## Getting started

### Prerequisites

- Node.js 20 or later
- A [Supabase project](https://database.new)

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Copy `.env.example` to `.env.local` and fill in your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-or-anon-key
```

Both values can be found in your
[Supabase project's API settings](https://supabase.com/dashboard/project/_?showConnect=true).
You can use either the new **publishable** key or the legacy **anon** key for
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.

Depending on the features you run locally, you may also need keys for Resend
and any webhook integrations. Add them to `.env.local` as required.

### 3. Apply database migrations

The SQL migrations under `supabase/migrations` define the profiles, membership
applications, member benefits, and event registration tables. Apply them to
your Supabase project using the
[Supabase CLI](https://supabase.com/docs/guides/local-development) or the SQL
editor in the dashboard.

### 4. Run the development server

```bash
npm run dev
```

The site runs on [localhost:3000](http://localhost:3000/).

## Scripts

| Command         | Description                       |
| --------------- | --------------------------------- |
| `npm run dev`   | Start the development server      |
| `npm run build` | Build the production bundle       |
| `npm run start` | Run the production build          |
| `npm run lint`  | Lint the project with ESLint      |

## Design system

The design system lives in `app/globals.css` and `tailwind.config.ts`. Keep the
existing fonts, colors, spacing, and utilities. The primary color is teal
`#2EC4B6`, used for CTAs, icons, and accents rather than large filled blocks.
Project conventions, including the writing style for copy, are documented in
`CLAUDE.md`.

## Deployment

The app is configured for deployment on Vercel (see `vercel.json`). Set the
Supabase environment variables in your Vercel project settings, then connect
the repository and deploy.

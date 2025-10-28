# ConnectCRE Platform

A modern, production-ready platform for commercial real estate news, projects, and professional networking.

## Tech Stack

- **Framework:** Next.js 16 (App Router) + React 19
- **Language:** TypeScript
- **Styling:** Tailwind CSS v4 + shadcn/ui
- **Database:** PostgreSQL (via Supabase) + Drizzle ORM
- **Authentication:** Clerk
- **Storage:** Supabase Storage
- **Maps:** Mapbox GL JS
- **Animations:** Framer Motion
- **State Management:** Zustand
- **Forms:** React Hook Form + Zod
- **Package Manager:** pnpm

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 9+
- Supabase account
- Clerk account
- Mapbox account

### 1. Clone and Install

```bash
cd connectcre-platform
pnpm install
```

### 2. Set Up Supabase

1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Go to **Settings > Database** and copy your connection string
3. Go to **Settings > API** and copy:
   - Project URL
   - Publishable key (anon key)
   - Secret key (service_role key)

### 3. Set Up Clerk

1. Create a new application at [clerk.com](https://clerk.com)
2. Enable Email + Google + LinkedIn sign-in methods
3. Copy your keys from the dashboard:
   - Publishable key
   - Secret key
4. Set up webhooks (see Webhooks section below)

### 4. Set Up Mapbox

1. Create account at [mapbox.com](https://mapbox.com)
2. Get your public access token from the dashboard

### 5. Configure Environment Variables

Create a `.env.local` file in the root directory:

```bash
cp .env.example .env.local
```

Fill in all the values:

```env
# Database
POSTGRES_URL=postgresql://postgres:[password]@[host]:[port]/[database]

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
SUPABASE_SECRET_KEY=your-secret-key

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxxxx
CLERK_SECRET_KEY=sk_test_xxxxx
CLERK_WEBHOOK_SECRET=whsec_xxxxx

# Mapbox
NEXT_PUBLIC_MAPBOX_TOKEN=pk.xxxxx

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 6. Push Database Schema

```bash
pnpm db:push
```

This will create all the necessary tables in your Supabase database.

### 7. Create Storage Buckets

In your Supabase dashboard, go to **Storage** and create these buckets:
- `articles` (public)
- `projects` (public)
- `companies` (public)
- `avatars` (public)

### 8. Run Development Server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

## Database Scripts

```bash
# Generate migrations from schema changes
pnpm db:generate

# Apply migrations
pnpm db:migrate

# Push schema directly to database (development)
pnpm db:push

# Open Drizzle Studio (database GUI)
pnpm db:studio
```

## Webhooks

### Clerk Webhooks

To sync user data from Clerk to your database:

1. Go to Clerk Dashboard > Webhooks
2. Add endpoint: `https://your-domain.com/api/webhooks/clerk`
3. Subscribe to events:
   - `user.created`
   - `user.updated`
   - `user.deleted`
4. Copy the signing secret to `CLERK_WEBHOOK_SECRET`

## Project Structure

```
src/
├── app/                    # Next.js app router pages
│   ├── (public)/          # Public routes (home, directory, etc.)
│   ├── (auth)/            # Auth routes (sign-in, sign-up)
│   ├── (dashboard)/       # Protected routes (bookmarks, messages)
│   ├── api/               # API routes and webhooks
│   ├── layout.tsx         # Root layout
│   └── globals.css        # Global styles
├── components/
│   ├── ui/                # shadcn/ui components
│   ├── layout/            # Layout components (header, footer)
│   ├── articles/          # Article-specific components
│   ├── projects/          # Project-specific components
│   ├── companies/         # Company-specific components
│   ├── shared/            # Shared components (map, search, etc.)
│   └── messages/          # Messaging components
├── lib/
│   ├── db/
│   │   ├── schema/        # Drizzle schema definitions
│   │   └── client.ts      # Database client
│   ├── actions/           # Server actions
│   ├── supabase/          # Supabase utilities
│   ├── constants.ts       # App constants
│   └── utils.ts           # Utility functions
├── hooks/                 # Custom React hooks
├── stores/                # Zustand stores
└── types/                 # TypeScript types
```

## Key Features

- **Home Feed:** Beautiful article grid with infinite scroll
- **Map View:** Interactive Mapbox map showing projects
- **Directory:** Company profiles and search
- **Bookmarks:** Save articles and projects
- **Messages:** User-to-user messaging
- **Company Profiles:** Team management and project showcases
- **Authentication:** Secure sign-in with Clerk
- **Image Galleries:** Stunning image carousels with zoom

## Next Steps

1. **Seed Data:** Create sample articles, projects, and companies
2. **Copy Components:** Migrate UI components from old repo (`../devprojects/`)
3. **Build Features:** Implement routes and functionality per CLAUDE.md plan
4. **Admin Panel:** Build CMS for content management
5. **Deploy:** Set up Vercel deployment

## Development Notes

- Use `pnpm` for all package management
- Follow the component structure in `src/components/`
- All database queries use Drizzle ORM
- All images go through Supabase Storage
- Authentication handled by Clerk middleware

## Resources

- [CLAUDE.md](./CLAUDE.md) - Complete rebuild plan and roadmap
- [Next.js Docs](https://nextjs.org/docs)
- [Drizzle ORM Docs](https://orm.drizzle.team)
- [Clerk Docs](https://clerk.com/docs)
- [Supabase Docs](https://supabase.com/docs)
- [shadcn/ui Docs](https://ui.shadcn.com)

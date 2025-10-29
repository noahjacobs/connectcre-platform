# DevProjects → ConnectCRE Platform Rebuild

> **Project Mission**: Transform DevProjects into a polished, production-ready platform for ConnectCRE.com, featuring exceptional UI/UX, clean architecture, and a simplified data model.

## ⚡ Current Status & Immediate Next Steps

### 🚧 **REALITY CHECK: Work In Progress**

**The platform is in ACTIVE DEVELOPMENT.** Here's what you need to know:

❌ **Not Everything Works Yet**
- Many features copied from devprojects are not fully functional
- Components are rendering but may have missing props, broken data flows, or incomplete logic
- Some modals, forms, and interactive elements need complete refactoring
- Map integration is basic - needs full connection to database queries
- Authentication flows are partially implemented

❌ **Visuals Not Fully Migrated**
- UI components copied from devprojects but not yet styled to match reference designs exactly
- **globals.css needs overhaul** - Colors, typography, spacing variables don't match devprojects
- Many layout issues, spacing problems, and responsive breakpoints need fixing
- Animations and micro-interactions need to be verified and polished
- Color schemes, typography, and theming may be inconsistent
- Missing components, icons, or visual elements in various places
- **Goal**: Match devprojects design pixel-perfect, but with cleaner implementation

⚠️ **Major Refactoring Required**
- **Next.js 16 Migration Issues**: We're on Next.js 16, devprojects was on older version
  - New App Router patterns may differ from reference code
  - React 19 changes (useFormState → useActionState, etc.)
  - Server Components vs Client Components boundaries need review
  - Caching behavior changed in Next.js 16
  - Some patterns from devprojects may not work the same way
- **Backend Integration**: Most components still using old data structures - need complete overhaul to work with simplified database schema
- **Logic Simplification**: Remove complex tracking features, unnecessary state management, and over-engineered solutions
  - **Important**: Keep the beautiful design, kill the complexity
  - Devprojects has over-engineered solutions we don't need
  - Strip out unnecessary abstractions while preserving visual quality
- **Data Fetching**: Standardize server actions, properly implement RLS, ensure efficient queries
- **Type Safety**: Many `any` types, missing interfaces, and type errors to fix
- **Performance**: Optimize bundle size, implement proper code splitting, fix hydration issues
- **Styling System**: globals.css, Tailwind config, CSS variables need alignment with devprojects visual style

🎯 **The Path Forward: No Stone Left Unturned**

This is a **COMPLETE REBUILD**, not just a copy-paste operation. Every single component, function, and feature needs to be:
1. **Reviewed** - Does it match our simplified architecture?
2. **Refactored** - Remove complexity, fix data flows, proper typing
3. **Tested** - Ensure it works with our new backend
4. **Polished** - Match or exceed the visual quality of devprojects
5. **Optimized** - Performance, accessibility, user experience

**We have significant work ahead. This document serves as the roadmap.**

---

### ✅ Completed (Foundation Only)
1. **Project Setup**: New Next.js 16 + React 19 repo initialized
2. **Database Schema**: Simplified Drizzle schema created with RLS policies
   - profiles, companies, company_members, projects, articles, bookmarks, messages
3. **Authentication**: Clerk integrated with native Supabase support (no JWT templates)
4. **Supabase Setup**: RLS policies configured, proper auth flow working
5. **Dependencies**: Core packages installed (@silk-hq/components, @heroui/react, etc.)
6. **CSS Setup**: globals.css copied with Tailwind v4 + custom theme
7. **Initial Component Copy**: Basic structure from devprojects copied (needs extensive refactoring)
8. **Provider Setup**: All context providers configured (Auth, Supabase, Subscription, etc.)

### 🔄 In Progress (Lots of Work Remaining)
- **Component Migration**: Copying and adapting UI components from devprojects
- **Database Integration**: Connecting all components to simplified schema
- **Bug Fixes**: Resolving TypeScript errors, missing exports, prop mismatches
- **Visual Polish**: Bringing design quality up to devprojects standards
- **Feature Implementation**: Making copied features actually work

### 📋 Next Immediate Tasks
1. **Create comprehensive seed data** - Realistic demo content for all tables
2. **Fix all broken components** - Resolve prop errors, missing data, type issues
3. **Refactor data fetching** - Proper server actions with new schema
4. **Update all visuals** - Match devprojects design quality
5. **Test everything** - Ensure every feature works end-to-end
6. **Performance audit** - Optimize bundle, fix hydration, improve LCP

## 📁 Repository Structure

This CLAUDE.md file lives in the new `connectcre-platform` repository. The old codebase is located in the `devprojects` folder (sibling directory) for reference when copying components.

```
noah.dev/
├── devprojects/              # OLD REPO - Reference only
│   ├── app/
│   ├── features/
│   ├── components/
│   ├── lib/
│   └── ...
└── connectcre-platform/      # NEW REPO - Build here
    ├── CLAUDE.md             # This file
    ├── src/
    └── ...
```

**When copying components:** All references to the old codebase point to `../devprojects/`

## 📋 Executive Summary

This document outlines the complete rebuild of the DevProjects platform to deliver to ConnectCRE.com. The goal is to create a modern, maintainable, and visually stunning platform that showcases the best UI/UX from the old system while starting fresh with a cleaner architecture.

### Key Decisions to Make

1. **New Repository vs. In-Place Upgrade?**
   - ✅ **DECIDED: New Repository** (`connectcre-platform`)
   - Rationale: Clean slate, no legacy baggage, easier handoff
   - Selectively copy best components from `../devprojects/` folder

2. **Database Strategy**
   - ✅ **Recommended: Fresh Supabase Instance**
   - Simplified schema focused on core entities
   - Better naming conventions
   - Proper RLS policies from the start

3. **Content Management**
   - ✅ **Recommended: Supabase-based Admin Panel** (see CMS section)
   - Most cost-effective and integrated
   - Full control over editing experience

---

## 🎯 Core Objectives

### 🔧 Refactoring Philosophy

**CRITICAL**: This is not a 1:1 port. We are strategically rebuilding with these principles:

1. **Simplify Logic, Preserve Beauty** ⭐ **MOST IMPORTANT**
   - **Design Goal**: Match devprojects visually pixel-perfect (or better)
     - Copy exact spacing, colors, typography, animations from devprojects
     - Use devprojects as the visual reference/benchmark
     - globals.css should match devprojects styling system
     - Component styles should look identical to reference
   - **Logic Goal**: Kill the complexity, keep only what's needed
     - Strip out over-engineered solutions from devprojects
     - Remove unnecessary state management and complex data flows
     - Eliminate features we're not using (tracking tab, complex alerts, etc.)
     - Simplify data fetching - no need for complex caching layers
     - Remove abstractions that don't add value
   - **Remember**: Beautiful UI with simple, maintainable code underneath

2. **Backend-First Integration**
   - Every component must work with the simplified database schema
   - All queries must respect RLS policies
   - Server actions for mutations, client queries for reads
   - No shortcuts - proper TypeScript types throughout

3. **Quality Over Speed**
   - Better to refactor one component perfectly than copy ten poorly
   - Each component should be production-ready before moving on
   - Test thoroughly with real data (seed scripts)
   - No `any` types, no temporary hacks, no "fix later" comments

4. **No Stone Left Unturned**
   - Review every single component, hook, and utility
   - Question every line of code: "Do we need this?"
   - Optimize for maintainability and handoff to ConnectCRE team
   - Document complex logic, architectural decisions

---

### What We're Keeping (The Good Stuff)

1. **Article Feed with Map View**
   - Beautiful card-based article/post grid
   - Integrated Mapbox map view
   - Smooth toggle between list and map modes
   - Filter/search integration

2. **Modal System**
   - Engaging modal views that keep users on the page
   - PostModal for article details
   - ProjectModal for project details
   - Smooth animations and transitions

3. **Image Galleries**
   - Stunning image carousels (Swiper/Embla)
   - Zoom and pan functionality
   - Full-screen gallery mode
   - Multiple image layout options

4. **Directory/Marketplace**
   - Company directory with profiles
   - Clean card layouts
   - Search and filtering

5. **Messages System**
   - User-to-user and company messaging
   - Thread-based conversations
   - Clean message UI

6. **Company Profiles**
   - Verified company pages
   - Project portfolios
   - Team management

### What We're Changing

1. **Tracking Tab → Bookmarks**
   - Remove complex project tracking with alerts/rules
   - Simple "saved items" (articles + projects)
   - One unified bookmarks view

2. **Remove Data Tab**
   - No data table views
   - Focus on content discovery

3. **Simplified Navigation**
   - Home (Feed + Map)
   - Directory (Companies)
   - Bookmarks (Saved Items)
   - Messages
   - Company Profile (when logged in as company)

---

## 🔨 Critical Refactoring Roadmap

**BEFORE continuing with the full to-do list below, we must systematically refactor what we've already copied.**

### 🎯 Refactoring Priorities (Do These First!)

#### Priority 1: Fix Broken Foundations
- [ ] **Resolve all TypeScript errors** - No more `any` types, fix all missing exports
- [ ] **Fix component prop mismatches** - Many components expecting props that don't exist
- [ ] **Standardize data types** - Create proper interfaces for all data structures
- [ ] **Test all context providers** - Ensure Auth, Supabase, Subscription contexts work correctly
- [ ] **Fix routing issues** - Ensure all tabs/navigation work properly

#### Priority 2: Database Integration
- [ ] **Audit all data fetching** - Replace old Sanity queries with Supabase queries
- [ ] **Create server actions** - Proper server actions for all mutations (articles, projects, bookmarks, messages)
- [ ] **Implement RLS checks** - Ensure all queries respect Row Level Security
- [ ] **Add proper error handling** - Graceful failures, user-friendly error messages
- [ ] **Create seed data first** - Can't test without real data!

#### Priority 3: Visual Overhaul (Design System First, Then Components)

**Step 1: Fix globals.css & Design System**
- [ ] **Compare globals.css** - Side-by-side with devprojects/app/globals.css
- [ ] **CSS Variables** - Copy exact color palette, spacing scale, typography from devprojects
- [ ] **Tailwind Config** - Match theme configuration to devprojects
- [ ] **Font Setup** - Ensure same fonts, weights, line-heights as reference
- [ ] **Dark Mode** - Copy exact dark mode color scheme
- [ ] **Base Styles** - Match body, headings, links, etc.

**Step 2: Component-by-Component Visual Matching**
Each component needs this checklist:
- [ ] **Screenshot devprojects reference** - Take screenshot of how it should look
- [ ] **Compare current implementation** - Side-by-side visual comparison
- [ ] **Fix layout/spacing** - Match exact spacing, padding, margins from reference
- [ ] **Fix colors** - Use exact same color variables as devprojects
- [ ] **Fix typography** - Match font sizes, weights, line heights
- [ ] **Verify animations** - Ensure smooth transitions, proper easing, same timing
- [ ] **Test responsiveness** - Mobile, tablet, desktop breakpoints match reference
- [ ] **Accessibility audit** - Keyboard nav, screen readers, ARIA labels
- [ ] **Performance check** - Lazy loading, code splitting, bundle size

#### Priority 4: Feature-by-Feature Verification

**Home Feed**
- [ ] Article grid renders with proper data from database
- [ ] Map integration works (Mapbox shows correct pins)
- [ ] Search and filters function correctly
- [ ] View mode toggles (list/split/map) work
- [ ] Article modals open with full content
- [ ] Infinite scroll/pagination works

**Messages**
- [ ] Thread list loads from database
- [ ] Can send new messages
- [ ] Real-time updates work (Supabase Realtime)
- [ ] Message composer functions
- [ ] Notifications trigger correctly

**Directory**
- [ ] Company cards render properly
- [ ] Company modals show full details
- [ ] Company claim flow works
- [ ] Company profiles are editable by members

**Company Dashboard**
- [ ] Team management works
- [ ] Project management works
- [ ] Settings update correctly
- [ ] Billing integration (if applicable)

### 🔄 Refactoring Workflow (For Each Component)

1. **Identify** - Which devprojects component are we refactoring?
2. **Compare** - Side-by-side visual comparison
3. **Analyze** - What data does it need? What's the simplified equivalent?
4. **Refactor** - Rewrite data fetching, fix types, simplify logic
5. **Style** - Match visual design exactly
6. **Test** - With real seed data, verify all functionality
7. **Optimize** - Performance, accessibility, code quality
8. **Document** - Add comments for complex logic
9. **Move On** - Mark as complete, go to next component

### 📊 Progress Tracking

Create a spreadsheet or markdown checklist with:
- Component name
- Status (Not Started / In Progress / Needs Review / Complete)
- Visual match? (Yes/No)
- Backend working? (Yes/No)
- Responsive? (Yes/No)
- Performance OK? (Yes/No)

**Example:**
```
| Component           | Status      | Visual | Backend | Responsive | Performance |
|---------------------|-------------|--------|---------|------------|-------------|
| ArticleCard         | Complete    | ✅     | ✅      | ✅         | ✅          |
| PostModal           | In Progress | ⚠️     | ❌      | ✅         | ⚠️          |
| CompanyProfile      | Not Started | ❌     | ❌      | ❌         | ❌          |
```

---

## 🚀 Complete To-Do List

**NOTE:** The phases below are the FULL roadmap. Before diving deep into new phases, complete the Refactoring Roadmap above to ensure a solid foundation.

### Phase 1: Project Setup & Migration

#### 1.1 Repository & Infrastructure Setup

- [x] Create new repository `connectcre-platform` (done manually)
- [x] Initialize Next.js 16 project (done manually)
  ```bash
  npx create-next-app@latest connectcre-platform --typescript --tailwind --app
  ```
- [x] Move CLAUDE.md to new repo (done manually)
- [ ] Set up Doppler for secrets management
- [ ] Create new Supabase project (production-ready instance)
- [ ] Configure Vercel project for deployment
- [ ] Set up GitHub Actions for CI/CD
- [ ] Create development, staging, and production environments

#### 1.2 ~~Next.js 16 Upgrade~~ (Not Needed - New Repo)

**Note:** Since we're starting fresh with a new Next.js 16 project, no migration is needed. Skip this section.

#### 1.3 Core Dependencies Installation

- [ ] Install shadcn/ui components
- [ ] Install Tailwind CSS v4 (if using new repo)
- [ ] Install Supabase client (@supabase/ssr, @supabase/supabase-js)
- [ ] Install Drizzle ORM (drizzle-orm, drizzle-kit)
- [ ] Install Clerk for authentication (@clerk/nextjs)
- [ ] Install Mapbox GL JS (mapbox-gl, react-map-gl)
- [ ] Install Framer Motion for animations
- [ ] Install Zustand for state management
- [ ] Install React Hook Form + Zod for forms
- [ ] Install image gallery libraries (embla-carousel-react, react-zoom-pan-pinch)
- [ ] Install Stripe for payments
- [ ] Install date utilities (date-fns)
- [ ] Install Lucide icons
- [ ] Install Sonner for toasts

### Phase 2: Database Architecture ✅ COMPLETED

#### 2.1 Design Simplified Schema ✅

**Core Tables:** (All created in `src/lib/db/schema/`)

- [x] `profiles` - User profiles with clerk_id, email, full_name, avatar_url, persona
- [x] `companies` - Company directory with verification status
- [x] `company_members` - Team management with roles
- [x] `projects` - Real estate projects with location data
- [x] `articles` - News articles/posts with rich content
- [x] `bookmarks` - Saved items (replaces tracking)
- [x] `message_threads` - Conversation threads
- [x] `messages` - Individual messages

#### 2.2 Database Implementation ✅

- [x] Create Drizzle schema definitions
- [x] Set up proper indexes for performance
- [x] Configure Row Level Security (RLS) policies
- [x] Run `pnpm db:push` successfully
- [ ] **NEXT:** Create seed data script with realistic demo content
  - 50+ high-quality articles with images
  - 30+ projects with locations in major cities
  - 20+ companies with profiles
  - Sample user profiles
- [ ] Run seed script and verify data

### Phase 3: Content Management System

#### 3.1 CMS Evaluation & Decision

**Option A: Supabase Admin Panel (Recommended)**
- [ ] Build custom admin dashboard at `/admin`
- [ ] Create rich text editor integration (Tiptap or similar)
- [ ] Image upload to Supabase Storage
- [ ] Article CRUD operations
- [ ] Project CRUD operations
- [ ] Draft/publish workflow
- [ ] Role-based access (editor, admin)

**Option B: Headless CMS Integration**
- [ ] Evaluate Sanity vs Payload CMS vs Strapi
- [ ] Set up CMS instance
- [ ] Configure content models
- [ ] Create sync scripts to Supabase
- [ ] Build webhooks for real-time sync

**Option C: Supawald (for file management)**
- [ ] Install Supawald for Supabase Storage
- [ ] Configure file organization
- [ ] Set up image optimization

**Decision Made:** ________________

#### 3.2 Admin Panel Implementation (if Option A)

- [ ] Create `/admin` route with authentication
- [ ] Build article editor
  - Rich text editor with image embeds
  - Title, subtitle, content fields
  - Image gallery management
  - Tags and categories
  - City/neighborhood assignment
  - Project linking
  - SEO fields (meta description, etc.)
  - Publish/draft toggle
- [ ] Build project editor
  - Basic info (title, description, address)
  - Geocoding for address → lat/lng
  - Image gallery management
  - Status tracking
  - Company assignment
  - Property type selection
- [ ] Build company editor
  - Company details form
  - Logo upload
  - Verification workflow
- [ ] Create approval workflows for user-submitted content

### Phase 4: Core UI/UX Components

#### 4.1 Copy & Adapt Components from Old Repo

**From `../devprojects/features/home/components/`:**
- [ ] `dynamic-post-grid.tsx` → Article grid with infinite scroll
- [ ] `post-modal.tsx` → Article detail modal
- [ ] `project-modal.tsx` → Project detail modal
- [ ] `hero-section.tsx` → Landing page hero
- [ ] `action-search-bar.tsx` → Search interface

**From `../devprojects/features/map/components/`:**
- [ ] `map.tsx` → Mapbox integration
- [ ] Map markers and clustering
- [ ] Map controls (zoom, style toggle)
- [ ] Location search integration

**From `../devprojects/features/companies/components/`:**
- [ ] Company card components
- [ ] Company profile layout
- [ ] Company claim flow

**From `../devprojects/features/messages/components/`:**
- [ ] Message thread list
- [ ] Message conversation view
- [ ] Message composer

**Note:** Adapt imports and paths when copying. The old repo uses a different structure.

#### 4.2 Build New Components

- [ ] `BookmarksView` - Unified saved items view
  - Toggle between articles and projects
  - Grid layout matching home feed
  - Remove/unsave functionality

- [ ] `ImageGallery` - Enhanced gallery component
  - Thumbnail grid
  - Full-screen modal view
  - Zoom and pan
  - Swipe/keyboard navigation
  - Share functionality

- [ ] `SearchBar` - Global search
  - Search articles, projects, companies
  - Autocomplete suggestions
  - Recent searches
  - Filter integration

- [ ] `FilterPanel` - Advanced filtering
  - City selection
  - Property types
  - Status filters
  - Date ranges
  - Company types

### Phase 5: Feature Implementation

#### 5.1 Home Feed & Map

- [ ] Create `/` homepage route
- [ ] Implement article grid with pagination
- [ ] Add map view toggle
- [ ] Integrate Mapbox with article markers
- [ ] Implement clustering for dense areas
- [ ] Add filter sidebar
- [ ] Implement search functionality
- [ ] Add sorting options (newest, trending, etc.)
- [ ] Optimize for performance (image lazy loading, etc.)

#### 5.2 Directory

- [ ] Create `/directory` route
- [ ] Build company grid/list view
- [ ] Add company search and filters
- [ ] Implement company profile pages `/directory/[slug]`
  - Company details
  - Related projects
  - Team members (if public)
  - Contact form
- [ ] Add "Claim Company" flow for users

#### 5.3 Bookmarks

- [ ] Create `/bookmarks` route
- [ ] Implement bookmark toggle on articles/projects
- [ ] Build unified saved items view
- [ ] Add remove/unsave functionality
- [ ] Add empty state with suggestions
- [ ] Add search within bookmarks

#### 5.4 Messages

- [ ] Create `/messages` route
- [ ] Implement thread list view
- [ ] Build conversation interface
- [ ] Add real-time updates (Supabase Realtime)
- [ ] Add message composer with validation
- [ ] Add "Start Conversation" flow
- [ ] Implement read receipts
- [ ] Add notifications for new messages

#### 5.5 Company Profile

- [ ] Create `/company/[slug]` route for public view
- [ ] Create `/company/dashboard` route for members
- [ ] Build team management interface
  - Invite members
  - Manage roles
  - Remove members
- [ ] Build project management
  - Add/edit company projects
  - Submit for approval (if needed)
- [ ] Company settings page
  - Update company details
  - Upload logo
  - Manage billing (if applicable)

### Phase 6: Authentication & User Management

#### 6.1 Clerk Setup

- [ ] Configure Clerk application
- [ ] Set up social logins (Google, LinkedIn)
- [ ] Create custom sign-in/sign-up pages
- [ ] Implement user sync to Supabase (webhooks)
- [ ] Add user profile page
- [ ] Implement persona selection on signup
- [ ] Add email verification
- [ ] Configure session management

#### 6.2 Authorization

- [ ] Implement role-based access control (RBAC)
  - User roles: user, editor, admin
  - Company roles: owner, admin, member
- [ ] Protect admin routes
- [ ] Protect company dashboard routes
- [ ] Add permission checks to server actions

### Phase 7: Polish & UX Enhancements

#### 7.1 Animations & Micro-interactions

- [ ] Add page transitions (Framer Motion)
- [ ] Animate modal open/close
- [ ] Add hover states to cards
- [ ] Implement smooth scrolling
- [ ] Add loading skeletons for all data fetching
- [ ] Add optimistic UI updates
- [ ] Add toast notifications for actions
- [ ] Add empty states with illustrations

#### 7.2 Mobile Responsiveness

- [ ] Test and optimize for mobile (320px+)
- [ ] Test tablet layouts (768px+)
- [ ] Optimize touch targets (min 44px)
- [ ] Add mobile navigation menu
- [ ] Test map on mobile devices
- [ ] Optimize image sizes for mobile

#### 7.3 Performance Optimization

- [ ] Implement image optimization (Next.js Image)
- [ ] Add lazy loading for images
- [ ] Implement route prefetching
- [ ] Optimize bundle size
  - Code splitting
  - Dynamic imports
  - Tree shaking
- [ ] Add caching strategies
  - Static generation where possible
  - ISR for semi-dynamic content
  - Client-side caching (SWR or TanStack Query)
- [ ] Optimize database queries
  - Use indexes
  - Limit results
  - Pagination
- [ ] Add performance monitoring (Vercel Analytics)
- [ ] Achieve Lighthouse score 90+ on all pages

#### 7.4 SEO & Metadata

- [ ] Add proper metadata to all pages
- [ ] Implement Open Graph tags
- [ ] Add Twitter Card tags
- [ ] Create sitemap.xml
- [ ] Add robots.txt
- [ ] Implement JSON-LD structured data
- [ ] Add canonical URLs
- [ ] Optimize images with alt text

### Phase 8: Testing & Quality Assurance

#### 8.1 Functional Testing

- [ ] Test all user flows
  - Sign up → persona selection → home feed
  - Browse articles → open modal → bookmark
  - Search → filter → view results
  - Browse directory → view company → contact
  - Send message → receive → reply
  - Claim company → invite team → manage
- [ ] Test authentication flows
- [ ] Test authorization (access control)
- [ ] Test form validations
- [ ] Test error states and handling

#### 8.2 Cross-browser Testing

- [ ] Chrome/Edge
- [ ] Firefox
- [ ] Safari (macOS & iOS)
- [ ] Mobile browsers (iOS Safari, Chrome Android)

#### 8.3 Accessibility (A11y)

- [ ] Run axe DevTools audit
- [ ] Test keyboard navigation
- [ ] Test screen reader compatibility
- [ ] Ensure proper heading hierarchy
- [ ] Add ARIA labels where needed
- [ ] Test color contrast ratios (WCAG AA)
- [ ] Add focus indicators

### Phase 9: Data Migration & Seeding

#### 9.1 Create Seed Data

- [ ] Write compelling sample articles (50+)
  - Real estate news style
  - High-quality images
  - Proper locations (cities across US)
  - Varied content types
- [ ] Create sample projects (30+)
  - Mix of statuses
  - Various property types
  - Different cities
  - Quality images
- [ ] Create sample companies (20+)
  - Different categories
  - Complete profiles
  - Logos
- [ ] Add sample user profiles (10+)
  - Various personas
  - Complete profiles

#### 9.2 Optional: Migrate Existing Data

**Only if keeping valuable production data:**

- [ ] Analyze current data quality
- [ ] Create data transformation scripts
- [ ] Map old schema to new schema
- [ ] Migrate articles
  - Transform content format
  - Migrate images to Supabase Storage
  - Update relationships
- [ ] Migrate projects
- [ ] Migrate companies
- [ ] Test migrated data
- [ ] Verify data integrity

### Phase 10: Python Scripts & Data Pipeline

**Optional: If ConnectCRE wants auto-ingestion of news**

#### 10.1 Adapt Existing Scripts

**Python scripts are located in `../devprojects/scripts/`:**

- [ ] Review Python scripts from old repo
  - `cre-news-crawler.py` - News scraping
  - `cre-article-processor.py` - Content processing
  - `pipeline_phase_1_article_fetch.py` - Article fetching
  - `pipeline_phase_2_project_analysis.py` - Project analysis
- [ ] Copy to new repo `scripts/` folder
- [ ] Update scripts for new database schema
- [ ] Update Supabase connection strings
- [ ] Modernize code (Python 3.11+)
- [ ] Add error handling and logging
- [ ] Add data validation

#### 10.2 Deployment

- [ ] Set up cron jobs or scheduled tasks
- [ ] Deploy scripts to server (Railway, Render, or AWS Lambda)
- [ ] Add monitoring and alerting
- [ ] Create admin dashboard for pipeline status

### Phase 11: Documentation & Handoff

#### 11.1 Code Documentation

- [ ] Add inline comments for complex logic
- [ ] Document component props (JSDoc/TSDoc)
- [ ] Create README.md with setup instructions
- [ ] Document database schema
- [ ] Document API routes
- [ ] Create architecture diagrams

#### 11.2 User Documentation

- [ ] Create admin user guide
  - How to add articles
  - How to manage projects
  - How to verify companies
- [ ] Create end-user guide
  - How to use the platform
  - How to save items
  - How to message companies
- [ ] Create company guide
  - How to claim profile
  - How to manage team
  - How to showcase projects

#### 11.3 Developer Handoff

- [ ] Create deployment guide
- [ ] Document environment variables
- [ ] Document Supabase setup
- [ ] Document third-party services (Clerk, Mapbox, Stripe)
- [ ] Create troubleshooting guide
- [ ] Hand over credentials securely
- [ ] Schedule knowledge transfer sessions

### Phase 12: Deployment & Launch

#### 12.1 Pre-launch Checklist

- [ ] Set up production environment variables
- [ ] Configure production Supabase instance
- [ ] Set up production Clerk instance
- [ ] Configure domain (connectcre.com or similar)
- [ ] Set up SSL certificate
- [ ] Configure CDN for images
- [ ] Set up error monitoring (Sentry)
- [ ] Set up analytics (Vercel Analytics, Google Analytics)
- [ ] Test payment flows (if applicable)
- [ ] Create backup strategy

#### 12.2 Launch

- [ ] Deploy to Vercel production
- [ ] Test production deployment
- [ ] Set up monitoring dashboards
- [ ] Configure alerts
- [ ] Run final QA on production
- [ ] Prepare rollback plan
- [ ] Go live!

#### 12.3 Post-launch

- [ ] Monitor error rates
- [ ] Monitor performance metrics
- [ ] Gather user feedback
- [ ] Fix critical bugs
- [ ] Plan next iteration

---

## 📐 Technical Architecture

### Recommended Tech Stack

```
Frontend:
- Next.js 16 (App Router)
- React 19
- TypeScript
- Tailwind CSS v4
- shadcn/ui components
- Framer Motion

Backend:
- Supabase (PostgreSQL, Auth, Storage, Realtime)
- Drizzle ORM (schema management only, NOT for queries)

Authentication:
- Clerk (with native Supabase integration)

**Important Architecture Note:**
- Drizzle ORM is used ONLY for schema definitions and migrations (`pnpm db:push`)
- All queries use Supabase client to respect Row Level Security (RLS)
- Direct Postgres queries via Drizzle would bypass RLS policies!

Maps:
- Mapbox GL JS
- React Map GL

Payments:
- Stripe

Forms:
- React Hook Form
- Zod validation

State Management:
- Zustand
- React Context
- TanStack Query (optional)

Deployment:
- Vercel
```

### Clerk + Supabase Integration

**Important:** We use Clerk's **native Supabase integration** (NOT deprecated JWT templates).

#### How It Works

1. **Clerk manages authentication** - Sign-up, sign-in, sessions, user management
2. **Clerk webhooks sync users** - `user.created` event creates profile in database
3. **Clerk session tokens are passed to Supabase** - Automatically injected via custom fetch
4. **Supabase client handles all queries** - Respects RLS policies automatically
5. **RLS policies verify access** - Using `auth.jwt() ->> 'sub'` to check Clerk user ID
6. **Drizzle manages schema only** - Used for `pnpm db:push` and type generation

#### Setup Steps

1. **Enable Clerk → Supabase Integration:**
   - Go to Clerk Dashboard → Integrations → Supabase
   - Copy your Clerk Frontend API URL

2. **Configure Supabase:**
   - Go to Supabase Dashboard → Authentication → Providers
   - Add Clerk as third-party auth provider
   - Paste Clerk Frontend API URL

3. **Set up Clerk Webhook:**
   - Go to Clerk Dashboard → Webhooks → Add Endpoint
   - URL: `https://your-domain.com/api/webhooks/clerk`
   - Subscribe to: `user.created`, `user.updated`, `user.deleted`
   - Copy webhook secret to `CLERK_WEBHOOK_SECRET` in `.env.local`
   - See [CLERK_WEBHOOK_SETUP.md](./CLERK_WEBHOOK_SETUP.md) for detailed guide

4. **Database has RLS enabled:**
   - All tables have Row Level Security policies
   - Policies check `auth.jwt() ->> 'sub'` against `clerk_id` in profiles table
   - Anonymous users can read published articles/projects
   - Authenticated users can only modify their own data

#### Code Usage

**Server Components/Actions:**
```typescript
import { createServerSupabaseClient } from '@/lib/supabase/server';

const supabase = await createServerSupabaseClient();
const { data } = await supabase.from('articles').select('*');
```

**Client Components:**
```typescript
'use client'
import { useSupabase } from '@/lib/supabase/client';

const supabase = useSupabase();
const { data } = await supabase.from('articles').select('*');
```

**Storage Operations:**
```typescript
// Server-side
import { uploadFile } from '@/lib/supabase/storage';
const url = await uploadFile('ARTICLES', 'image.jpg', file);

// Client-side
import { uploadFileClient } from '@/lib/supabase/storage';
const supabase = useSupabase();
const url = await uploadFileClient(supabase, 'ARTICLES', 'image.jpg', file);
```

#### RLS Policy Examples

**Profiles** (users can only access their own):
```sql
using: clerk_id = (SELECT (auth.jwt() ->> 'sub'))
```

**Articles** (anyone can read published, only authors can modify):
```sql
select: published_at IS NOT NULL
update/delete: author_id = (SELECT id FROM profiles WHERE clerk_id = (SELECT (auth.jwt() ->> 'sub')))
```

**Companies** (all can read, only members can modify):
```sql
select: true
update/delete: EXISTS (SELECT 1 FROM company_members WHERE company_id = id AND user_id = ...)
```

### File Structure (New Repo)

```
connectcre-platform/
├── app/
│   ├── (public)/
│   │   ├── page.tsx                 # Home feed + map
│   │   ├── directory/
│   │   │   ├── page.tsx             # Company directory
│   │   │   └── [slug]/page.tsx      # Company profile
│   │   └── project/[slug]/page.tsx  # Project detail page
│   ├── (auth)/
│   │   ├── sign-in/[[...sign-in]]/page.tsx
│   │   └── sign-up/[[...sign-up]]/page.tsx
│   ├── (dashboard)/
│   │   ├── bookmarks/page.tsx       # Saved items
│   │   ├── messages/page.tsx        # Messages
│   │   └── company/
│   │       ├── dashboard/page.tsx   # Company dashboard
│   │       └── settings/page.tsx    # Company settings
│   ├── (admin)/
│   │   └── admin/
│   │       ├── page.tsx             # Admin dashboard
│   │       ├── articles/page.tsx    # Article management
│   │       ├── projects/page.tsx    # Project management
│   │       └── companies/page.tsx   # Company approvals
│   ├── api/
│   │   ├── webhooks/
│   │   │   ├── clerk/route.ts       # Clerk webhooks
│   │   │   └── stripe/route.ts      # Stripe webhooks
│   │   └── trpc/[trpc]/route.ts     # tRPC API (optional)
│   ├── layout.tsx
│   └── globals.css
├── components/
│   ├── ui/                          # shadcn/ui components
│   ├── layout/
│   │   ├── header.tsx
│   │   ├── footer.tsx
│   │   └── sidebar.tsx
│   ├── articles/
│   │   ├── article-card.tsx
│   │   ├── article-grid.tsx
│   │   └── article-modal.tsx
│   ├── projects/
│   │   ├── project-card.tsx
│   │   ├── project-modal.tsx
│   │   └── project-map-marker.tsx
│   ├── companies/
│   │   ├── company-card.tsx
│   │   └── company-header.tsx
│   ├── shared/
│   │   ├── image-gallery.tsx
│   │   ├── search-bar.tsx
│   │   ├── filter-panel.tsx
│   │   └── map-view.tsx
│   └── messages/
│       ├── thread-list.tsx
│       └── conversation.tsx
├── lib/
│   ├── db/
│   │   ├── schema/
│   │   │   ├── profiles.ts
│   │   │   ├── companies.ts
│   │   │   ├── projects.ts
│   │   │   ├── articles.ts
│   │   │   ├── bookmarks.ts
│   │   │   └── messages.ts
│   │   ├── index.ts
│   │   └── client.ts
│   ├── actions/
│   │   ├── articles.ts              # Server actions for articles
│   │   ├── projects.ts
│   │   ├── companies.ts
│   │   ├── bookmarks.ts
│   │   └── messages.ts
│   ├── supabase/
│   │   ├── client.ts                # Client-side Supabase
│   │   ├── server.ts                # Server-side Supabase
│   │   └── storage.ts               # Storage utilities
│   ├── clerk.ts
│   ├── mapbox.ts
│   ├── utils.ts
│   └── constants.ts
├── hooks/
│   ├── use-articles.ts
│   ├── use-bookmarks.ts
│   ├── use-map.ts
│   └── use-messages.ts
├── stores/
│   ├── ui-store.ts
│   ├── map-store.ts
│   └── modal-store.ts
├── types/
│   ├── database.ts                  # Generated from Drizzle
│   ├── api.ts
│   └── index.ts
├── public/
│   ├── images/
│   └── fonts/
├── scripts/
│   ├── seed.ts                      # Seed script
│   └── migrate.ts
├── drizzle/
│   └── migrations/
├── .env.example
├── .env.local                       # Local secrets (gitignored)
├── drizzle.config.ts
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── package.json
└── README.md
```

---

## 🎨 Design System

### Colors

Keep the current color scheme or modernize:
```css
/* Example palette */
--primary: HSL values for main brand color
--secondary: HSL values
--accent: HSL values
--muted: HSL values for backgrounds
--destructive: Red for errors
```

### Typography

- Headings: Use a modern sans-serif (Inter, Geist, or similar)
- Body: Same font family for consistency
- Code: Monospace for technical content

### Components

Use shadcn/ui for consistency:
- Buttons
- Cards
- Dialogs/Modals
- Forms
- Navigation
- Data tables (if needed)

---

## 🗄️ Database Schema Reference

### Simplified ERD

```
profiles
├── id (PK)
├── clerk_id (unique)
├── email
├── full_name
├── avatar_url
├── persona
├── created_at
└── updated_at

companies
├── id (PK)
├── slug (unique)
├── name
├── description
├── logo_url
├── website_url
├── contact_email
├── contact_phone
├── categories[] (array)
├── status (pending/approved)
├── is_verified
├── created_at
└── updated_at

company_members
├── id (PK)
├── company_id (FK → companies)
├── user_id (FK → profiles)
├── role (owner/admin/member)
└── created_at

projects
├── id (PK)
├── slug (unique)
├── title
├── description
├── address
├── latitude
├── longitude
├── city
├── neighborhood
├── status
├── property_types[] (array)
├── images (jsonb)
├── metadata (jsonb)
├── company_id (FK → companies)
├── created_at
├── updated_at
└── published_at

articles
├── id (PK)
├── slug (unique)
├── title
├── subtitle
├── content (jsonb rich text)
├── images (jsonb)
├── author_id (FK → profiles or companies)
├── project_id (FK → projects, optional)
├── city
├── neighborhood
├── tags[] (array)
├── created_at
├── updated_at
└── published_at

bookmarks
├── id (PK)
├── user_id (FK → profiles)
├── item_type (article/project)
├── item_id (polymorphic)
└── created_at

message_threads
├── id (PK)
├── participant_a_id (FK → profiles or companies)
├── participant_b_id (FK → profiles or companies)
├── last_message_at
└── created_at

messages
├── id (PK)
├── thread_id (FK → message_threads)
├── sender_id (FK → profiles or companies)
├── content
├── read_at
└── created_at
```

---

## 🔍 CMS Decision Matrix

| Criteria | Supabase Admin Panel | Sanity | Payload CMS | Strapi |
|----------|---------------------|--------|-------------|--------|
| **Cost** | Free (DIY) | $0-99/mo | Self-hosted or Cloud | Self-hosted or Cloud |
| **Setup Time** | Medium (custom build) | Fast | Medium | Medium |
| **Integration** | Native (Supabase) | API sync needed | API sync needed | API sync needed |
| **Flexibility** | Total control | High | High | High |
| **Learning Curve** | Low (custom React) | Medium | Medium | Medium |
| **Rich Text** | Tiptap/SlateJS | Portable Text | SlateJS | Markdown/Rich |
| **Image Handling** | Supabase Storage | Sanity CDN | Local/Cloud | Local/Cloud |
| **Real-time** | Yes (Supabase) | Yes | No | No |
| **Handoff** | Easy (in codebase) | Separate service | Separate service | Separate service |

**Recommendation:** Start with **Supabase Admin Panel** for simplicity and control. Can migrate to a headless CMS later if needed.

---

## 🚦 Success Criteria

### Must-Haves (MVP)

- [ ] Beautiful article feed with images
- [ ] Interactive map view with project markers
- [ ] Smooth modal interactions
- [ ] Company directory with search
- [ ] Bookmarks (saved items)
- [ ] Working authentication
- [ ] Mobile responsive
- [ ] Fast performance (Lighthouse 90+)
- [ ] Seed data showcasing capabilities

### Nice-to-Haves (V2)

- [ ] Advanced search with filters
- [ ] Comments on articles
- [ ] User profiles with activity
- [ ] Email notifications
- [ ] Push notifications
- [ ] Social sharing
- [ ] Analytics dashboard for companies
- [ ] Subscription/payment system

---

## 📝 Notes & Decisions Log

### Decision 1: Repository Strategy
**Date:** [To be filled]
**Decision:** New repo vs. in-place upgrade
**Rationale:**

### Decision 2: CMS Approach
**Date:** [To be filled]
**Decision:** Supabase Admin / Sanity / Payload / Other
**Rationale:**

### Decision 3: Authentication
**Date:** [To be filled]
**Decision:** Clerk vs. Supabase Auth
**Rationale:**

### Decision 4: Deployment Strategy
**Date:** [To be filled]
**Decision:** Vercel / Netlify / Other
**Rationale:**

---

## 📞 Questions for ConnectCRE

Before starting, confirm:

1. **Repository:** New repo or upgrade existing?
2. **Content Management:** Who will be editing content? How often?
3. **Data Migration:** Keep existing data or start fresh with seed data?
4. **Branding:** Use existing design or modernize?
5. **Features:** Any must-have features not listed?
6. **Timeline:** What's the target launch date?
7. **Budget:** Any budget constraints for third-party services?
8. **Domain:** What domain will this be deployed to?
9. **Access:** Who needs admin access initially?
10. **Python Scripts:** Continue auto-ingesting news or manual only?

---

## 🎯 Our Commitment: No Stone Left Unturned

This is an **ambitious, meticulous rebuild** focused on **quality over quantity**. We refuse to cut corners.

### The Standard We're Holding Ourselves To:

1. **Looks Amazing** - Modern, clean, fast
   - Every component must match or exceed devprojects visual quality
   - Smooth animations, perfect spacing, responsive design
   - Accessibility built-in from the start

2. **Works Perfectly** - No bugs, smooth interactions
   - Every feature tested end-to-end with real data
   - Proper error handling, loading states, edge cases
   - Type-safe throughout - no `any` types

3. **Scales Easily** - Clean architecture for future growth
   - Simplified logic, maintainable code
   - Proper separation of concerns
   - Well-documented for handoff

4. **Delights Users** - Intuitive, engaging, helpful
   - Fast page loads, smooth transitions
   - Clear user feedback, helpful error messages
   - Mobile-first, performance-optimized

### Our Refactoring Promise:

✅ **Every component will be reviewed**
✅ **Every data flow will be validated**
✅ **Every visual detail will be polished**
✅ **Every feature will be tested**
✅ **Every line of code will be questioned**

We won't ship half-finished features. We won't leave "TODO" comments for later. We won't accept "good enough."

**We leave no stone unturned.**

By following this rigorous approach, we'll deliver a production-ready platform that ConnectCRE can be proud to showcase and confidently build upon.

---

**Last Updated:** January 2025
**Version:** 2.0 - Reality Check Edition
**Status:** Active Development - Foundation Phase Complete, Systematic Refactoring In Progress

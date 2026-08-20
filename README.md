# EnveroDigital Platform

White-label B2B SaaS dashboard for AI-generated SEO content and lead gen. This is the client-facing platform at enverodigital.com — separate from the [EnveroDigital](https://github.com/salesopslab/EnveroDigital) repo, which powers the newautopricer.com consumer SEO site.

## What's built (Phase 1)

- Marketing/pricing landing page (`pages/index.js`)
- Signup / login using Supabase Auth (`pages/signup.js`, `pages/login.js`) — new signups land in onboarding, not the dashboard
- App shell with left nav (`components/AppShell.js`) wrapping every authenticated page
- **Business Brain** onboarding + editable profile (`pages/business-brain.js`), with a "analyze my website" AI suggestion step (`pages/api/analyze-business.js`)
- **Growth Dashboard** (`pages/dashboard.js`) — KPI cards, opportunity summary, recommended actions. Organic Visitors is real (Google Analytics, see below); everything else is computed from real Supabase data.
- **Opportunity Engine** (`pages/opportunities.js`) — AI-generated opportunities (`pages/api/generate-opportunities.js`), filterable table, approve/create flow
- **Content Engine** (`pages/content/`) — AI content generation (`pages/api/generate-content.js`), rule-based SEO Score (`lib/seoScore.js`, structure/completeness based, not keyword density), draft/approve/schedule/publish, and **Content Multiplier** (`pages/api/multiply-content.js`) to spin off social/video/email/SMS derivatives
- **Content Calendar** (`pages/calendar.js`) — month view + backlog, Auto-Pilot toggle UI (scheduling logic itself is Phase 3)
- **Social** (`pages/social.js`) — UI shell for connected platforms + generated social content feed (real OAuth publishing is Phase 2)
- **Lead Center** (`pages/leads.js`) — status pipeline, editable lead value/notes; public capture endpoint at `pages/api/leads.js`
- **Basic Analytics** (`pages/analytics.js`) — content → leads → sales → revenue attribution, plus a real site-wide Search Console summary (clicks/impressions/CTR/position). Per-content-item traffic stays stubbed — it needs the content published as a real crawlable page, which is Phase 3 subdomain routing, not something Google can report on yet.
- **Google Analytics + Search Console** (`pages/integrations.js`, `lib/googleAuth.js`, `pages/api/google-*.js`) — shared service account model: you create one Google Cloud service account, each client grants it Viewer/user access to their own GA4 property and Search Console site (no per-client OAuth, no token refresh). See Setup below.
- Database schema for clients, tiers, opportunities, unified content items, leads, and vertical playbooks (`supabase/schema.sql` + `supabase/migrations/002_phase1.sql` + `supabase/migrations/003_google_integrations.sql`), with row-level security so each client only sees their own data
- Auto-creates a `clients` row (trialing, tier1) whenever someone signs up
- Vertical playbook seed data for automotive, home services, insurance, and legal (`supabase/migrations/002_phase1.sql`), plus a NationalCarDeals demo opportunity seed (`supabase/seed_demo.sql`)

## Not built yet (Phase 2/3, per the build spec)

- Stripe billing
- Real social platform OAuth + publishing
- Google Business Profile integration
- CRM / email / SMS integrations
- Subdomain routing (`client1.enverodigital.com`)
- Automated opportunity discovery, revenue-driven auto-optimization, Auto-Pilot's actual scheduling logic
- AI Assistant chat panel
- Drag-and-drop calendar rescheduling (click-to-reschedule works today)
- White-label client portal customization
- Namecheap/GoDaddy affiliate integration

## Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Run the migrations
1. Make sure `supabase/schema.sql` has already been run once (existing setup)
2. In the Supabase SQL Editor, run `supabase/migrations/002_phase1.sql`
3. Then run `supabase/migrations/003_google_integrations.sql`
4. Then run `supabase/migrations/004_enable_rls.sql` (fixes the "RLS Disabled in Public" Advisor warnings on `tier_limits` and `vertical_playbooks`)
5. Optionally run `supabase/seed_demo.sql` (edit the `:client_id` placeholder first) to seed the NationalCarDeals demo opportunities

### 3. Set up environment variables
```bash
cp .env.local.example .env.local
```
Fill in the Supabase and Anthropic values in `.env.local`. For Google Analytics/Search Console, see the setup steps commented in `.env.local.example` — one-time Google Cloud service account creation, then per-client access grants in GA4/Search Console.

### 4. Run locally
```bash
npm run dev
# Visit http://localhost:3000
```

Suggested smoke test: sign up a fresh account → Business Brain onboarding saves and redirects to the dashboard → "Generate opportunities" produces rows on `/opportunities` → "Create content" on one produces a draft with a visible SEO score on `/content/[id]` → Approve → Schedule shows it on `/calendar` → posting to `/api/leads` (or inserting a row manually) shows up on `/leads` and `/analytics` → on `/integrations`, paste a GA4 Property ID and Search Console Site URL and confirm "Save & Test" reports success, then confirm real numbers show up on `/dashboard` and `/analytics`.

## Deploy to Netlify

1. Push this repo to GitHub
2. In Netlify, create a new site from this repo
3. Add the same environment variables from `.env.local` to Netlify's Project configuration → Environment variables
4. Point enverodigital.com's DNS to the new Netlify site

## Tiers

| Tier | Price | Pages | Social content | White-label | API access |
|------|-------|-------|-----------------|-------------|------------|
| 1 | $299/mo | 500 | No | No | No |
| 2 | $599/mo | 2,000 | Yes | No | No |
| 3 | $999/mo | Unlimited | Yes | Yes | Yes |

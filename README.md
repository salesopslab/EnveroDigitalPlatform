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
- **Lead Webhook / CRM & Email & SMS distribution** (`pages/integrations.js`, `lib/webhookDelivery.js`, `pages/api/webhook-test.js`) — a generic outbound webhook rather than bespoke per-CRM OAuth integrations: each client points us at one URL (a Zapier "Catch Hook", Make, their CRM's inbound webhook trigger, or their own endpoint), and every new lead POSTs there as JSON the instant `pages/api/leads.js` captures it. Delivery attempts (success/failure, status code) are logged to `webhook_deliveries` and shown on the Integrations page.
- **Stripe billing** (`pages/settings.js`, `lib/stripe.js`, `pages/api/create-checkout-session.js`, `pages/api/create-portal-session.js`, `pages/api/stripe-webhook.js`) — real subscription billing for the 3 tiers, using Stripe's own hosted Checkout and Customer Portal pages rather than a custom card form (no PCI scope on our side, and Stripe's portal handles upgrade/downgrade proration instead of bespoke logic here). The webhook is the only thing that actually activates a plan — the Checkout success redirect is just a UI nicety. No new migration needed: `clients.tier`, `.status`, `.stripe_customer_id`, `.stripe_subscription_id` were already in the original `schema.sql`.
- Database schema for clients, tiers, opportunities, unified content items, leads, and vertical playbooks (`supabase/schema.sql` + `supabase/migrations/002_phase1.sql` + `supabase/migrations/003_google_integrations.sql` + `supabase/migrations/005_lead_webhooks.sql`), with row-level security so each client only sees their own data
- Auto-creates a `clients` row (trialing, tier1) whenever someone signs up
- Vertical playbook seed data for automotive, home services, insurance, and legal (`supabase/migrations/002_phase1.sql`), plus a NationalCarDeals demo opportunity seed (`supabase/seed_demo.sql`)

## Not built yet (Phase 2/3, per the build spec)

- Real social platform OAuth + publishing
- Google Business Profile integration (needs Google's manual API access approval — submitted separately from dev work, see notes in code once approved)
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
5. Then run `supabase/migrations/005_lead_webhooks.sql` (adds `clients.lead_webhook_url` and the `webhook_deliveries` log table)
6. Optionally run `supabase/seed_demo.sql` (edit the `:client_id` placeholder first) to seed the NationalCarDeals demo opportunities

### 3. Set up environment variables
```bash
cp .env.local.example .env.local
```
Fill in the Supabase and Anthropic values in `.env.local`. For Google Analytics/Search Console, see the setup steps commented in `.env.local.example` — one-time Google Cloud service account creation, then per-client access grants in GA4/Search Console. For Stripe, see the setup steps commented above the `STRIPE_*` block in the same file — one-time Stripe Dashboard setup (API key, 3 prices, webhook endpoint, Customer Portal config), test mode is fine to start with.

### 4. Run locally
```bash
npm run dev
# Visit http://localhost:3000
```

Suggested smoke test: sign up a fresh account → Business Brain onboarding saves and redirects to the dashboard → "Generate opportunities" produces rows on `/opportunities` → "Create content" on one produces a draft with a visible SEO score on `/content/[id]` → Approve → Schedule shows it on `/calendar` → posting to `/api/leads` (or inserting a row manually) shows up on `/leads` and `/analytics` → on `/integrations`, paste a GA4 Property ID and Search Console Site URL and confirm "Save & Test" reports success, then confirm real numbers show up on `/dashboard` and `/analytics` → still on `/integrations`, paste a Zapier "Catch Hook" (or webhook.site) URL into Lead Webhook, click "Save & Test", confirm it shows "Test event delivered ✓" and the test payload actually arrived at the URL, then submit another lead via `/api/leads` and confirm that one arrives too → on `/settings`, subscribe to a plan with Stripe's test card `4242 4242 4242 4242` (any future expiry/CVC), confirm you land back on `/settings?checkout=success` and the plan flips to that tier/`active` within a few seconds, then click "Manage Billing" and confirm Stripe's portal opens.

### Testing Stripe webhooks locally
Stripe can't reach `localhost` directly, so for local testing install the [Stripe CLI](https://docs.stripe.com/stripe-cli) and run:
```bash
stripe login
stripe listen --forward-to localhost:3000/api/stripe-webhook
```
That command prints its own `whsec_...` signing secret — use that one in local `.env.local` (it's different from the one the Dashboard-created production webhook endpoint gives you for Netlify).

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

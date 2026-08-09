# EnveroDigital Platform

White-label B2B SaaS dashboard for AI-generated SEO content and lead gen. This is the client-facing platform at enverodigital.com — separate from the [EnveroDigital](https://github.com/salesopslab/EnveroDigital) repo, which powers the newautopricer.com consumer SEO site.

## What's built so far

- Marketing/pricing landing page (`pages/index.js`)
- Signup / login using Supabase Auth (`pages/signup.js`, `pages/login.js`)
- Protected client dashboard shell (`pages/dashboard.js`)
- Database schema for clients, tiers, pages, social content, and leads (`supabase/schema.sql`), with row-level security so each client only sees their own data
- Auto-creates a `clients` row (trialing, tier1) whenever someone signs up

## Not built yet

- AI content generation UI (Claude API wiring)
- Subdomain routing (`client1.enverodigital.com`)
- Stripe billing
- Multi-platform social content generation
- White-label client portal customization
- Namecheap/GoDaddy affiliate integration

## Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Create a Supabase project
1. Go to [supabase.com](https://supabase.com) and create a new project
2. In the SQL Editor, run `supabase/schema.sql` to set up all tables and security policies
3. Go to Project Settings → API and copy the Project URL, anon key, and service_role key

### 3. Set up environment variables
```bash
cp .env.local.example .env.local
```
Fill in the Supabase and Anthropic values in `.env.local`.

### 4. Run locally
```bash
npm run dev
# Visit http://localhost:3000
```

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

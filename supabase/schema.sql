-- ============================================================
-- ENVERODIGITAL PLATFORM — DATABASE SCHEMA
-- Run this in the Supabase SQL editor (Project > SQL Editor > New query)
-- ============================================================

-- Clients: one row per paying customer, linked 1:1 to a Supabase Auth user
create table if not exists clients (
  id uuid primary key references auth.users(id) on delete cascade,
  company_name text not null,
  subdomain text unique, -- e.g. "acme" -> acme.enverodigital.com
  custom_domain text,    -- set for Tier 2/3 clients with their own domain
  tier text not null default 'tier1' check (tier in ('tier1', 'tier2', 'tier3')),
  status text not null default 'trialing' check (status in ('trialing', 'active', 'past_due', 'canceled')),
  stripe_customer_id text,
  stripe_subscription_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Page limit per tier, used to enforce plan limits in the app
create table if not exists tier_limits (
  tier text primary key,
  max_pages int not null,
  includes_social boolean not null default false,
  includes_white_label boolean not null default false,
  includes_api_access boolean not null default false
);

insert into tier_limits (tier, max_pages, includes_social, includes_white_label, includes_api_access) values
  ('tier1', 500, false, false, false),
  ('tier2', 2000, true, false, false),
  ('tier3', 999999, true, true, true)
on conflict (tier) do nothing;

-- Generated SEO pages per client
create table if not exists pages (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  slug text not null,
  title text,
  content jsonb, -- structured content: h1, meta_description, sections, faq, etc.
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (client_id, slug)
);

-- Generated social media content per client (tier2+)
create table if not exists social_content (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  page_id uuid references pages(id) on delete set null,
  platform text not null check (platform in ('tiktok', 'instagram', 'facebook', 'youtube', 'twitter', 'blog', 'email')),
  content jsonb,
  created_at timestamptz not null default now()
);

-- Lead tracking — leads captured from a client's pages
create table if not exists leads (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  page_id uuid references pages(id) on delete set null,
  source_url text,
  utm_source text,
  utm_campaign text,
  utm_content text,
  captured_at timestamptz not null default now()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- Clients can only ever see their own rows
-- ============================================================

alter table clients enable row level security;
alter table pages enable row level security;
alter table social_content enable row level security;
alter table leads enable row level security;

create policy "Clients can view their own record"
  on clients for select
  using (auth.uid() = id);

create policy "Clients can update their own record"
  on clients for update
  using (auth.uid() = id);

create policy "Clients can view their own pages"
  on pages for select
  using (auth.uid() = client_id);

create policy "Clients can manage their own pages"
  on pages for all
  using (auth.uid() = client_id);

create policy "Clients can view their own social content"
  on social_content for select
  using (auth.uid() = client_id);

create policy "Clients can view their own leads"
  on leads for select
  using (auth.uid() = client_id);

-- ============================================================
-- AUTO-CREATE CLIENT ROW ON SIGNUP
-- When someone signs up via Supabase Auth, automatically create
-- their clients row (tier1/trialing by default)
-- ============================================================

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.clients (id, company_name, tier, status)
  values (new.id, coalesce(new.raw_user_meta_data->>'company_name', 'New Client'), 'tier1', 'trialing');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

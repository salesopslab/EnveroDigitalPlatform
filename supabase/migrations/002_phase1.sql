-- ============================================================
-- ENVERODIGITAL PLATFORM — PHASE 1 MIGRATION
-- Run this in the Supabase SQL editor (Project > SQL Editor > New query),
-- AFTER schema.sql has already been run once.
--
-- Adds: Business Brain fields on `clients`, `opportunities`,
-- a unified `content_items` table (replaces `pages` + `social_content`,
-- which have no real client data yet), extended `leads` fields, and
-- a seed-only `vertical_playbooks` table.
-- ============================================================

-- ------------------------------------------------------------
-- 1. BUSINESS BRAIN — extend `clients`
-- ------------------------------------------------------------
alter table clients
  add column if not exists website text,
  add column if not exists industry text,
  add column if not exists description text,
  add column if not exists locations jsonb not null default '[]'::jsonb,
  add column if not exists service_areas jsonb not null default '[]'::jsonb,
  add column if not exists products jsonb not null default '[]'::jsonb,
  add column if not exists services jsonb not null default '[]'::jsonb,
  add column if not exists competitors jsonb not null default '[]'::jsonb,
  add column if not exists ideal_customer text,
  add column if not exists personas jsonb not null default '[]'::jsonb,
  add column if not exists customer_problems jsonb not null default '[]'::jsonb,
  add column if not exists buying_motivations jsonb not null default '[]'::jsonb,
  add column if not exists objections jsonb not null default '[]'::jsonb,
  add column if not exists faqs jsonb not null default '[]'::jsonb,
  add column if not exists brand_voice text check (brand_voice in ('professional','friendly','educational','direct','premium','casual')),
  add column if not exists custom_brand_instructions text,
  add column if not exists conversion_goal text,
  add column if not exists main_offer text,
  add column if not exists phone text,
  add column if not exists approx_customer_value numeric,
  add column if not exists social_channels jsonb not null default '[]'::jsonb,
  add column if not exists auto_pilot_enabled boolean not null default false,
  add column if not exists auto_pilot_publish_enabled boolean not null default false,
  add column if not exists onboarded boolean not null default false;

-- ------------------------------------------------------------
-- 2. OPPORTUNITY ENGINE
-- ------------------------------------------------------------
create table if not exists opportunities (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  keyword text not null,
  search_intent text check (search_intent in ('informational','navigational','commercial','transactional')),
  content_type text not null check (content_type in
    ('blog_article','service_page','product_page','location_page','comparison_page','faq','buying_guide','landing_page','social_post','video_script')),
  funnel_stage text check (funnel_stage in ('top','middle','bottom')),
  market text,
  product_service text,
  difficulty int check (difficulty between 1 and 100),
  opportunity_score int check (opportunity_score between 1 and 100),
  status text not null default 'new' check (status in
    ('new','approved','creating','published','ranking','producing_leads')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table opportunities enable row level security;

create policy "Clients can view their own opportunities"
  on opportunities for select using (auth.uid() = client_id);
create policy "Clients can manage their own opportunities"
  on opportunities for all using (auth.uid() = client_id);

-- ------------------------------------------------------------
-- 3. CONTENT ENGINE — unified content_items
-- Replaces `pages` and `social_content`. Safe to drop: no real
-- client content exists yet on either table.
-- ------------------------------------------------------------
-- cascade: the old `leads.page_id` foreign key points at `pages`, so a
-- plain DROP TABLE is rejected until that link is removed too. Safe here
-- since leads gets `content_item_id` as its replacement link below.
drop table if exists social_content cascade;
drop table if exists pages cascade;

create table if not exists content_items (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  opportunity_id uuid references opportunities(id) on delete set null,
  parent_content_id uuid references content_items(id) on delete set null,
  content_type text not null check (content_type in
    ('blog_article','service_page','product_page','location_page','comparison_page','faq','buying_guide',
     'landing_page','social_post','video_script','email','sms')),
  platform text check (platform in
    ('facebook','instagram','linkedin','tiktok','youtube','google_business_profile','email','sms')),
  title text,
  slug text,
  meta_description text,
  body jsonb not null default '{}'::jsonb, -- headings, sections, faqs, cta, schema_suggestion, caption text, etc.
  seo_score int check (seo_score between 0 and 100),
  status text not null default 'idea' check (status in ('idea','draft','approved','scheduled','published')),
  scheduled_at timestamptz,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (client_id, slug)
);

alter table content_items enable row level security;

create policy "Clients can view their own content"
  on content_items for select using (auth.uid() = client_id);
create policy "Clients can manage their own content"
  on content_items for all using (auth.uid() = client_id);

-- ------------------------------------------------------------
-- 4. LEAD CENTER — extend `leads`
-- ------------------------------------------------------------
alter table leads
  add column if not exists name text,
  add column if not exists email text,
  add column if not exists phone text,
  add column if not exists content_item_id uuid references content_items(id) on delete set null,
  add column if not exists product_service text,
  add column if not exists location text,
  add column if not exists status text not null default 'new' check (status in
    ('new','contacted','qualified','appointment','sold','lost')),
  add column if not exists lead_value numeric,
  add column if not exists notes text;

-- old page_id column is superseded by content_item_id; left in place (nullable)
-- rather than dropped, so nothing breaks if anything still references it.

-- Leads are captured server-side (via /api/leads using the service role
-- key), not inserted by the logged-in client directly — so unlike the
-- other Phase 1 tables, there is no client-facing insert policy here,
-- only the pre-existing "view their own leads" select policy plus a new
-- update policy so clients can move a lead through its status pipeline.
create policy "Clients can update their own leads"
  on leads for update using (auth.uid() = client_id);

-- ------------------------------------------------------------
-- 5. VERTICAL PLAYBOOKS (seed data, not per-client)
-- ------------------------------------------------------------
create table if not exists vertical_playbooks (
  industry text primary key,
  content_types jsonb not null default '[]'::jsonb,
  cta_label text,
  lead_fields jsonb not null default '[]'::jsonb,
  common_questions jsonb not null default '[]'::jsonb
);

insert into vertical_playbooks (industry, content_types, cta_label, lead_fields, common_questions) values
  ('automotive',
   '["make_model_page","incentive_page","local_deal_page","model_comparison","lease_finance_guide","inventory_page"]'::jsonb,
   'Compare Local Offers',
   '["zip","make","model","purchase_timeframe","name","email","phone"]'::jsonb,
   '["What'' the best lease deal on [model] this month?","Is [model] better than [competitor model]?","What incentives are available near me?"]'::jsonb),
  ('home_services',
   '["service_page","city_page","problem_page","how_to","cost_guide"]'::jsonb,
   'Get Free Estimate',
   '["zip","service_needed","name","email","phone"]'::jsonb,
   '["How much does [service] cost?","How do I know if I need [service]?"]'::jsonb),
  ('insurance',
   '["coverage_page","educational_article","comparison_page","faq_page"]'::jsonb,
   'Request Quote',
   '["zip","coverage_type","name","email","phone"]'::jsonb,
   '["How much coverage do I need?","What affects my premium?"]'::jsonb),
  ('legal',
   '["practice_area_page","local_page","legal_question","educational_guide"]'::jsonb,
   'Request Consultation',
   '["case_type","location","name","email","phone"]'::jsonb,
   '["Do I need a lawyer for this?","What does this typically cost?"]'::jsonb)
on conflict (industry) do nothing;

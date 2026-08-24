-- ============================================================
-- 009_page_views.sql
-- Tracks every real visit to a published public content page
-- (pages/p/[subdomain]/[slug].js), regardless of whether that
-- content uses Envero's inline form or a partner lander_url.
-- outbound_clicks (008) only covers the lander_url path -- this
-- covers page traffic itself, for all content.
-- ============================================================

create table if not exists content_page_views (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  content_item_id uuid not null references content_items(id) on delete cascade,
  utm_source text,
  utm_campaign text,
  utm_content text,
  referrer text,
  created_at timestamptz not null default now()
);

create index if not exists content_page_views_client_idx on content_page_views (client_id);
create index if not exists content_page_views_content_idx on content_page_views (content_item_id);

alter table content_page_views enable row level security;

create policy "Clients can view their own page view records"
  on content_page_views for select
  using (auth.uid() = client_id);

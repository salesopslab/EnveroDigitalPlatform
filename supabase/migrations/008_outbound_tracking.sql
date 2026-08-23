-- ============================================================
-- 008_outbound_tracking.sql
-- Supports sending traffic to a partner's own lander/lead form
-- instead of Envero's built-in lead form, while still tracking
-- clicks and (via partner postback) conversions on our side.
-- ============================================================

alter table content_items
  add column if not exists lander_url text; -- partner's own form/page. When
  -- set, the public content page (pages/p/[subdomain]/[slug].js) sends
  -- visitors here via /api/track-click instead of rendering Envero's
  -- inline lead form.

create table if not exists outbound_clicks (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  content_item_id uuid references content_items(id) on delete set null,
  click_token text not null unique, -- appended to the lander URL; the
  -- partner echoes this back in their postback so we can match it
  -- to the original click.
  lander_url text not null, -- resolved at click time, so changing the
  -- content item's lander_url later doesn't rewrite click history.
  utm_source text,
  utm_campaign text,
  utm_content text,
  referrer text,
  converted boolean not null default false,
  converted_at timestamptz,
  conversion_value numeric,
  created_at timestamptz not null default now()
);

create index if not exists outbound_clicks_client_idx on outbound_clicks (client_id);
create index if not exists outbound_clicks_content_idx on outbound_clicks (content_item_id);
create index if not exists outbound_clicks_token_idx on outbound_clicks (click_token);

alter table outbound_clicks enable row level security;

create policy "Clients can view their own outbound clicks"
  on outbound_clicks for select
  using (auth.uid() = client_id);

-- ============================================================
-- 011_social_connections.sql
-- Stores OAuth tokens per client per platform. Generic across
-- platforms (Facebook, Instagram, LinkedIn, TikTok, YouTube, GBP)
-- rather than one table per platform, since the shape is the same:
-- a token, maybe a refresh token, an expiry, and which account on
-- the platform it's connected to.
-- ============================================================

create table if not exists social_connections (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  platform text not null check (platform in ('facebook', 'instagram', 'linkedin', 'tiktok', 'youtube', 'google_business_profile')),
  access_token text not null,
  refresh_token text,
  expires_at timestamptz, -- null means the platform gave us a token
  -- that doesn't expire (e.g. Meta long-lived page tokens)
  platform_account_id text, -- e.g. the Facebook Page ID or IG Business Account ID
  platform_account_name text, -- display name, so the UI can show
  -- "Connected as: National Car Deals" instead of just a checkmark
  scopes text, -- space-separated list of granted scopes, useful for
  -- debugging "why can't we post" later without re-deriving it
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (client_id, platform)
);

create index if not exists social_connections_client_idx on social_connections (client_id);

alter table social_connections enable row level security;

create policy "Clients can view their own social connections"
  on social_connections for select
  using (auth.uid() = client_id);

-- No insert/update/delete policy for the anon/authenticated role --
-- connections are only ever written server-side (OAuth callback,
-- using supabaseAdmin), never directly by the client. This keeps
-- access tokens from being writable/tamperable from the browser.

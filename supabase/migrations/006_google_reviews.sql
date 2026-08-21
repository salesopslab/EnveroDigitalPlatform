-- ============================================================
-- ENVERODIGITAL PLATFORM — GOOGLE REVIEWS (Phase 2)
-- Run this in the Supabase SQL editor, after 005_lead_webhooks.sql.
--
-- Two pieces:
--  1. Review request campaigns: after a lead is marked "sold" (or on
--     manual request), we email/text them a direct link to leave a
--     Google review. Every lead gets the exact same neutral message —
--     Google's Rating Manipulation policy bans "review gating" (filtering
--     who gets asked based on predicted sentiment), so this schema
--     deliberately has no field for that.
--  2. Reputation display: cache the business's current Google star
--     rating + review count on the client row (refreshed from
--     /integrations) so the dashboard can show it without hitting the
--     paid Places API on every page load.
-- ============================================================

alter table clients
  add column if not exists google_place_id text,
  add column if not exists google_business_name text,
  add column if not exists google_rating numeric,
  add column if not exists google_review_count int,
  add column if not exists google_rating_updated_at timestamptz;

alter table leads
  add column if not exists sms_consent boolean not null default false,
  add column if not exists review_requested_at timestamptz;

-- sms_consent defaults to false and must be explicitly set true per lead
-- (checkbox on /leads, or passed in by a future public capture form) —
-- review-request SMS sending is gated on this to stay TCPA-safe. Email
-- requests aren't gated on it since there's no equivalent prior-consent
-- requirement for a one-off transactional email.

create table if not exists review_requests (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  lead_id uuid references leads(id) on delete set null,
  channel text not null check (channel in ('email', 'sms')),
  recipient text,
  success boolean not null default false,
  error text,
  created_at timestamptz not null default now()
);

alter table review_requests enable row level security;

create policy "Clients can view their own review requests"
  on review_requests for select using (auth.uid() = client_id);

-- Requests are written server-side via supabaseAdmin (service role key),
-- same pattern as webhook_deliveries — only the select policy above so
-- clients can see their own send log.

create index if not exists review_requests_client_id_created_at_idx
  on review_requests (client_id, created_at desc);

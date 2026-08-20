-- ============================================================
-- ENVERODIGITAL PLATFORM — FIX: RLS DISABLED IN PUBLIC
-- Run this in the Supabase SQL editor, after 003_google_integrations.sql.
--
-- Supabase's Advisor flagged both `tier_limits` and `vertical_playbooks`
-- as critical: they're public tables with Row Level Security disabled,
-- which means anyone holding the public anon key (embedded in the
-- browser bundle — effectively public) can read every row via the API.
--
-- Neither table is ever queried from client-side/browser code — grep
-- confirms it. `vertical_playbooks` is only read server-side in
-- pages/api/generate-opportunities.js via supabaseAdmin (the service
-- role client), which bypasses RLS entirely, so it doesn't need any
-- policies at all, just RLS turned on. Same story for `tier_limits` —
-- it's seed/reference data (per-tier page limits) not currently read
-- anywhere, client or server, but Advisor still (correctly) flags an
-- RLS-less public table as a risk regardless of whether it's in use yet.
-- ============================================================

alter table tier_limits enable row level security;
alter table vertical_playbooks enable row level security;

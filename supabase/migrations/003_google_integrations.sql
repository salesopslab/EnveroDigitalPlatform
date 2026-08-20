-- ============================================================
-- ENVERODIGITAL PLATFORM — PHASE 2 SLICE: GOOGLE INTEGRATIONS
-- Run this in the Supabase SQL editor (Project > SQL Editor > New query),
-- AFTER 002_phase1.sql has already been run.
--
-- Adds the two fields the Google Analytics / Search Console
-- integration needs per client. No RLS changes required — these
-- are just two more nullable columns on the existing `clients`
-- row, already covered by its existing policies.
-- ============================================================

alter table clients
  add column if not exists ga4_property_id text,
  add column if not exists gsc_site_url text;

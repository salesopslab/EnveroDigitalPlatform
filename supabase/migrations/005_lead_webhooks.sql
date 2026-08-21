-- ============================================================
-- ENVERODIGITAL PLATFORM — LEAD WEBHOOKS (Phase 2)
-- Run this in the Supabase SQL editor, after 004_enable_rls.sql.
--
-- Generic outbound webhook for lead capture: rather than building
-- bespoke OAuth integrations for every possible CRM/ESP/SMS vendor,
-- each client points us at one Webhook URL (Zapier "Catch Hook",
-- Make, HubSpot's inbound webhook trigger, or their own endpoint),
-- and we POST every new lead there as JSON the moment it's captured.
-- See lib/webhookDelivery.js.
-- ============================================================

alter table clients
  add column if not exists lead_webhook_url text;

create table if not exists webhook_deliveries (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  lead_id uuid references leads(id) on delete set null,
  event text not null default 'lead.created',
  url text not null,
  success boolean not null default false,
  status_code int,
  error text,
  created_at timestamptz not null default now()
);

alter table webhook_deliveries enable row level security;

create policy "Clients can view their own webhook deliveries"
  on webhook_deliveries for select using (auth.uid() = client_id);

-- Deliveries are written server-side via supabaseAdmin (service role
-- key), same pattern as leads.js — no client-facing insert policy
-- needed, only the select policy above so clients can see their own
-- delivery log on the Integrations page.

create index if not exists webhook_deliveries_client_id_created_at_idx
  on webhook_deliveries (client_id, created_at desc);

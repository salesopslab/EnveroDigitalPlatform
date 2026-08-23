-- ============================================================
-- 007_domains.sql
-- Supports auto-provisioned subdomains (pages/api/provision-subdomain.js)
-- and custom domain verification (pages/api/verify-custom-domain.js,
-- Settings page). subdomain and custom_domain columns already existed
-- in the base schema — this adds what was still missing.
-- ============================================================

alter table clients
  add column if not exists custom_domain_verified boolean not null default false;

-- Enforce uniqueness at the DB level too, not just in application code,
-- so a race condition can't ever hand two clients the same subdomain.
create unique index if not exists clients_subdomain_unique
  on clients (subdomain)
  where subdomain is not null;

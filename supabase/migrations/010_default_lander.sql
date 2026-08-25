-- ============================================================
-- 010_default_lander.sql
-- Account-level fallback lander URL. content_items.lander_url
-- (008) still works as a per-item override -- this just means a
-- business that always routes to their own form (not Envero's
-- inline one) doesn't have to set it on every single piece of
-- content one at a time.
-- ============================================================

alter table clients
  add column if not exists default_lander_url text;

-- ============================================================
-- DEMO SEED DATA — NationalCarDeals (automotive)
-- Run manually after 002_phase1.sql, and after you have at least
-- one signed-up client account you want to seed. Replace
-- :client_id below with that client's uuid (their auth.users id)
-- before running.
-- ============================================================

-- Example:
-- update clients set company_name = 'NationalCarDeals', industry = 'automotive'
--   where id = ':client_id';

insert into opportunities (client_id, keyword, search_intent, content_type, funnel_stage, market, product_service, difficulty, opportunity_score, status) values
  (':client_id', '2026 Kia Telluride deals near me', 'transactional', 'local_deal_page' , 'bottom', 'Los Angeles', 'Telluride', 35, 88, 'new'),
  (':client_id', '2026 Kia Telluride lease deals', 'transactional', 'local_deal_page', 'bottom', 'San Diego', 'Telluride', 30, 85, 'new'),
  (':client_id', 'Telluride vs Palisade', 'commercial', 'comparison_page', 'middle', 'Phoenix', 'Telluride', 42, 80, 'new'),
  (':client_id', 'Kia Sportage deals in Phoenix', 'transactional', 'local_deal_page', 'bottom', 'Phoenix', 'Sportage', 28, 82, 'new'),
  (':client_id', 'Best Kia SUV under $40,000', 'commercial', 'buying_guide', 'middle', 'Las Vegas', 'Sportage', 45, 74, 'new'),
  (':client_id', 'Kia Carnival financing offers', 'transactional', 'local_deal_page', 'bottom', 'Dallas', 'Carnival', 32, 77, 'new'),
  (':client_id', 'Best three-row Kia SUV', 'informational', 'buying_guide', 'top', 'Los Angeles', 'Sorento', 50, 65, 'new');

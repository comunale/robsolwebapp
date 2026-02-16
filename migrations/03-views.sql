-- =============================================
-- STEP 3: Create views
-- Run this AFTER step 2 succeeds
-- Views depend on all tables + columns existing
-- =============================================

CREATE OR REPLACE VIEW leaderboard AS
SELECT
  p.id AS user_id,
  p.full_name,
  p.store_id,
  s.name AS store_name,
  p.total_points,
  c.campaign_id,
  cam.title AS campaign_title,
  COUNT(c.id) AS total_coupons,
  COUNT(c.id) FILTER (WHERE c.status = 'approved') AS approved_coupons,
  COALESCE(SUM(c.points_awarded) FILTER (WHERE c.status = 'approved'), 0) AS campaign_points,
  COALESCE(
    (SELECT COUNT(*) FROM lucky_numbers ln WHERE ln.user_id = p.id AND ln.campaign_id = c.campaign_id),
    0
  ) AS lucky_numbers_count,
  RANK() OVER (
    PARTITION BY c.campaign_id
    ORDER BY COALESCE(SUM(c.points_awarded) FILTER (WHERE c.status = 'approved'), 0) DESC
  ) AS rank_in_campaign
FROM profiles p
LEFT JOIN coupons c ON c.user_id = p.id
LEFT JOIN campaigns cam ON cam.id = c.campaign_id
LEFT JOIN stores s ON s.id = p.store_id
WHERE p.role = 'user'
GROUP BY p.id, p.full_name, p.store_id, s.name, p.total_points, c.campaign_id, cam.title;

CREATE OR REPLACE VIEW store_performance AS
SELECT
  s.id AS store_id,
  s.name AS store_name,
  s.cnpj,
  s.location,
  COUNT(DISTINCT p.id) AS salesperson_count,
  COUNT(DISTINCT c.id) AS total_coupons,
  COUNT(DISTINCT c.id) FILTER (WHERE c.status = 'approved') AS approved_coupons,
  COALESCE(SUM(c.points_awarded) FILTER (WHERE c.status = 'approved'), 0) AS total_points,
  COUNT(DISTINCT gc.id) AS goals_completed,
  COUNT(DISTINCT c.id) FILTER (
    WHERE c.status = 'approved'
    AND c.reviewed_at >= date_trunc('week', NOW())
  ) AS current_week_approved,
  COUNT(DISTINCT c.id) FILTER (
    WHERE c.status = 'approved'
    AND c.reviewed_at >= date_trunc('week', NOW()) - INTERVAL '7 days'
    AND c.reviewed_at < date_trunc('week', NOW())
  ) AS previous_week_approved
FROM stores s
LEFT JOIN profiles p ON p.store_id = s.id AND p.role = 'user'
LEFT JOIN coupons c ON c.user_id = p.id
LEFT JOIN goal_completions gc ON gc.user_id = p.id
GROUP BY s.id, s.name, s.cnpj, s.location;

-- =============================================
-- VERIFY STEP 3
-- =============================================
SELECT viewname FROM pg_views WHERE schemaname = 'public';

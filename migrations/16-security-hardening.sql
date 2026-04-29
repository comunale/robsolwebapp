-- ============================================================
-- Migration 16: Security Advisor Fixes & Database Hardening
-- ============================================================
-- Run this in the Supabase SQL Editor (or psql).
-- Each section is idempotent — safe to re-run.

-- ============================================================
-- 1. CAMPAIGNS — Restrict DML to admin / moderator only
-- ============================================================
-- Previously: any authenticated user could INSERT / UPDATE / DELETE.
-- Fixed:      only profiles with role IN ('admin','moderator') can write.
-- SELECT stays open to all authenticated (needed by the user dashboard).

DROP POLICY IF EXISTS "Authenticated users can insert campaigns" ON campaigns;
DROP POLICY IF EXISTS "Authenticated users can update campaigns" ON campaigns;
DROP POLICY IF EXISTS "Authenticated users can delete campaigns" ON campaigns;
-- clean up in case this migration is re-run
DROP POLICY IF EXISTS "campaigns_insert_admin_moderator"  ON campaigns;
DROP POLICY IF EXISTS "campaigns_update_admin_moderator"  ON campaigns;
DROP POLICY IF EXISTS "campaigns_delete_admin_moderator"  ON campaigns;

CREATE POLICY "campaigns_insert_admin_moderator"
  ON campaigns FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND role IN ('admin', 'moderator')
    )
  );

CREATE POLICY "campaigns_update_admin_moderator"
  ON campaigns FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND role IN ('admin', 'moderator')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND role IN ('admin', 'moderator')
    )
  );

CREATE POLICY "campaigns_delete_admin_moderator"
  ON campaigns FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND role IN ('admin', 'moderator')
    )
  );

-- ============================================================
-- 2. COUPONS — Scope SELECT to own records; restrict writes
-- ============================================================
-- Previously:
--   SELECT  → all authenticated could read ALL rows  (data leak)
--   UPDATE  → all authenticated could update ANY row (privilege escalation)
--   DELETE  → no policy existed                      (unconstrained)
--
-- Fixed:
--   SELECT  → users see only their own; admins/mods see all
--   UPDATE  → admins/moderators only (needed for approve/reject flow)
--   DELETE  → admins only
--   INSERT  → unchanged (auth.uid() = user_id — already correct)

DROP POLICY IF EXISTS "coupons_select_authenticated"      ON coupons;
DROP POLICY IF EXISTS "coupons_update_authenticated"      ON coupons;
-- idempotent cleanup
DROP POLICY IF EXISTS "coupons_select_own"                ON coupons;
DROP POLICY IF EXISTS "coupons_select_admin_moderator"    ON coupons;
DROP POLICY IF EXISTS "coupons_update_admin_moderator"    ON coupons;
DROP POLICY IF EXISTS "coupons_delete_admin"              ON coupons;

-- Users can only see their own submitted coupons
CREATE POLICY "coupons_select_own"
  ON coupons FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Admins and moderators can see all coupons (required for moderation UI)
CREATE POLICY "coupons_select_admin_moderator"
  ON coupons FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND role IN ('admin', 'moderator')
    )
  );

-- Only admins/moderators can approve, reject, or otherwise update coupons
CREATE POLICY "coupons_update_admin_moderator"
  ON coupons FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND role IN ('admin', 'moderator')
    )
  );

-- Only admins can hard-delete coupon records
CREATE POLICY "coupons_delete_admin"
  ON coupons FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND role = 'admin'
    )
  );

-- ============================================================
-- 3. VIEWS — Explicit SECURITY DEFINER + read-only grants
-- ============================================================
-- In PostgreSQL 15 (Supabase default), views use the CALLER's
-- privileges by default (security_invoker).  Changing coupons
-- SELECT to per-user scope would break cross-user aggregation
-- in both views.  We intentionally recreate them with
-- security_definer so the view body runs as the owner (postgres),
-- which has BYPASSRLS — giving it unrestricted read access needed
-- for aggregate ranking and store performance data.
--
-- Access is still controlled:
--   • Only the 'authenticated' role receives SELECT.
--   • Public/anon roles have no access.
--   • No DML path exists through a plain SELECT view.

-- Recreate leaderboard as security_definer
DROP VIEW IF EXISTS public.leaderboard;
CREATE VIEW public.leaderboard
  WITH (security_invoker = off)   -- explicit: use owner (postgres) privileges
AS
SELECT
  p.id            AS user_id,
  p.full_name,
  p.store_id,
  s.name          AS store_name,
  p.total_points,
  c.campaign_id,
  cam.title       AS campaign_title,
  COUNT(c.id)     AS total_coupons,
  COUNT(c.id) FILTER (WHERE c.status = 'approved')
                  AS approved_coupons,
  COALESCE(SUM(c.points_awarded) FILTER (WHERE c.status = 'approved'), 0)
                  AS campaign_points,
  COALESCE(
    (SELECT COUNT(*) FROM lucky_numbers ln
     WHERE ln.user_id = p.id AND ln.campaign_id = c.campaign_id),
    0
  )               AS lucky_numbers_count,
  RANK() OVER (
    PARTITION BY c.campaign_id
    ORDER BY COALESCE(SUM(c.points_awarded) FILTER (WHERE c.status = 'approved'), 0) DESC
  )               AS rank_in_campaign
FROM   profiles p
LEFT   JOIN coupons   c   ON c.user_id    = p.id
LEFT   JOIN campaigns cam ON cam.id       = c.campaign_id
LEFT   JOIN stores    s   ON s.id         = p.store_id
WHERE  p.role = 'user'
GROUP  BY p.id, p.full_name, p.store_id, s.name,
          p.total_points, c.campaign_id, cam.title;

-- Recreate store_performance as security_definer
DROP VIEW IF EXISTS public.store_performance;
CREATE VIEW public.store_performance
  WITH (security_invoker = off)   -- explicit: use owner (postgres) privileges
AS
SELECT
  s.id                                                AS store_id,
  s.name                                              AS store_name,
  s.cnpj,
  s.location,
  COUNT(DISTINCT p.id)                                AS salesperson_count,
  COUNT(DISTINCT c.id)                                AS total_coupons,
  COUNT(DISTINCT c.id) FILTER (WHERE c.status = 'approved')
                                                      AS approved_coupons,
  COALESCE(SUM(c.points_awarded) FILTER (WHERE c.status = 'approved'), 0)
                                                      AS total_points,
  COUNT(DISTINCT gc.id)                               AS goals_completed,
  COUNT(DISTINCT c.id) FILTER (
    WHERE c.status = 'approved'
      AND c.reviewed_at >= date_trunc('week', NOW())
  )                                                   AS current_week_approved,
  COUNT(DISTINCT c.id) FILTER (
    WHERE c.status = 'approved'
      AND c.reviewed_at >= date_trunc('week', NOW()) - INTERVAL '7 days'
      AND c.reviewed_at < date_trunc('week', NOW())
  )                                                   AS previous_week_approved
FROM   stores s
LEFT   JOIN profiles         p  ON p.store_id = s.id AND p.role = 'user'
LEFT   JOIN coupons          c  ON c.user_id  = p.id
LEFT   JOIN goal_completions gc ON gc.user_id = p.id
GROUP  BY s.id, s.name, s.cnpj, s.location;

-- Grant SELECT to authenticated only; revoke all from public/anon
REVOKE ALL ON public.leaderboard      FROM PUBLIC;
REVOKE ALL ON public.store_performance FROM PUBLIC;

GRANT SELECT ON public.leaderboard      TO authenticated;
GRANT SELECT ON public.store_performance TO authenticated;

-- ============================================================
-- 4. FUNCTIONS — Add SET search_path = public
-- ============================================================
-- SECURITY DEFINER functions without a fixed search_path are
-- vulnerable to search_path injection: an attacker who can create
-- objects in any schema in the search_path can hijack the function.
-- Pinning search_path = public prevents this.

-- 4a. update_updated_at_column (trigger utility — not SECURITY DEFINER,
--     but pin search_path as defence-in-depth)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc', NOW());
  RETURN NEW;
END;
$$;

-- 4b. handle_new_user — auto-create profile on auth.users INSERT
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, whatsapp, role, total_points, store_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Unnamed'),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'whatsapp', ''),
    'user',
    0,
    (NEW.raw_user_meta_data->>'store_id')::UUID
  );
  RETURN NEW;
END;
$$;

-- 4c. update_user_points — adjust points on coupon status change
CREATE OR REPLACE FUNCTION public.update_user_points()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
    UPDATE profiles
    SET total_points = total_points + NEW.points_awarded
    WHERE id = NEW.user_id;
  ELSIF NEW.status != 'approved' AND OLD.status = 'approved' THEN
    UPDATE profiles
    SET total_points = GREATEST(0, total_points - OLD.points_awarded)
    WHERE id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$;

-- 4d. evaluate_user_goals — award goal bonuses + lucky numbers on approval
CREATE OR REPLACE FUNCTION public.evaluate_user_goals(
  p_user_id    UUID,
  p_campaign_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_settings    JSONB;
  v_goal        JSONB;
  v_period_start DATE;
  v_period_end   DATE;
  v_count        INTEGER;
  v_target       INTEGER;
  v_bonus        INTEGER;
  v_lucky        INTEGER;
  v_goal_id      TEXT;
  v_existing     UUID;
  v_gc_id        UUID;
  v_next_number  INTEGER;
BEGIN
  SELECT settings INTO v_settings
  FROM campaigns
  WHERE id = p_campaign_id AND is_active = true;

  IF v_settings IS NULL OR v_settings->'goals' IS NULL THEN
    RETURN;
  END IF;

  FOR v_goal IN SELECT * FROM jsonb_array_elements(v_settings->'goals')
  LOOP
    v_goal_id := v_goal->>'id';
    v_target  := (v_goal->>'target')::INTEGER;
    v_bonus   := (v_goal->>'bonus_points')::INTEGER;
    v_lucky   := (v_goal->>'lucky_numbers')::INTEGER;

    IF v_goal->>'period' = 'weekly' THEN
      v_period_start := date_trunc('week', NOW())::DATE;
      v_period_end   := (date_trunc('week', NOW()) + INTERVAL '6 days')::DATE;
    ELSE
      v_period_start := date_trunc('month', NOW())::DATE;
      v_period_end   := (date_trunc('month', NOW()) + INTERVAL '1 month' - INTERVAL '1 day')::DATE;
    END IF;

    SELECT id INTO v_existing
    FROM goal_completions
    WHERE user_id    = p_user_id
      AND campaign_id = p_campaign_id
      AND goal_id    = v_goal_id
      AND period_start = v_period_start;

    IF v_existing IS NOT NULL THEN
      CONTINUE;
    END IF;

    SELECT COUNT(*) INTO v_count
    FROM coupons
    WHERE user_id     = p_user_id
      AND campaign_id = p_campaign_id
      AND status      = 'approved'
      AND created_at  >= v_period_start
      AND created_at  <  v_period_end + INTERVAL '1 day';

    IF v_count >= v_target THEN
      INSERT INTO goal_completions
        (user_id, campaign_id, goal_id, period_start, period_end, coupons_count, bonus_points_awarded)
      VALUES
        (p_user_id, p_campaign_id, v_goal_id, v_period_start, v_period_end, v_count, v_bonus)
      RETURNING id INTO v_gc_id;

      IF v_bonus > 0 THEN
        UPDATE profiles
        SET total_points = total_points + v_bonus
        WHERE id = p_user_id;
      END IF;

      FOR i IN 1..v_lucky LOOP
        SELECT COALESCE(MAX(number), 0) + 1 INTO v_next_number
        FROM lucky_numbers WHERE campaign_id = p_campaign_id;

        INSERT INTO lucky_numbers (user_id, campaign_id, goal_completion_id, number)
        VALUES (p_user_id, p_campaign_id, v_gc_id, v_next_number);
      END LOOP;

      INSERT INTO notifications (user_id, type, title, body, data)
      VALUES (
        p_user_id,
        'goal_completed',
        'Meta atingida!',
        format(
          'Voce completou a meta "%s" e ganhou %s pontos bonus%s!',
          v_goal->>'label',
          v_bonus,
          CASE WHEN v_lucky > 0
            THEN format(' e %s numero(s) da sorte', v_lucky)
            ELSE ''
          END
        ),
        jsonb_build_object(
          'campaign_id',  p_campaign_id,
          'goal_id',      v_goal_id,
          'bonus_points', v_bonus,
          'lucky_numbers', v_lucky
        )
      );
    END IF;
  END LOOP;
END;
$$;

-- 4e. trigger_check_goals_on_approval — fires evaluate_user_goals on approve
CREATE OR REPLACE FUNCTION public.trigger_check_goals_on_approval()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
    PERFORM evaluate_user_goals(NEW.user_id, NEW.campaign_id);
  END IF;
  RETURN NEW;
END;
$$;

-- ============================================================
-- 5. VERIFY
-- ============================================================
-- Run these queries after applying the migration to confirm.

-- Policies on campaigns and coupons:
-- SELECT tablename, policyname, cmd, qual
-- FROM pg_policies
-- WHERE schemaname = 'public'
--   AND tablename IN ('campaigns', 'coupons')
-- ORDER BY tablename, cmd;

-- Function search_path:
-- SELECT p.proname, p.proconfig
-- FROM pg_proc p
-- JOIN pg_namespace n ON n.oid = p.pronamespace
-- WHERE n.nspname = 'public'
--   AND p.prosecdef = true   -- SECURITY DEFINER only
-- ORDER BY p.proname;

-- View security settings:
-- SELECT viewname, definition
-- FROM pg_views
-- WHERE schemaname = 'public';

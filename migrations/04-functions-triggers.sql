-- =============================================
-- STEP 4: Functions and triggers
-- Run this AFTER step 3 succeeds
-- =============================================

-- =============================================
-- 4a. UTILITY: updated_at trigger
-- =============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc', NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_campaigns_updated_at ON campaigns;
CREATE TRIGGER trigger_campaigns_updated_at
  BEFORE UPDATE ON campaigns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_stores_updated_at ON stores;
CREATE TRIGGER trigger_stores_updated_at
  BEFORE UPDATE ON stores
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- 4b. AUTO-CREATE PROFILE ON SIGNUP
-- =============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================
-- 4c. POINTS TRIGGER (coupon approval/revocation)
-- =============================================
CREATE OR REPLACE FUNCTION update_user_points()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_update_user_points ON coupons;
CREATE TRIGGER trigger_update_user_points
  AFTER UPDATE ON coupons
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION update_user_points();

-- =============================================
-- 4d. GOAL EVALUATION (awards goals + lucky numbers)
-- =============================================
CREATE OR REPLACE FUNCTION evaluate_user_goals(
  p_user_id UUID,
  p_campaign_id UUID
)
RETURNS VOID AS $$
DECLARE
  v_settings JSONB;
  v_goal JSONB;
  v_period_start DATE;
  v_period_end DATE;
  v_count INTEGER;
  v_target INTEGER;
  v_bonus INTEGER;
  v_lucky INTEGER;
  v_goal_id TEXT;
  v_existing UUID;
  v_gc_id UUID;
  v_next_number INTEGER;
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
    v_target := (v_goal->>'target')::INTEGER;
    v_bonus := (v_goal->>'bonus_points')::INTEGER;
    v_lucky := (v_goal->>'lucky_numbers')::INTEGER;

    IF v_goal->>'period' = 'weekly' THEN
      v_period_start := date_trunc('week', NOW())::DATE;
      v_period_end := (date_trunc('week', NOW()) + INTERVAL '6 days')::DATE;
    ELSE
      v_period_start := date_trunc('month', NOW())::DATE;
      v_period_end := (date_trunc('month', NOW()) + INTERVAL '1 month' - INTERVAL '1 day')::DATE;
    END IF;

    SELECT id INTO v_existing
    FROM goal_completions
    WHERE user_id = p_user_id
      AND campaign_id = p_campaign_id
      AND goal_id = v_goal_id
      AND period_start = v_period_start;

    IF v_existing IS NOT NULL THEN
      CONTINUE;
    END IF;

    SELECT COUNT(*) INTO v_count
    FROM coupons
    WHERE user_id = p_user_id
      AND campaign_id = p_campaign_id
      AND status = 'approved'
      AND created_at >= v_period_start
      AND created_at < v_period_end + INTERVAL '1 day';

    IF v_count >= v_target THEN
      INSERT INTO goal_completions (user_id, campaign_id, goal_id, period_start, period_end, coupons_count, bonus_points_awarded)
      VALUES (p_user_id, p_campaign_id, v_goal_id, v_period_start, v_period_end, v_count, v_bonus)
      RETURNING id INTO v_gc_id;

      IF v_bonus > 0 THEN
        UPDATE profiles SET total_points = total_points + v_bonus WHERE id = p_user_id;
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
        format('Voce completou a meta "%s" e ganhou %s pontos bonus%s!',
          v_goal->>'label', v_bonus,
          CASE WHEN v_lucky > 0
            THEN format(' e %s numero(s) da sorte', v_lucky)
            ELSE '' END
        ),
        jsonb_build_object('campaign_id', p_campaign_id, 'goal_id', v_goal_id, 'bonus_points', v_bonus, 'lucky_numbers', v_lucky)
      );
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to evaluate goals on coupon approval
CREATE OR REPLACE FUNCTION trigger_check_goals_on_approval()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
    PERFORM evaluate_user_goals(NEW.user_id, NEW.campaign_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_goal_evaluation ON coupons;
CREATE TRIGGER trigger_goal_evaluation
  AFTER UPDATE ON coupons
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION trigger_check_goals_on_approval();

-- =============================================
-- FINAL VERIFICATION
-- =============================================
-- Run these queries to confirm everything is set up:

-- Tables:
SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;

-- Views:
SELECT viewname FROM pg_views WHERE schemaname = 'public';

-- Functions:
SELECT routine_name FROM information_schema.routines
WHERE routine_schema = 'public' AND routine_type = 'FUNCTION'
ORDER BY routine_name;

-- Triggers:
SELECT trigger_name, event_object_table
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table;

-- Policies:
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, cmd;

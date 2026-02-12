-- =============================================
-- Robsol VIP Incentive Engine - Database Schema
-- Supabase PostgreSQL
-- =============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- STORES TABLE (Oticas)
-- =============================================
CREATE TABLE stores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  cnpj TEXT UNIQUE NOT NULL,
  location TEXT,
  logo_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

CREATE INDEX idx_stores_cnpj ON stores(cnpj);
CREATE INDEX idx_stores_is_active ON stores(is_active);

-- =============================================
-- PROFILES TABLE
-- =============================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  whatsapp TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'user')),
  total_points INTEGER DEFAULT 0 CHECK (total_points >= 0),
  store_id UUID REFERENCES stores(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_profiles_whatsapp ON profiles(whatsapp);
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_store_id ON profiles(store_id);

-- =============================================
-- CAMPAIGNS TABLE
-- =============================================
CREATE TABLE campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  banner_url TEXT,
  keywords TEXT[] DEFAULT '{}',
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),

  CONSTRAINT valid_date_range CHECK (end_date > start_date)
);

CREATE INDEX idx_campaigns_is_active ON campaigns(is_active);
CREATE INDEX idx_campaigns_dates ON campaigns(start_date, end_date);

-- =============================================
-- COUPONS TABLE
-- =============================================
CREATE TABLE coupons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  extracted_data JSONB,
  points_awarded INTEGER DEFAULT 0 CHECK (points_awarded >= 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID REFERENCES profiles(id)
);

CREATE INDEX idx_coupons_user_id ON coupons(user_id);
CREATE INDEX idx_coupons_campaign_id ON coupons(campaign_id);
CREATE INDEX idx_coupons_status ON coupons(status);
CREATE INDEX idx_coupons_user_status ON coupons(user_id, status);

-- =============================================
-- GOAL COMPLETIONS TABLE
-- =============================================
CREATE TABLE goal_completions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  goal_id TEXT NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  coupons_count INTEGER NOT NULL,
  bonus_points_awarded INTEGER NOT NULL DEFAULT 0,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),

  CONSTRAINT unique_goal_per_period UNIQUE (user_id, campaign_id, goal_id, period_start)
);

CREATE INDEX idx_goal_completions_user ON goal_completions(user_id);
CREATE INDEX idx_goal_completions_campaign ON goal_completions(campaign_id);
CREATE INDEX idx_goal_completions_period ON goal_completions(period_start, period_end);

-- =============================================
-- LUCKY NUMBERS TABLE
-- =============================================
CREATE TABLE lucky_numbers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  goal_completion_id UUID REFERENCES goal_completions(id) ON DELETE SET NULL,
  number INTEGER NOT NULL,
  is_winner BOOLEAN DEFAULT false,
  drawn_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

CREATE INDEX idx_lucky_numbers_user ON lucky_numbers(user_id);
CREATE INDEX idx_lucky_numbers_campaign ON lucky_numbers(campaign_id);
CREATE INDEX idx_lucky_numbers_campaign_number ON lucky_numbers(campaign_id, number);

-- =============================================
-- NOTIFICATIONS TABLE
-- =============================================
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN (
    'goal_completed', 'coupon_approved', 'coupon_rejected',
    'lucky_number', 'draw_winner', 'campaign_new', 'general'
  )),
  title TEXT NOT NULL,
  body TEXT,
  data JSONB DEFAULT '{}',
  is_read BOOLEAN DEFAULT false,
  channel TEXT DEFAULT 'in_app' CHECK (channel IN ('in_app', 'email', 'both')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, is_read) WHERE is_read = false;
CREATE INDEX idx_notifications_created ON notifications(created_at DESC);

-- =============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================
-- NOTE: Profiles RLS intentionally uses simple auth.uid() checks only.
-- Admin operations are authorized at the API route level (server-side)
-- to avoid infinite recursion when policies query the profiles table itself.

ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE goal_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE lucky_numbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- STORES POLICIES
CREATE POLICY "Authenticated users can view stores"
  ON stores FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert stores"
  ON stores FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update stores"
  ON stores FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete stores"
  ON stores FOR DELETE TO authenticated USING (true);

-- PROFILES POLICIES
-- Single SELECT policy per operation to prevent duplicate-policy recursion.
-- Admin authorization is enforced at the API route level (server-side).
-- UPDATE is broad because triggers (update_user_points, evaluate_user_goals)
-- run as SECURITY DEFINER and need to update any user's points.
CREATE POLICY "profiles_select_authenticated"
  ON profiles FOR SELECT TO authenticated USING (true);

CREATE POLICY "profiles_insert_own"
  ON profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update_authenticated"
  ON profiles FOR UPDATE TO authenticated USING (true);

-- CAMPAIGNS POLICIES
CREATE POLICY "Authenticated users can view campaigns"
  ON campaigns FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert campaigns"
  ON campaigns FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update campaigns"
  ON campaigns FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete campaigns"
  ON campaigns FOR DELETE TO authenticated USING (true);

-- COUPONS POLICIES (single SELECT policy to avoid duplicate-policy issues)
CREATE POLICY "coupons_select_authenticated"
  ON coupons FOR SELECT TO authenticated USING (true);

CREATE POLICY "coupons_insert_own"
  ON coupons FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "coupons_update_authenticated"
  ON coupons FOR UPDATE TO authenticated USING (true);

-- GOAL COMPLETIONS POLICIES
CREATE POLICY "goal_completions_select_authenticated"
  ON goal_completions FOR SELECT TO authenticated USING (true);

CREATE POLICY "goal_completions_insert_authenticated"
  ON goal_completions FOR INSERT TO authenticated WITH CHECK (true);

-- LUCKY NUMBERS POLICIES
CREATE POLICY "lucky_numbers_select_authenticated"
  ON lucky_numbers FOR SELECT TO authenticated USING (true);

CREATE POLICY "lucky_numbers_insert_authenticated"
  ON lucky_numbers FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "lucky_numbers_update_authenticated"
  ON lucky_numbers FOR UPDATE TO authenticated USING (true);

-- NOTIFICATIONS POLICIES
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can insert notifications"
  ON notifications FOR INSERT TO authenticated WITH CHECK (true);

-- =============================================
-- VIEWS
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
-- FUNCTIONS AND TRIGGERS
-- =============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc', NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_campaigns_updated_at
  BEFORE UPDATE ON campaigns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_stores_updated_at
  BEFORE UPDATE ON stores
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auto-create profile row when a new user signs up
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

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Points trigger: only source of points to avoid double-counting
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

CREATE TRIGGER trigger_update_user_points
  AFTER UPDATE ON coupons
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION update_user_points();

-- Goal evaluation: runs after coupon approval to check/award goals
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

CREATE OR REPLACE FUNCTION trigger_check_goals_on_approval()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
    PERFORM evaluate_user_goals(NEW.user_id, NEW.campaign_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_goal_evaluation
  AFTER UPDATE ON coupons
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION trigger_check_goals_on_approval();

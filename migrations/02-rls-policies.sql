-- =============================================
-- STEP 2: Enable RLS + Create all policies
-- Run this AFTER step 1 succeeds
-- =============================================

-- =============================================
-- 2a. ENABLE ROW LEVEL SECURITY ON ALL TABLES
-- =============================================
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE goal_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE lucky_numbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 2b. STORES POLICIES
-- =============================================
DROP POLICY IF EXISTS "Authenticated users can view stores" ON stores;
DROP POLICY IF EXISTS "Authenticated users can insert stores" ON stores;
DROP POLICY IF EXISTS "Authenticated users can update stores" ON stores;
DROP POLICY IF EXISTS "Authenticated users can delete stores" ON stores;

CREATE POLICY "Authenticated users can view stores"
  ON stores FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert stores"
  ON stores FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update stores"
  ON stores FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete stores"
  ON stores FOR DELETE TO authenticated USING (true);

-- =============================================
-- 2c. PROFILES POLICIES (clean, non-recursive)
-- =============================================
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Authenticated users can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Allow insert for new users" ON profiles;
DROP POLICY IF EXISTS "profiles_select_authenticated" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
DROP POLICY IF EXISTS "profiles_update_authenticated" ON profiles;

CREATE POLICY "profiles_select_authenticated"
  ON profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_insert_own"
  ON profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_authenticated"
  ON profiles FOR UPDATE TO authenticated USING (true);

-- =============================================
-- 2d. CAMPAIGNS POLICIES
-- =============================================
DROP POLICY IF EXISTS "Authenticated users can view campaigns" ON campaigns;
DROP POLICY IF EXISTS "Authenticated users can insert campaigns" ON campaigns;
DROP POLICY IF EXISTS "Authenticated users can update campaigns" ON campaigns;
DROP POLICY IF EXISTS "Authenticated users can delete campaigns" ON campaigns;

CREATE POLICY "Authenticated users can view campaigns"
  ON campaigns FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert campaigns"
  ON campaigns FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update campaigns"
  ON campaigns FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete campaigns"
  ON campaigns FOR DELETE TO authenticated USING (true);

-- =============================================
-- 2e. COUPONS POLICIES
-- =============================================
DROP POLICY IF EXISTS "Users can view own coupons" ON coupons;
DROP POLICY IF EXISTS "Authenticated users can view all coupons" ON coupons;
DROP POLICY IF EXISTS "Users can insert own coupons" ON coupons;
DROP POLICY IF EXISTS "Authenticated users can update coupons" ON coupons;
DROP POLICY IF EXISTS "coupons_select_authenticated" ON coupons;
DROP POLICY IF EXISTS "coupons_insert_own" ON coupons;
DROP POLICY IF EXISTS "coupons_update_authenticated" ON coupons;

CREATE POLICY "coupons_select_authenticated"
  ON coupons FOR SELECT TO authenticated USING (true);
CREATE POLICY "coupons_insert_own"
  ON coupons FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "coupons_update_authenticated"
  ON coupons FOR UPDATE TO authenticated USING (true);

-- =============================================
-- 2f. GOAL COMPLETIONS POLICIES
-- =============================================
DROP POLICY IF EXISTS "Users can view own goal completions" ON goal_completions;
DROP POLICY IF EXISTS "Authenticated users can view all goal completions" ON goal_completions;
DROP POLICY IF EXISTS "Authenticated users can insert goal completions" ON goal_completions;
DROP POLICY IF EXISTS "goal_completions_select_authenticated" ON goal_completions;
DROP POLICY IF EXISTS "goal_completions_insert_authenticated" ON goal_completions;

CREATE POLICY "goal_completions_select_authenticated"
  ON goal_completions FOR SELECT TO authenticated USING (true);
CREATE POLICY "goal_completions_insert_authenticated"
  ON goal_completions FOR INSERT TO authenticated WITH CHECK (true);

-- =============================================
-- 2g. LUCKY NUMBERS POLICIES
-- =============================================
DROP POLICY IF EXISTS "Users can view own lucky numbers" ON lucky_numbers;
DROP POLICY IF EXISTS "Authenticated users can view all lucky numbers" ON lucky_numbers;
DROP POLICY IF EXISTS "Authenticated users can insert lucky numbers" ON lucky_numbers;
DROP POLICY IF EXISTS "Authenticated users can update lucky numbers" ON lucky_numbers;
DROP POLICY IF EXISTS "lucky_numbers_select_authenticated" ON lucky_numbers;
DROP POLICY IF EXISTS "lucky_numbers_insert_authenticated" ON lucky_numbers;
DROP POLICY IF EXISTS "lucky_numbers_update_authenticated" ON lucky_numbers;

CREATE POLICY "lucky_numbers_select_authenticated"
  ON lucky_numbers FOR SELECT TO authenticated USING (true);
CREATE POLICY "lucky_numbers_insert_authenticated"
  ON lucky_numbers FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "lucky_numbers_update_authenticated"
  ON lucky_numbers FOR UPDATE TO authenticated USING (true);

-- =============================================
-- 2h. NOTIFICATIONS POLICIES
-- =============================================
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
DROP POLICY IF EXISTS "Authenticated users can insert notifications" ON notifications;

CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Authenticated users can insert notifications"
  ON notifications FOR INSERT TO authenticated WITH CHECK (true);

-- =============================================
-- 2i. STORAGE BUCKET + POLICIES
-- =============================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('incentive-campaigns', 'incentive-campaigns', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Authenticated users can upload" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update" ON storage.objects;
DROP POLICY IF EXISTS "Public read access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete" ON storage.objects;

CREATE POLICY "Authenticated users can upload"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'incentive-campaigns');
CREATE POLICY "Authenticated users can update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'incentive-campaigns');
CREATE POLICY "Public read access"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'incentive-campaigns');
CREATE POLICY "Authenticated users can delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'incentive-campaigns');

-- =============================================
-- VERIFY STEP 2
-- =============================================
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, cmd;

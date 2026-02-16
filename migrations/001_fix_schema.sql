-- =============================================
-- Robsol VIP - Targeted Schema Fix
-- Paste this in Supabase SQL Editor (Dashboard > SQL Editor)
-- Safe to re-run: uses IF NOT EXISTS / OR REPLACE
-- =============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- 1. CREATE MISSING TABLES
-- =============================================

-- STORES (must exist before profiles references it)
CREATE TABLE IF NOT EXISTS stores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  cnpj TEXT UNIQUE NOT NULL,
  location TEXT,
  logo_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

CREATE INDEX IF NOT EXISTS idx_stores_cnpj ON stores(cnpj);
CREATE INDEX IF NOT EXISTS idx_stores_is_active ON stores(is_active);

-- LUCKY NUMBERS
CREATE TABLE IF NOT EXISTS lucky_numbers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  goal_completion_id UUID REFERENCES goal_completions(id) ON DELETE SET NULL,
  number INTEGER NOT NULL,
  is_winner BOOLEAN DEFAULT false,
  drawn_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

CREATE INDEX IF NOT EXISTS idx_lucky_numbers_user ON lucky_numbers(user_id);
CREATE INDEX IF NOT EXISTS idx_lucky_numbers_campaign ON lucky_numbers(campaign_id);
CREATE INDEX IF NOT EXISTS idx_lucky_numbers_campaign_number ON lucky_numbers(campaign_id, number);

-- NOTIFICATIONS
CREATE TABLE IF NOT EXISTS notifications (
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

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);

-- =============================================
-- 2. ADD MISSING COLUMNS TO PROFILES
-- =============================================

-- Add whatsapp column (if missing)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'whatsapp'
  ) THEN
    ALTER TABLE profiles ADD COLUMN whatsapp TEXT UNIQUE;
  END IF;
END $$;

-- Add store_id column with FK to stores (if missing)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'store_id'
  ) THEN
    ALTER TABLE profiles ADD COLUMN store_id UUID REFERENCES stores(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_profiles_store_id ON profiles(store_id);
  END IF;
END $$;

-- =============================================
-- 3. ENABLE RLS ON NEW TABLES
-- =============================================
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE lucky_numbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 4. FIX CAMPAIGNS RLS POLICIES (fixes 500 error)
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
-- 5. RLS POLICIES FOR NEW TABLES
-- =============================================

-- STORES POLICIES
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

-- LUCKY NUMBERS POLICIES
DROP POLICY IF EXISTS "lucky_numbers_select_authenticated" ON lucky_numbers;
DROP POLICY IF EXISTS "lucky_numbers_insert_authenticated" ON lucky_numbers;
DROP POLICY IF EXISTS "lucky_numbers_update_authenticated" ON lucky_numbers;

CREATE POLICY "lucky_numbers_select_authenticated"
  ON lucky_numbers FOR SELECT TO authenticated USING (true);
CREATE POLICY "lucky_numbers_insert_authenticated"
  ON lucky_numbers FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "lucky_numbers_update_authenticated"
  ON lucky_numbers FOR UPDATE TO authenticated USING (true);

-- NOTIFICATIONS POLICIES
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
-- 6. VERIFICATION QUERIES (run after migration)
-- =============================================

-- List all public tables
SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;

-- Confirm profiles columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'profiles'
ORDER BY ordinal_position;

-- List all RLS policies
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, cmd;

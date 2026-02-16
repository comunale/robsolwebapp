-- =============================================
-- STEP 1: Fix existing tables + create missing ones
-- Run this FIRST in the Supabase SQL Editor
-- =============================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- 1a. CREATE STORES TABLE (needed before profiles FK)
-- =============================================
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

-- =============================================
-- 1b. FIX PROFILES TABLE (add missing columns)
-- =============================================
-- The profiles table may already exist (created by Supabase Auth trigger)
-- but could be missing columns. ADD COLUMN IF NOT EXISTS handles this safely.

-- Add whatsapp column (nullable first, then we fix constraints)
DO $$
BEGIN
  -- Add whatsapp if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'whatsapp'
  ) THEN
    ALTER TABLE profiles ADD COLUMN whatsapp TEXT DEFAULT '';
    -- Backfill existing rows with unique placeholder values
    UPDATE profiles SET whatsapp = 'pending_' || id::text WHERE whatsapp = '' OR whatsapp IS NULL;
    -- Now make it NOT NULL
    ALTER TABLE profiles ALTER COLUMN whatsapp SET NOT NULL;
    -- Add unique constraint
    ALTER TABLE profiles ADD CONSTRAINT profiles_whatsapp_key UNIQUE (whatsapp);
    RAISE NOTICE 'Added whatsapp column to profiles.';
  ELSE
    RAISE NOTICE 'whatsapp column already exists.';
  END IF;

  -- Add store_id if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'store_id'
  ) THEN
    ALTER TABLE profiles ADD COLUMN store_id UUID REFERENCES stores(id) ON DELETE SET NULL;
    RAISE NOTICE 'Added store_id column to profiles.';
  ELSE
    RAISE NOTICE 'store_id column already exists.';
  END IF;

  -- Add total_points if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'total_points'
  ) THEN
    ALTER TABLE profiles ADD COLUMN total_points INTEGER DEFAULT 0 CHECK (total_points >= 0);
    RAISE NOTICE 'Added total_points column to profiles.';
  ELSE
    RAISE NOTICE 'total_points column already exists.';
  END IF;

  -- Add role if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'role'
  ) THEN
    ALTER TABLE profiles ADD COLUMN role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user'));
    RAISE NOTICE 'Added role column to profiles.';
  ELSE
    RAISE NOTICE 'role column already exists.';
  END IF;

  -- Add full_name if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'full_name'
  ) THEN
    ALTER TABLE profiles ADD COLUMN full_name TEXT NOT NULL DEFAULT 'Unnamed';
    RAISE NOTICE 'Added full_name column to profiles.';
  ELSE
    RAISE NOTICE 'full_name column already exists.';
  END IF;

  -- Add email if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'email'
  ) THEN
    ALTER TABLE profiles ADD COLUMN email TEXT DEFAULT '';
    UPDATE profiles SET email = 'pending_' || id::text WHERE email = '' OR email IS NULL;
    ALTER TABLE profiles ALTER COLUMN email SET NOT NULL;
    ALTER TABLE profiles ADD CONSTRAINT profiles_email_key UNIQUE (email);
    RAISE NOTICE 'Added email column to profiles.';
  ELSE
    RAISE NOTICE 'email column already exists.';
  END IF;

  -- Add created_at if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'created_at'
  ) THEN
    ALTER TABLE profiles ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW());
    RAISE NOTICE 'Added created_at column to profiles.';
  ELSE
    RAISE NOTICE 'created_at column already exists.';
  END IF;
END $$;

-- Create indexes on profiles (IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_whatsapp ON profiles(whatsapp);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_store_id ON profiles(store_id);

-- =============================================
-- 1c. CAMPAIGNS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS campaigns (
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

CREATE INDEX IF NOT EXISTS idx_campaigns_is_active ON campaigns(is_active);
CREATE INDEX IF NOT EXISTS idx_campaigns_dates ON campaigns(start_date, end_date);

-- =============================================
-- 1d. COUPONS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS coupons (
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

CREATE INDEX IF NOT EXISTS idx_coupons_user_id ON coupons(user_id);
CREATE INDEX IF NOT EXISTS idx_coupons_campaign_id ON coupons(campaign_id);
CREATE INDEX IF NOT EXISTS idx_coupons_status ON coupons(status);
CREATE INDEX IF NOT EXISTS idx_coupons_user_status ON coupons(user_id, status);

-- =============================================
-- 1e. GOAL COMPLETIONS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS goal_completions (
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

CREATE INDEX IF NOT EXISTS idx_goal_completions_user ON goal_completions(user_id);
CREATE INDEX IF NOT EXISTS idx_goal_completions_campaign ON goal_completions(campaign_id);
CREATE INDEX IF NOT EXISTS idx_goal_completions_period ON goal_completions(period_start, period_end);

-- =============================================
-- 1f. LUCKY NUMBERS TABLE
-- =============================================
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

-- =============================================
-- 1g. NOTIFICATIONS TABLE
-- =============================================
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
-- VERIFY STEP 1
-- =============================================
-- Run this to confirm all 7 tables exist with correct columns:
SELECT table_name, column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('stores', 'profiles', 'campaigns', 'coupons', 'goal_completions', 'lucky_numbers', 'notifications')
ORDER BY table_name, ordinal_position;

-- =============================================
-- FIX: Add missing columns to existing tables
-- Run this in the Supabase SQL Editor
-- =============================================
-- Based on live OpenAPI schema inspection:
-- - campaigns table is MISSING: settings (JSONB)
-- - goal_completions table is MISSING: coupons_count, bonus_points_awarded
-- All other tables and columns already exist correctly.

-- =============================================
-- 1. ADD settings COLUMN TO campaigns
-- =============================================
-- This is why POST /api/campaigns returns 500:
-- the API inserts { settings: body.settings || {} } but the column doesn't exist.
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}';

-- =============================================
-- 2. ADD missing columns TO goal_completions
-- =============================================
-- The evaluate_user_goals function inserts coupons_count and bonus_points_awarded
-- but these columns don't exist yet.
ALTER TABLE goal_completions ADD COLUMN IF NOT EXISTS coupons_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE goal_completions ADD COLUMN IF NOT EXISTS bonus_points_awarded INTEGER NOT NULL DEFAULT 0;

-- =============================================
-- 3. VERIFY: Confirm columns now exist
-- =============================================
SELECT table_name, column_name, data_type, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND (
    (table_name = 'campaigns' AND column_name = 'settings')
    OR (table_name = 'goal_completions' AND column_name IN ('coupons_count', 'bonus_points_awarded'))
  )
ORDER BY table_name, column_name;

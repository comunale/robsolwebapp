-- =============================================
-- Migration: Fix RLS Policies + Storage Permissions
-- Run this in the Supabase SQL Editor
-- =============================================

-- =============================================
-- 1. FIX PROFILES POLICIES (removes recursion risk)
-- =============================================
-- Problem: Two overlapping SELECT policies cause evaluation issues
-- when API routes query profiles for role checks, and triggers
-- update profiles.total_points during coupon approval joins.
--
-- Solution: One clean SELECT policy for authenticated users.
-- Admin authorization stays at the API route level (server-side).

-- Drop ALL existing profiles policies to start clean
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Authenticated users can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Allow insert for new users" ON profiles;

-- Recreate clean, non-recursive policies
CREATE POLICY "profiles_select_authenticated"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "profiles_insert_own"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update_authenticated"
  ON profiles FOR UPDATE
  TO authenticated
  USING (true);

-- NOTE: profiles_update is broad (USING true) because:
-- 1. The update_user_points trigger (SECURITY DEFINER) updates points on approval
-- 2. The evaluate_user_goals function (SECURITY DEFINER) awards bonus points
-- 3. Admin user management needs to update any profile
-- All actual authorization is enforced at the API route level.

-- =============================================
-- 2. FIX COUPONS POLICIES (remove duplicate SELECT)
-- =============================================
DROP POLICY IF EXISTS "Users can view own coupons" ON coupons;
DROP POLICY IF EXISTS "Authenticated users can view all coupons" ON coupons;
DROP POLICY IF EXISTS "Users can insert own coupons" ON coupons;
DROP POLICY IF EXISTS "Authenticated users can update coupons" ON coupons;

CREATE POLICY "coupons_select_authenticated"
  ON coupons FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "coupons_insert_own"
  ON coupons FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "coupons_update_authenticated"
  ON coupons FOR UPDATE
  TO authenticated
  USING (true);

-- =============================================
-- 3. FIX GOAL_COMPLETIONS POLICIES (skip if table does not exist yet)
-- =============================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'goal_completions') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Users can view own goal completions" ON goal_completions';
    EXECUTE 'DROP POLICY IF EXISTS "Authenticated users can view all goal completions" ON goal_completions';
    EXECUTE 'DROP POLICY IF EXISTS "Authenticated users can insert goal completions" ON goal_completions';

    EXECUTE 'CREATE POLICY "goal_completions_select_authenticated" ON goal_completions FOR SELECT TO authenticated USING (true)';
    EXECUTE 'CREATE POLICY "goal_completions_insert_authenticated" ON goal_completions FOR INSERT TO authenticated WITH CHECK (true)';

    RAISE NOTICE 'goal_completions policies updated.';
  ELSE
    RAISE NOTICE 'goal_completions table does not exist yet - skipping policies.';
  END IF;
END $$;

-- =============================================
-- 4. FIX LUCKY_NUMBERS POLICIES (skip if table does not exist yet)
-- =============================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'lucky_numbers') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Users can view own lucky numbers" ON lucky_numbers';
    EXECUTE 'DROP POLICY IF EXISTS "Authenticated users can view all lucky numbers" ON lucky_numbers';
    EXECUTE 'DROP POLICY IF EXISTS "Authenticated users can insert lucky numbers" ON lucky_numbers';
    EXECUTE 'DROP POLICY IF EXISTS "Authenticated users can update lucky numbers" ON lucky_numbers';

    EXECUTE 'CREATE POLICY "lucky_numbers_select_authenticated" ON lucky_numbers FOR SELECT TO authenticated USING (true)';
    EXECUTE 'CREATE POLICY "lucky_numbers_insert_authenticated" ON lucky_numbers FOR INSERT TO authenticated WITH CHECK (true)';
    EXECUTE 'CREATE POLICY "lucky_numbers_update_authenticated" ON lucky_numbers FOR UPDATE TO authenticated USING (true)';

    RAISE NOTICE 'lucky_numbers policies updated.';
  ELSE
    RAISE NOTICE 'lucky_numbers table does not exist yet - skipping policies.';
  END IF;
END $$;

-- =============================================
-- 5. STORAGE BUCKET POLICIES
-- =============================================
-- Ensure the incentive-campaigns bucket exists and has correct policies.
-- Run these ONLY if the storage policies are missing or incorrect.

-- Create bucket if it doesn't exist (idempotent)
INSERT INTO storage.buckets (id, name, public)
VALUES ('incentive-campaigns', 'incentive-campaigns', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Drop existing storage policies to avoid conflicts
DROP POLICY IF EXISTS "Authenticated users can upload" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update" ON storage.objects;
DROP POLICY IF EXISTS "Public read access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete" ON storage.objects;

-- Allow authenticated users to upload files
CREATE POLICY "Authenticated users can upload"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'incentive-campaigns');

-- Allow authenticated users to update/overwrite their uploads
CREATE POLICY "Authenticated users can update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'incentive-campaigns');

-- Allow public read access (for serving images via public URLs)
CREATE POLICY "Public read access"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'incentive-campaigns');

-- Allow authenticated users to delete files
CREATE POLICY "Authenticated users can delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'incentive-campaigns');

-- =============================================
-- 6. VERIFY: Check all policies are clean
-- =============================================
-- Run this to confirm no duplicate/recursive policies remain:
-- SELECT tablename, policyname, cmd, qual FROM pg_policies
-- WHERE schemaname = 'public'
-- ORDER BY tablename, cmd;

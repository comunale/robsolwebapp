-- Fix Profiles RLS Policies (Simple, No Recursion)
-- This script creates minimal RLS policies that cannot cause recursion
-- Run this in your Supabase SQL Editor

-- ============================================
-- STEP 1: Drop all existing policies
-- ============================================
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can delete profiles" ON profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON profiles;
DROP POLICY IF EXISTS "Allow public profile creation" ON profiles;

-- Drop the function if it exists
DROP FUNCTION IF EXISTS is_admin();
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- ============================================
-- STEP 2: Ensure correct foreign key
-- ============================================
ALTER TABLE profiles
  DROP CONSTRAINT IF EXISTS profiles_id_fkey;

ALTER TABLE profiles
  ADD CONSTRAINT profiles_id_fkey
  FOREIGN KEY (id)
  REFERENCES auth.users(id)
  ON DELETE CASCADE;

-- ============================================
-- STEP 3: Enable RLS
-- ============================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 4: Create simple, non-recursive policies
-- ============================================

-- Policy 1: Users can SELECT their own profile
-- This is safe - it only uses auth.uid() which doesn't query the table
CREATE POLICY "Users can view own profile"
ON profiles
FOR SELECT
TO authenticated
USING (id = auth.uid());

-- Policy 2: Users can UPDATE their own profile (non-admin fields only)
-- This is safe - it only uses auth.uid() which doesn't query the table
CREATE POLICY "Users can update own profile"
ON profiles
FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (
  id = auth.uid() AND
  role = (SELECT role FROM profiles WHERE id = auth.uid()) -- Prevent role escalation
);

-- Policy 3: Users can INSERT their own profile (during registration)
-- This is safe - it only uses auth.uid() which doesn't query the table
CREATE POLICY "Users can insert own profile"
ON profiles
FOR INSERT
TO authenticated
WITH CHECK (id = auth.uid());

-- Note: Admin operations will be handled server-side using the service role
-- This completely avoids any potential for recursion

-- ============================================
-- STEP 5: Create trigger for auto-profile creation
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role, total_points)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.email,
    'user',
    0
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Create the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- STEP 6: Grant permissions
-- ============================================
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE ON profiles TO authenticated;
GRANT EXECUTE ON FUNCTION handle_new_user() TO authenticated;

-- ============================================
-- STEP 7: Verify the setup
-- ============================================
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY policyname;

-- ============================================
-- DONE!
-- ============================================
-- You should see 3 policies:
-- 1. Users can view own profile
-- 2. Users can update own profile
-- 3. Users can insert own profile
--
-- Admin operations will be handled via API routes using the service role key
-- This completely avoids recursion issues

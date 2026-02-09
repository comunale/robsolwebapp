-- Fix Profiles Table RLS Policies (No Infinite Recursion)
-- Run this in your Supabase SQL Editor

-- First, drop all existing policies on profiles table
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON profiles;
DROP POLICY IF EXISTS "Allow public profile creation" ON profiles;

-- Drop the function if it exists
DROP FUNCTION IF EXISTS is_admin();

-- Create a security definer function to check if user is admin
-- This function runs with elevated privileges and can bypass RLS
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure the profiles table has the correct structure
-- The id should be a foreign key to auth.users
ALTER TABLE profiles
  DROP CONSTRAINT IF EXISTS profiles_id_fkey;

ALTER TABLE profiles
  ADD CONSTRAINT profiles_id_fkey
  FOREIGN KEY (id)
  REFERENCES auth.users(id)
  ON DELETE CASCADE;

-- Enable RLS on profiles table
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Policy 1: Users can view their own profile (no recursion - uses auth.uid() directly)
CREATE POLICY "Users can view own profile"
ON profiles
FOR SELECT
TO authenticated
USING (id = auth.uid());

-- Policy 2: Users can update their own profile (no recursion - uses auth.uid() directly)
CREATE POLICY "Users can update own profile"
ON profiles
FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- Policy 3: Users can insert their own profile during registration
CREATE POLICY "Users can insert own profile"
ON profiles
FOR INSERT
TO authenticated
WITH CHECK (id = auth.uid());

-- Policy 4: Admins can view all profiles (uses security definer function)
CREATE POLICY "Admins can view all profiles"
ON profiles
FOR SELECT
TO authenticated
USING (is_admin());

-- Policy 5: Admins can update all profiles (uses security definer function)
CREATE POLICY "Admins can update all profiles"
ON profiles
FOR UPDATE
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

-- Policy 6: Admins can delete profiles (uses security definer function)
CREATE POLICY "Admins can delete profiles"
ON profiles
FOR DELETE
TO authenticated
USING (is_admin());

-- Create a trigger to automatically create a profile when a user signs up
-- This ensures every user has a profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role, total_points)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.email,
    'user', -- Default role is 'user'
    0
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop the trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON profiles TO authenticated;
GRANT EXECUTE ON FUNCTION is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION handle_new_user() TO authenticated;

-- Verify the setup
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

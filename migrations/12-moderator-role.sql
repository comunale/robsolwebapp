-- Migration 12: Add 'moderator' role and admin RLS for profile updates
--
-- 1. Extends the profiles.role CHECK constraint to include 'moderator'.
-- 2. Adds an RLS policy so admin users can update any profile row
--    (required for the User Management CRUD in the admin panel).
--
-- Run this in the Supabase SQL Editor.

-- ── 1. Extend the role CHECK constraint ────────────────────────────────────
ALTER TABLE profiles
  DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('admin', 'moderator', 'user'));

-- ── 2. Allow admins to update any profile (for role/name/whatsapp edits) ──
-- Drop if it already exists to make the migration idempotent.
DROP POLICY IF EXISTS "Admins can update any profile" ON profiles;

CREATE POLICY "Admins can update any profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles AS me
      WHERE me.id = auth.uid() AND me.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles AS me
      WHERE me.id = auth.uid() AND me.role = 'admin'
    )
  );

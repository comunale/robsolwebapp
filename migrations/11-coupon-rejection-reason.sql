-- Migration 11: Add rejection_reason column to coupons table
-- Stores the admin-selected reason when a coupon is rejected,
-- which is shown to the user in their notification and coupon history.
--
-- Run this in the Supabase SQL Editor.

ALTER TABLE coupons
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

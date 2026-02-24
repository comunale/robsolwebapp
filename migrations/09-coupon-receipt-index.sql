-- Migration 09: Add functional index on extracted_data->>'receipt_number' for anti-fraud deduplication
-- Run this in the Supabase SQL Editor after migrations 07 and 08.

-- Partial functional index — only indexes rows that actually have a receipt_number,
-- keeping the index small and queries fast.
CREATE INDEX IF NOT EXISTS idx_coupons_receipt_number
  ON coupons ((extracted_data->>'receipt_number'), campaign_id)
  WHERE extracted_data->>'receipt_number' IS NOT NULL;

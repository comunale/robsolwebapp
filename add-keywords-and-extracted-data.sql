-- Add Keywords to Campaigns and Ensure Coupons Extracted Data
-- Run this in your Supabase SQL Editor

-- ============================================
-- STEP 1: Add keywords field to campaigns table
-- ============================================

-- Add keywords column (using text array for easy searching)
ALTER TABLE campaigns
ADD COLUMN IF NOT EXISTS keywords TEXT[] DEFAULT '{}';

-- Add a comment to document the field
COMMENT ON COLUMN campaigns.keywords IS 'Array of eligible product keywords/names for this campaign. Used to validate coupon submissions.';

-- ============================================
-- STEP 2: Verify coupons extracted_data field
-- ============================================

-- The extracted_data column should already be JSONB
-- This will ensure it's properly set up
ALTER TABLE coupons
ALTER COLUMN extracted_data TYPE JSONB USING extracted_data::JSONB;

-- Add a comment to document the field
COMMENT ON COLUMN coupons.extracted_data IS 'JSONB containing full list of items extracted by AI from the coupon image, including product names, quantities, prices, etc.';

-- ============================================
-- STEP 3: Create helper functions for keyword matching
-- ============================================

-- Function to check if a coupon contains any of the campaign keywords
CREATE OR REPLACE FUNCTION coupon_matches_campaign_keywords(
  coupon_items JSONB,
  campaign_keywords TEXT[]
)
RETURNS BOOLEAN AS $$
DECLARE
  item JSONB;
  item_name TEXT;
  keyword TEXT;
BEGIN
  -- If no keywords specified, match all coupons
  IF campaign_keywords IS NULL OR array_length(campaign_keywords, 1) IS NULL THEN
    RETURN TRUE;
  END IF;

  -- Check each item in the coupon
  FOR item IN SELECT * FROM jsonb_array_elements(coupon_items)
  LOOP
    -- Extract the item name (adjust field name as needed)
    item_name := LOWER(item->>'name');

    -- Check if item name contains any keyword
    FOREACH keyword IN ARRAY campaign_keywords
    LOOP
      IF item_name LIKE '%' || LOWER(keyword) || '%' THEN
        RETURN TRUE;
      END IF;
    END LOOP;
  END LOOP;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION coupon_matches_campaign_keywords(JSONB, TEXT[]) TO authenticated;

-- ============================================
-- STEP 4: Add indexes for better performance
-- ============================================

-- Create GIN index on keywords for faster searching
CREATE INDEX IF NOT EXISTS idx_campaigns_keywords ON campaigns USING GIN(keywords);

-- Create GIN index on extracted_data for faster JSONB queries
CREATE INDEX IF NOT EXISTS idx_coupons_extracted_data ON coupons USING GIN(extracted_data);

-- ============================================
-- STEP 5: Update campaign types (for reference)
-- ============================================

-- Example of how the data will look:

-- campaigns.keywords example:
-- ['Coca-Cola', 'Pepsi', 'Sprite', 'Fanta']
-- or
-- ['Beer', 'Wine', 'Spirits']

-- coupons.extracted_data example:
-- {
--   "items": [
--     {
--       "name": "Coca-Cola 2L",
--       "quantity": 2,
--       "price": 3.99,
--       "unit_price": 1.99
--     },
--     {
--       "name": "Bread",
--       "quantity": 1,
--       "price": 2.50
--     }
--   ],
--   "total": 10.48,
--   "store": "Supermarket ABC",
--   "date": "2026-02-09"
-- }

-- ============================================
-- STEP 6: Verify the changes
-- ============================================

-- Check that keywords column was added to campaigns
SELECT
  column_name,
  data_type,
  column_default
FROM information_schema.columns
WHERE table_name = 'campaigns'
  AND column_name = 'keywords';

-- Check that extracted_data is JSONB in coupons
SELECT
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'coupons'
  AND column_name = 'extracted_data';

-- Check that indexes were created
SELECT
  indexname,
  tablename,
  indexdef
FROM pg_indexes
WHERE tablename IN ('campaigns', 'coupons')
  AND (indexname LIKE '%keywords%' OR indexname LIKE '%extracted_data%');

-- ============================================
-- DONE!
-- ============================================
-- The campaigns table now has a keywords field
-- The coupons table extracted_data is confirmed as JSONB
-- Helper function available for keyword matching
-- Indexes created for better performance

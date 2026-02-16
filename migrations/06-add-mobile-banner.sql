-- Migration 06: Add mobile banner URL column to campaigns
-- Desktop banner (16:9 landscape) stays in banner_url
-- Mobile banner (4:3 portrait/square) goes in banner_url_mobile

ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS banner_url_mobile TEXT;

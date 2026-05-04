-- =============================================
-- Migration 19: Manual raffle publication workflow
-- Winners are drawn privately first, then manually published/notified by admin.
-- =============================================

ALTER TABLE public.lucky_numbers
  ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS winner_notified_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE public.campaigns
  ADD COLUMN IF NOT EXISTS draw_base_notified_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_lucky_numbers_public_winners
  ON public.lucky_numbers (campaign_id, drawn_at DESC)
  WHERE is_winner = true AND is_public = true;

CREATE INDEX IF NOT EXISTS idx_lucky_numbers_private_winners
  ON public.lucky_numbers (campaign_id, drawn_at DESC)
  WHERE is_winner = true AND is_public = false;

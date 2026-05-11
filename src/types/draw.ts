export interface Draw {
  id: string
  campaign_id: string
  round_number: number
  status: 'draft' | 'published'
  drawn_at: string
  published_at: string | null
  base_notified_at: string | null
  winner_count: number
  created_at: string
}

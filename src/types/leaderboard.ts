export interface LeaderboardEntry {
  user_id: string
  full_name: string
  store_id: string | null
  store_name: string | null
  total_points: number
  campaign_id: string | null
  campaign_title: string | null
  total_coupons: number
  approved_coupons: number
  campaign_points: number
  lucky_numbers_count: number
  rank_in_campaign: number
}

export interface StorePerformance {
  store_id: string
  store_name: string
  cnpj: string
  location: string | null
  salesperson_count: number
  total_coupons: number
  approved_coupons: number
  total_points: number
  goals_completed: number
  current_week_approved: number
  previous_week_approved: number
}

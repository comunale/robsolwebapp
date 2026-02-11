export interface GoalConfig {
  id: string
  label: string
  period: 'weekly' | 'monthly'
  metric: 'approved_coupons'
  target: number
  bonus_points: number
  lucky_numbers: number
}

export interface CampaignSettings {
  points_per_coupon: number
  has_draws: boolean
  draw_type: 'manual' | 'random' | null
  goals: GoalConfig[]
}

export interface GoalCompletion {
  id: string
  user_id: string
  campaign_id: string
  goal_id: string
  period_start: string
  period_end: string
  coupons_count: number
  bonus_points_awarded: number
  completed_at: string
}

export interface GoalProgress {
  goal: GoalConfig
  current_count: number
  target: number
  percentage: number
  is_completed: boolean
  completion?: GoalCompletion
}

export interface LuckyNumber {
  id: string
  user_id: string
  campaign_id: string
  goal_completion_id: string | null
  number: number
  is_winner: boolean
  drawn_at: string | null
  created_at: string
}

export type NotificationType =
  | 'goal_completed'
  | 'coupon_approved'
  | 'coupon_rejected'
  | 'lucky_number'
  | 'draw_winner'
  | 'campaign_new'
  | 'general'

export type NotificationChannel = 'in_app' | 'email' | 'both'

export interface Notification {
  id: string
  user_id: string
  type: NotificationType
  title: string
  body: string | null
  data: Record<string, unknown>
  is_read: boolean
  channel: NotificationChannel
  created_at: string
}

export type CouponStatus = 'pending' | 'approved' | 'rejected'

export interface CouponItem {
  name: string
  quantity?: number
  price?: number
  unit_price?: number
}

export interface ExtractedData {
  items: CouponItem[]
  total?: number
  store?: string
  date?: string
  [key: string]: any // Allow additional fields from AI extraction
}

export interface Coupon {
  id: string
  user_id: string
  campaign_id: string
  image_url: string
  status: CouponStatus
  extracted_data: ExtractedData | null
  points_awarded: number
  created_at: string
  reviewed_at: string | null
  reviewed_by: string | null
}

export interface CreateCouponInput {
  user_id: string
  campaign_id: string
  image_url: string
  extracted_data?: ExtractedData | null
}

export interface UpdateCouponInput {
  status?: CouponStatus
  extracted_data?: ExtractedData | null
  points_awarded?: number
  reviewed_at?: string | null
  reviewed_by?: string | null
}

export interface ReviewCouponInput {
  status: 'approved' | 'rejected'
  points_awarded?: number
}

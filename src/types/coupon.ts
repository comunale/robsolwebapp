export type CouponStatus = 'pending' | 'approved' | 'rejected'

export interface CouponItem {
  name: string
  quantity?: number
  price?: number
  unit_price?: number
  matched_keyword?: string | null
}

export interface ExtractedData {
  customer_name?: string
  date?: string
  store?: string
  total?: number
  items: CouponItem[]
  matched_keywords: string[]
  has_matching_products: boolean
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

export interface CouponWithRelations extends Coupon {
  profiles?: { full_name: string; email: string }
  campaigns?: { title: string; keywords: string[] }
}

export interface CreateCouponInput {
  user_id: string
  campaign_id: string
  image_url: string
  extracted_data?: ExtractedData | null
}

export interface ReviewCouponInput {
  status: 'approved' | 'rejected'
  points_awarded?: number
}

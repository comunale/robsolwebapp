import type { CampaignSettings } from './goal'

export type CampaignType = 'incentive' | 'raffle_only'

export interface Campaign {
  id: string
  title: string
  description: string | null
  start_date: string
  end_date: string
  is_active: boolean
  type: CampaignType
  banner_url: string | null
  banner_url_mobile: string | null
  keywords: string[]
  settings: CampaignSettings | null
  draw_base_notified_at: string | null
  status: 'active' | 'closed'
  created_at: string
  updated_at: string
}

export interface CreateCampaignInput {
  title: string
  description: string | null
  start_date: string
  end_date: string
  is_active: boolean
  type?: CampaignType
  banner_url: string | null
  banner_url_mobile: string | null
  keywords?: string[]
  settings?: CampaignSettings | null
  draw_base_notified_at?: string | null
}

export interface UpdateCampaignInput {
  title?: string
  description?: string | null
  start_date?: string
  end_date?: string
  is_active?: boolean
  type?: CampaignType
  banner_url?: string | null
  banner_url_mobile?: string | null
  keywords?: string[]
  settings?: CampaignSettings | null
  draw_base_notified_at?: string | null
}

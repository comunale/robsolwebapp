import type { CampaignSettings } from './goal'

export interface Campaign {
  id: string
  title: string
  description: string | null
  start_date: string
  end_date: string
  is_active: boolean
  banner_url: string | null
  banner_url_mobile: string | null
  keywords: string[]
  settings: CampaignSettings | null
  created_at: string
  updated_at: string
}

export interface CreateCampaignInput {
  title: string
  description: string | null
  start_date: string
  end_date: string
  is_active: boolean
  banner_url: string | null
  banner_url_mobile: string | null
  keywords?: string[]
  settings?: CampaignSettings | null
}

export interface UpdateCampaignInput {
  title?: string
  description?: string | null
  start_date?: string
  end_date?: string
  is_active?: boolean
  banner_url?: string | null
  banner_url_mobile?: string | null
  keywords?: string[]
  settings?: CampaignSettings | null
}

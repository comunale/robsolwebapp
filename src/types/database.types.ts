export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      stores: {
        Row: {
          id: string
          name: string
          cnpj: string
          location: string | null
          logo_url: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          cnpj: string
          location?: string | null
          logo_url?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          cnpj?: string
          location?: string | null
          logo_url?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      profiles: {
        Row: {
          id: string
          full_name: string
          email: string
          role: 'admin' | 'user'
          total_points: number
          store_id: string | null
          created_at: string
        }
        Insert: {
          id: string
          full_name: string
          email: string
          role: 'admin' | 'user'
          total_points?: number
          store_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          full_name?: string
          email?: string
          role?: 'admin' | 'user'
          total_points?: number
          store_id?: string | null
          created_at?: string
        }
      }
      campaigns: {
        Row: {
          id: string
          title: string
          description: string | null
          start_date: string
          end_date: string
          is_active: boolean
          banner_url: string | null
          keywords: string[]
          settings: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          start_date: string
          end_date: string
          is_active?: boolean
          banner_url?: string | null
          keywords?: string[]
          settings?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          start_date?: string
          end_date?: string
          is_active?: boolean
          banner_url?: string | null
          keywords?: string[]
          settings?: Json | null
          created_at?: string
          updated_at?: string
        }
      }
      coupons: {
        Row: {
          id: string
          user_id: string
          campaign_id: string
          image_url: string
          status: 'pending' | 'approved' | 'rejected'
          extracted_data: Json | null
          points_awarded: number
          created_at: string
          reviewed_at: string | null
          reviewed_by: string | null
        }
        Insert: {
          id?: string
          user_id: string
          campaign_id: string
          image_url: string
          status?: 'pending' | 'approved' | 'rejected'
          extracted_data?: Json | null
          points_awarded?: number
          created_at?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          campaign_id?: string
          image_url?: string
          status?: 'pending' | 'approved' | 'rejected'
          extracted_data?: Json | null
          points_awarded?: number
          created_at?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
        }
      }
      goal_completions: {
        Row: {
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
        Insert: {
          id?: string
          user_id: string
          campaign_id: string
          goal_id: string
          period_start: string
          period_end: string
          coupons_count: number
          bonus_points_awarded?: number
          completed_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          campaign_id?: string
          goal_id?: string
          period_start?: string
          period_end?: string
          coupons_count?: number
          bonus_points_awarded?: number
          completed_at?: string
        }
      }
      lucky_numbers: {
        Row: {
          id: string
          user_id: string
          campaign_id: string
          goal_completion_id: string | null
          number: number
          is_winner: boolean
          drawn_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          campaign_id: string
          goal_completion_id?: string | null
          number: number
          is_winner?: boolean
          drawn_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          campaign_id?: string
          goal_completion_id?: string | null
          number?: number
          is_winner?: boolean
          drawn_at?: string | null
          created_at?: string
        }
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          type: string
          title: string
          body: string | null
          data: Json
          is_read: boolean
          channel: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: string
          title: string
          body?: string | null
          data?: Json
          is_read?: boolean
          channel?: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          type?: string
          title?: string
          body?: string | null
          data?: Json
          is_read?: boolean
          channel?: string
          created_at?: string
        }
      }
    }
  }
}

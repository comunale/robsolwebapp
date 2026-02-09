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
      profiles: {
        Row: {
          id: string
          full_name: string
          email: string
          role: 'admin' | 'user'
          total_points: number
          created_at: string
        }
        Insert: {
          id: string
          full_name: string
          email: string
          role: 'admin' | 'user'
          total_points?: number
          created_at?: string
        }
        Update: {
          id?: string
          full_name?: string
          email?: string
          role?: 'admin' | 'user'
          total_points?: number
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
    }
  }
}

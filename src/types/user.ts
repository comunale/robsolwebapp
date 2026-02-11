export type UserRole = 'admin' | 'user'

export interface Profile {
  id: string
  full_name: string
  email: string
  whatsapp: string
  role: UserRole
  total_points: number
  store_id: string | null
  created_at: string
}

export interface User {
  id: string
  email: string
  profile: Profile | null
}

export type UserRole = 'admin' | 'moderator' | 'user'

export interface Profile {
  id: string
  full_name: string
  email: string
  whatsapp: string
  cpf: string | null
  role: UserRole
  total_points: number
  store_id: string | null
  requested_store_name: string | null
  status: 'active' | 'pending_store_approval'
  created_at: string
}

export interface User {
  id: string
  email: string
  profile: Profile | null
}

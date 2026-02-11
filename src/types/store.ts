export interface Store {
  id: string
  name: string
  cnpj: string
  location: string | null
  logo_url: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface CreateStoreInput {
  name: string
  cnpj: string
  location?: string | null
  logo_url?: string | null
}

export interface UpdateStoreInput {
  name?: string
  cnpj?: string
  location?: string | null
  logo_url?: string | null
  is_active?: boolean
}

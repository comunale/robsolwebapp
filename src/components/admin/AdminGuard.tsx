'use client'

import { createContext, useContext } from 'react'
import { useAuth } from '@/lib/hooks/useAuth'
import LoadingSpinner from '@/components/shared/LoadingSpinner'
import type { User as SupabaseUser } from '@supabase/supabase-js'
import type { Profile } from '@/types/user'

interface AdminContextValue {
  user: SupabaseUser
  profile: Profile
  signOut: () => Promise<{ error: Error | null }>
}

const AdminContext = createContext<AdminContextValue | null>(null)

/**
 * Hook for admin components to access authenticated user/profile.
 * Only works inside AdminGuard — no need for loading/null checks.
 */
export function useAdmin(): AdminContextValue {
  const ctx = useContext(AdminContext)
  if (!ctx) throw new Error('useAdmin must be used inside AdminGuard')
  return ctx
}

/**
 * Single auth guard for all admin pages.
 * Renders children only when user is authenticated and has admin role.
 * Provides user/profile via context — child components never need useAuth().
 */
export default function AdminGuard({ children }: { children: React.ReactNode }) {
  const { user, profile, loading, signOut } = useAuth()

  if (loading) return <LoadingSpinner />
  if (!user || !profile || profile.role !== 'admin') return null

  return (
    <AdminContext.Provider value={{ user, profile, signOut }}>
      {children}
    </AdminContext.Provider>
  )
}

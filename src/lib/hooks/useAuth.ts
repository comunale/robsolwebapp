'use client'

import { useEffect, useState, useMemo, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User as SupabaseUser } from '@supabase/supabase-js'
import type { Profile } from '@/types/user'

export function useAuth() {
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [profileLoading, setProfileLoading] = useState(false)
  const supabase = useMemo(() => createClient(), [])
  const profileIdRef = useRef<string | null>(null)

  useEffect(() => {
    let mounted = true

    // Safety net: if onAuthStateChange never fires (e.g. slow network on hard
    // refresh), force-clear the spinner so the page doesn't hang forever.
    const timeout = setTimeout(() => {
      if (mounted) setLoading(false)
    }, 5000)

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return

      // Callback fired — safety timeout no longer needed.
      clearTimeout(timeout)

      const currentUser = session?.user ?? null
      setUser(currentUser)

      if (!currentUser) {
        profileIdRef.current = null
        setProfile(null)
      }

      // Unblock the spinner as soon as we know auth state.
      // AdminGuard will keep showing the spinner while profile is still null
      // (see the `user && !profile` check there), so there's no blank flash.
      if (mounted) setLoading(false)

      // Profile fetch is async and independent — it doesn't delay auth resolution.
      if (currentUser && profileIdRef.current !== currentUser.id) {
        profileIdRef.current = currentUser.id
        if (mounted) setProfileLoading(true)
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', currentUser.id)
            .single()

          if (!mounted) return
          if (error) throw error
          setProfile(data)
        } catch (error) {
          console.error('Error fetching profile:', error)
          if (mounted) setProfile(null)
        } finally {
          if (mounted) setProfileLoading(false)
        }
      }
    })

    return () => {
      mounted = false
      clearTimeout(timeout)
      subscription.unsubscribe()
    }
  }, [supabase])

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    return { data, error }
  }

  const signUp = async (
    email: string,
    password: string,
    fullName: string,
    whatsapp: string,
    storeId?: string,
    cpf?: string,
    requestedStoreName?: string
  ) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: 'https://appbeneficios.robsol.com.br/auth/callback',
        data: {
          full_name: fullName,
          whatsapp,
          cpf: cpf || null,
          store_id: storeId || null,
          requested_store_name: requestedStoreName || null,
        },
      },
    })
    return { data, error }
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (!error) {
      setUser(null)
      setProfile(null)
    }
    return { error }
  }

  return {
    user,
    profile,
    loading,
    profileLoading,
    signIn,
    signUp,
    signOut,
    isAdmin: profile?.role === 'admin',
  }
}

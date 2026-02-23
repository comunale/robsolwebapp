'use client'

import { useEffect, useState, useMemo, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User as SupabaseUser } from '@supabase/supabase-js'
import type { Profile } from '@/types/user'

export function useAuth() {
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = useMemo(() => createClient(), [])
  const profileIdRef = useRef<string | null>(null)

  useEffect(() => {
    let mounted = true

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return

      const currentUser = session?.user ?? null
      setUser(currentUser)

      if (currentUser) {
        // Only fetch profile if user changed (not on token refresh)
        if (profileIdRef.current !== currentUser.id) {
          profileIdRef.current = currentUser.id
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
          }
        }
      } else {
        profileIdRef.current = null
        setProfile(null)
      }

      if (mounted) setLoading(false)
    })

    return () => {
      mounted = false
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

  const signUp = async (email: string, password: string, fullName: string, whatsapp: string, storeId?: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          whatsapp,
          store_id: storeId || null,
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
    signIn,
    signUp,
    signOut,
    isAdmin: profile?.role === 'admin',
  }
}

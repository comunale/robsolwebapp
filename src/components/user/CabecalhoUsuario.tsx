'use client'

import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '@/lib/hooks/useAuth'
import { createClient } from '@/lib/supabase/client'
import { useBrand } from '@/components/shared/BrandProvider'
import Notificacoes from './Notificacoes'
import PwaInstallButton from '@/components/shared/PwaInstallButton'

export default function CabecalhoUsuario() {
  const { user, profile, signOut } = useAuth()
  const brand = useBrand()
  const [showNotifications, setShowNotifications] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const supabase = useMemo(() => createClient(), [])

  // ── Fetch initial unread count on mount ──────────────────────────────────
  useEffect(() => {
    if (!user) return
    let cancelled = false
    const fetchCount = async () => {
      try {
        const res = await fetch('/api/notifications')
        const data = await res.json()
        if (!cancelled && data.notifications) {
          setUnreadCount(
            (data.notifications as { is_read: boolean }[]).filter((n) => !n.is_read).length
          )
        }
      } catch { /* silent */ }
    }
    void fetchCount()
    return () => { cancelled = true }
  }, [user])

  // ── Supabase Realtime: increment badge on new notification ───────────────
  useEffect(() => {
    if (!user) return
    const channel = supabase
      .channel(`notifications-bell-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          setUnreadCount((c) => c + 1)
        }
      )
      .subscribe()

    return () => { void supabase.removeChannel(channel) }
  }, [user, supabase])

  return (
    <header
      className="md:hidden shadow-sm sticky top-0 z-40"
      style={{ backgroundColor: 'var(--brand-bg-from)' }}
    >
      <div className="max-w-lg mx-auto px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Logo — configure via Admin › Configurações › Identidade Visual */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={brand.logo_header_url || '/logo-header.png'}
            alt="Robsol VIP"
            style={{
              width: `${Math.min(parseInt(brand.logo_header_width || '100', 10) || 100, 160)}px`,
              height: 'auto',
              maxWidth: '160px',
            }}
            className="object-contain"
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
          />
          <div>
            <p className="text-sm font-semibold text-white">Ola, {profile?.full_name?.split(' ')[0]}!</p>
            <p className="text-xs text-white/80 font-bold">{profile?.total_points || 0} pontos</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <PwaInstallButton variant="dark" className="px-2.5" />
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 text-white hover:text-white/80 transition"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold leading-none">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
          <button
            onClick={async () => { await signOut(); window.location.href = '/login' }}
            className="p-2 text-white hover:text-white/80 transition"
            title="Sair"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </div>

      {showNotifications && (
        <Notificacoes
          onClose={() => setShowNotifications(false)}
          onUnreadCountChange={setUnreadCount}
        />
      )}
    </header>
  )
}

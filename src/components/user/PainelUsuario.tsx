'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useAuth } from '@/lib/hooks/useAuth'
import { createClient } from '@/lib/supabase/client'
import CabecalhoUsuario from './CabecalhoUsuario'
import BarraNavegacao from './BarraNavegacao'
import DestaquesCampanhas from './DestaquesCampanhas'
import CarrosselBanners from './CarrosselBanners'
import ProgressoMetas from './ProgressoMetas'
import LoadingSpinner from '@/components/shared/LoadingSpinner'
import type { Campaign } from '@/types/campaign'

interface TopUser {
  id: string
  full_name: string
  total_points: number
}

interface CouponStats {
  total: number
  approved: number
  rejected: number
}

export default function PainelUsuario() {
  const { user, profile, loading } = useAuth()
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [joinedIds, setJoinedIds] = useState<Set<string>>(new Set())
  const [couponStats, setCouponStats] = useState<CouponStats>({ total: 0, approved: 0, rejected: 0 })
  const [topUsers, setTopUsers] = useState<TopUser[]>([])
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    if (!user) return
    let active = true
    const fetchData = async () => {
      const [campaignsRes, participantsRes, totalRes, approvedRes, rejectedRes, topUsersRes] =
        await Promise.all([
          supabase
            .from('campaigns')
            .select('*')
            .eq('is_active', true)
            .order('created_at', { ascending: false }),
          supabase
            .from('campaign_participants')
            .select('campaign_id')
            .eq('user_id', user.id),
          supabase
            .from('coupons')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', user.id),
          supabase
            .from('coupons')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('status', 'approved'),
          supabase
            .from('coupons')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('status', 'rejected'),
          supabase
            .from('profiles')
            .select('id, full_name, total_points')
            .eq('role', 'user')
            .order('total_points', { ascending: false })
            .limit(3),
        ])

      if (!active) return
      if (campaignsRes.data) setCampaigns(campaignsRes.data as Campaign[])
      if (participantsRes.data) {
        setJoinedIds(new Set(participantsRes.data.map((p: { campaign_id: string }) => p.campaign_id)))
      }
      setCouponStats({
        total: totalRes.count ?? 0,
        approved: approvedRes.count ?? 0,
        rejected: rejectedRes.count ?? 0,
      })
      if (topUsersRes.data) setTopUsers(topUsersRes.data as TopUser[])
    }

    void fetchData()
    return () => { active = false }
  }, [user, supabase])

  const handleJoinCampaign = (campaignId: string) => {
    setJoinedIds((prev) => new Set([...prev, campaignId]))
  }

  if (loading) return <LoadingSpinner />
  if (!user || !profile) return null

  const joinedCampaigns = campaigns.filter((c) => joinedIds.has(c.id))

  const quickActions = [
    {
      label: 'Escanear Cupons',
      href: '/dashboard/scan',
      icon: (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
      ),
      color: 'bg-indigo-100 text-indigo-600',
    },
    {
      label: 'Meus Cupons',
      href: '/dashboard/meus-cupons',
      icon: (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      ),
      color: 'bg-green-100 text-green-600',
    },
    {
      label: 'Ranking',
      href: '/dashboard/ranking',
      icon: (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      ),
      color: 'bg-purple-100 text-purple-600',
    },
    {
      label: 'Números da Sorte',
      href: '/dashboard/numeros-da-sorte',
      icon: (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
      ),
      color: 'bg-amber-100 text-amber-600',
    },
  ]

  const rankColors = [
    { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-200' },
    { bg: 'bg-gray-100', text: 'text-gray-500', border: 'border-gray-200' },
    { bg: 'bg-orange-100', text: 'text-orange-600', border: 'border-orange-200' },
  ]

  return (
    <>
      <CabecalhoUsuario />
      <main className="max-w-lg md:max-w-3xl mx-auto px-4 md:px-8 py-4 pb-24 md:pb-8">

        {/* Banner Carousel */}
        <CarrosselBanners />

        {/* ── Ranking Preview ─────────────────────────────────────────────── */}
        {topUsers.length > 0 && (
          <section className="mb-6">
            <div className="flex items-center justify-between px-1 mb-3">
              <h2 className="text-sm font-semibold text-gray-700">Resumo do Ranking</h2>
              <Link
                href="/dashboard/ranking"
                className="text-xs text-indigo-600 font-medium hover:text-indigo-800 transition"
              >
                Ver Ranking Completo
              </Link>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm divide-y divide-gray-50">
              {topUsers.map((u, i) => {
                const isMe = u.id === profile.id
                const colors = rankColors[i] ?? { bg: 'bg-gray-50', text: 'text-gray-500', border: 'border-gray-100' }
                return (
                  <div
                    key={u.id}
                    className={`flex items-center gap-3 px-4 py-3 ${isMe ? 'bg-indigo-50' : ''}`}
                  >
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold border ${colors.bg} ${colors.text} ${colors.border}`}>
                      {i + 1}
                    </div>
                    <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-sm flex-shrink-0">
                      {u.full_name?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                    <p className={`flex-1 text-sm font-medium truncate ${isMe ? 'text-indigo-700' : 'text-gray-900'}`}>
                      {u.full_name}{isMe ? ' (Você)' : ''}
                    </p>
                    <span className="text-sm font-bold text-indigo-600">{u.total_points} pts</span>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* ── Campanhas Disponíveis ────────────────────────────────────────── */}
        <DestaquesCampanhas
          campaigns={campaigns}
          joinedIds={joinedIds}
          onJoin={handleJoinCampaign}
        />

        {/* ── Goal progress — only for joined campaigns ────────────────────── */}
        {joinedCampaigns.length > 0 && <ProgressoMetas campaigns={joinedCampaigns} />}

        {/* ── Coupon Stats ─────────────────────────────────────────────────── */}
        <section className="mb-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-3 px-1">Meus Cupons</h2>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
              <svg className="w-5 h-5 text-gray-400 mx-auto mb-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-xl font-bold text-gray-800">{couponStats.total}</p>
              <p className="text-xs text-gray-500 mt-0.5">Enviados</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
              <svg className="w-5 h-5 text-green-500 mx-auto mb-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-xl font-bold text-green-700">{couponStats.approved}</p>
              <p className="text-xs text-gray-500 mt-0.5">Válidos</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
              <svg className="w-5 h-5 text-red-400 mx-auto mb-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-xl font-bold text-red-600">{couponStats.rejected}</p>
              <p className="text-xs text-gray-500 mt-0.5">Recusados</p>
            </div>
          </div>
        </section>

        {/* ── Quick Actions ─────────────────────────────────────────────────── */}
        <section>
          <h2 className="text-sm font-semibold text-gray-700 mb-3 px-1">Ações Rápidas</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {quickActions.map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm hover:shadow-md transition flex flex-col items-center gap-2"
              >
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${action.color}`}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {action.icon}
                  </svg>
                </div>
                <span className="text-xs font-medium text-gray-700 text-center">{action.label}</span>
              </Link>
            ))}
          </div>
        </section>
      </main>
      <BarraNavegacao />
    </>
  )
}

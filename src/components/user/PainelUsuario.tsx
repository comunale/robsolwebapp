'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
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

export default function PainelUsuario() {
  const { user, profile, loading } = useAuth()
  const router = useRouter()
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [topUsers, setTopUsers] = useState<{ full_name: string; total_points: number }[]>([])
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  useEffect(() => {
    if (!user) return
    let active = true
    const fetchData = async () => {
      const [campaignsRes, topUsersRes] = await Promise.all([
        supabase
          .from('campaigns')
          .select('*')
          .eq('is_active', true)
          .order('created_at', { ascending: false }),
        supabase
          .from('profiles')
          .select('full_name, total_points')
          .eq('role', 'user')
          .order('total_points', { ascending: false })
          .limit(3),
      ])

      if (!active) return
      if (campaignsRes.data) setCampaigns(campaignsRes.data as Campaign[])
      if (topUsersRes.data) setTopUsers(topUsersRes.data)
    }

    void fetchData()
    return () => {
      active = false
    }
  }, [user, supabase])

  if (loading) return <LoadingSpinner />
  if (!user || !profile) return null

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
      label: 'Numeros da Sorte',
      href: '/dashboard/numeros-da-sorte',
      icon: (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
      ),
      color: 'bg-amber-100 text-amber-600',
    },
  ]

  return (
    <>
      <CabecalhoUsuario />
      <main className="max-w-lg mx-auto px-4 py-4 pb-24">
        {/* Banner Carousel */}
        <CarrosselBanners topUsers={topUsers} />

        {/* Destaques de campanhas */}
        <DestaquesCampanhas campaigns={campaigns} />

        {/* Progresso das metas */}
        <ProgressoMetas campaigns={campaigns} />

        {/* Acoes rapidas */}
        <section>
          <h2 className="text-sm font-semibold text-gray-700 mb-3 px-1">Acoes Rapidas</h2>
          <div className="grid grid-cols-2 gap-3">
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

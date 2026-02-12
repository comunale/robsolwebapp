'use client'

import { useEffect, useState, useMemo } from 'react'
import { useAuth } from '@/lib/hooks/useAuth'
import { createClient } from '@/lib/supabase/client'
import AdminHeader from './AdminHeader'
import LoadingSpinner from '@/components/shared/LoadingSpinner'

interface AnalyticsData {
  totalCampaigns: number
  activeCampaigns: number
  totalCoupons: number
  pendingCoupons: number
  approvedCoupons: number
  rejectedCoupons: number
  totalPointsAwarded: number
  activeStores: number
  goalsCompleted: number
  totalLuckyNumbers: number
  luckyNumberWinners: number
}

export default function AnalyticsDashboard() {
  const { user, profile, loading: authLoading } = useAuth()
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    if (!user || profile?.role !== 'admin') return
    const fetchAnalytics = async () => {
      const [
        campAll, campActive, coupAll, coupPending, coupApproved, coupRejected,
        storeRes, goalRes, luckyAll, luckyWinners,
      ] = await Promise.all([
        supabase.from('campaigns').select('id', { count: 'exact', head: true }),
        supabase.from('campaigns').select('id', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('coupons').select('id', { count: 'exact', head: true }),
        supabase.from('coupons').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('coupons').select('id', { count: 'exact', head: true }).eq('status', 'approved'),
        supabase.from('coupons').select('id', { count: 'exact', head: true }).eq('status', 'rejected'),
        supabase.from('stores').select('id', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('goal_completions').select('id', { count: 'exact', head: true }),
        supabase.from('lucky_numbers').select('id', { count: 'exact', head: true }),
        supabase.from('lucky_numbers').select('id', { count: 'exact', head: true }).eq('is_winner', true),
      ])

      const { data: pointsData } = await supabase
        .from('coupons')
        .select('points_awarded')
        .eq('status', 'approved')

      const totalPoints = pointsData?.reduce((sum, c) => sum + (c.points_awarded || 0), 0) ?? 0

      setData({
        totalCampaigns: campAll.count ?? 0,
        activeCampaigns: campActive.count ?? 0,
        totalCoupons: coupAll.count ?? 0,
        pendingCoupons: coupPending.count ?? 0,
        approvedCoupons: coupApproved.count ?? 0,
        rejectedCoupons: coupRejected.count ?? 0,
        totalPointsAwarded: totalPoints,
        activeStores: storeRes.count ?? 0,
        goalsCompleted: goalRes.count ?? 0,
        totalLuckyNumbers: luckyAll.count ?? 0,
        luckyNumberWinners: luckyWinners.count ?? 0,
      })
      setLoading(false)
    }
    fetchAnalytics()
  }, [user, profile, supabase])

  if (authLoading || loading) return <LoadingSpinner />
  if (!profile || profile.role !== 'admin' || !data) return null

  const approvalRate =
    data.totalCoupons > 0
      ? Math.round((data.approvedCoupons / (data.approvedCoupons + data.rejectedCoupons || 1)) * 100)
      : 0

  const stats = [
    { label: 'Campanhas', value: data.totalCampaigns, sub: `${data.activeCampaigns} ativas`, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Envios', value: data.totalCoupons, sub: `${data.pendingCoupons} pendentes`, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { label: 'Aprovados', value: data.approvedCoupons, sub: `${approvalRate}% taxa`, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Rejeitados', value: data.rejectedCoupons, sub: '', color: 'text-red-600', bg: 'bg-red-50' },
    { label: 'Pontos', value: data.totalPointsAwarded, sub: 'total distribuido', color: 'text-purple-600', bg: 'bg-purple-50' },
  ]

  const gamificationStats = [
    { label: 'Lojas Ativas', value: data.activeStores, color: 'text-teal-600', bg: 'bg-teal-50' },
    { label: 'Metas Concluidas', value: data.goalsCompleted, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Numeros da Sorte', value: data.totalLuckyNumbers, sub: `${data.luckyNumberWinners} ganhador(es)`, color: 'text-amber-600', bg: 'bg-amber-50' },
  ]

  return (
    <>
      <AdminHeader title="Relatorios" subtitle="Metricas de campanhas e cupons" />

      <div className="p-8 space-y-8">
        {/* Indicadores principais */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {stats.map((s) => (
            <div key={s.label} className={`${s.bg} rounded-xl p-5`}>
              <p className="text-xs text-gray-500 mb-1">{s.label}</p>
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              {s.sub && <p className="text-xs text-gray-500 mt-1">{s.sub}</p>}
            </div>
          ))}
        </div>

        {/* Indicadores de gamificacao */}
        <div>
          <h3 className="font-semibold text-gray-900 mb-3">Gamificacao</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {gamificationStats.map((s) => (
              <div key={s.label} className={`${s.bg} rounded-xl p-5`}>
                <p className="text-xs text-gray-500 mb-1">{s.label}</p>
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                {'sub' in s && s.sub && <p className="text-xs text-gray-500 mt-1">{s.sub}</p>}
              </div>
            ))}
          </div>
        </div>

        {/* Resumo por status de cupons */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Status dos Cupons</h3>
          <div className="space-y-3">
            {[
              { label: 'Pendentes', count: data.pendingCoupons, color: 'bg-yellow-500', total: data.totalCoupons },
              { label: 'Aprovados', count: data.approvedCoupons, color: 'bg-green-500', total: data.totalCoupons },
              { label: 'Rejeitados', count: data.rejectedCoupons, color: 'bg-red-500', total: data.totalCoupons },
            ].map((bar) => {
              const pct = bar.total > 0 ? (bar.count / bar.total) * 100 : 0
              return (
                <div key={bar.label}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">{bar.label}</span>
                    <span className="font-medium text-gray-900">{bar.count} ({Math.round(pct)}%)</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full ${bar.color} rounded-full`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </>
  )
}

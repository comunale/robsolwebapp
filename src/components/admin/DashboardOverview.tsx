'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import AdminHeader from './AdminHeader'
import { useAdmin } from './AdminGuard'

interface Stats {
  campaigns: number
  pendingCoupons: number
  users: number
  activeStores: number
  goalsCompleted: number
  luckyNumbers: number
}

export default function DashboardOverview() {
  const { profile } = useAdmin()
  const [stats, setStats] = useState<Stats>({
    campaigns: 0, pendingCoupons: 0, users: 0,
    activeStores: 0, goalsCompleted: 0, luckyNumbers: 0,
  })
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    const fetchStats = async () => {
      const [campRes, coupRes, storeRes, goalRes, luckyRes] = await Promise.all([
        supabase.from('campaigns').select('id', { count: 'exact', head: true }),
        supabase.from('coupons').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('stores').select('id', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('goal_completions').select('id', { count: 'exact', head: true }),
        supabase.from('lucky_numbers').select('id', { count: 'exact', head: true }),
      ])
      setStats({
        campaigns: campRes.count ?? 0,
        pendingCoupons: coupRes.count ?? 0,
        users: 0,
        activeStores: storeRes.count ?? 0,
        goalsCompleted: goalRes.count ?? 0,
        luckyNumbers: luckyRes.count ?? 0,
      })
    }
    fetchStats()
  }, [supabase])

  const cards = [
    { label: 'Campanhas', value: stats.campaigns, color: 'text-blue-600', bg: 'bg-blue-100', href: '/admin/campaigns' },
    { label: 'Cupons Pendentes', value: stats.pendingCoupons, color: 'text-yellow-600', bg: 'bg-yellow-100', href: '/admin/coupons' },
    { label: 'Lojas Ativas', value: stats.activeStores, color: 'text-teal-600', bg: 'bg-teal-100', href: '/admin/stores' },
    { label: 'Metas Concluidas', value: stats.goalsCompleted, color: 'text-green-600', bg: 'bg-green-100', href: '/admin/analytics' },
    { label: 'Numeros da Sorte', value: stats.luckyNumbers, color: 'text-amber-600', bg: 'bg-amber-100', href: '/admin/draws' },
  ]

  return (
    <>
      <AdminHeader title="Painel" subtitle={`Bem-vindo(a) de volta, ${profile.full_name}`} />

      <div className="p-8 space-y-8">
        {/* Indicadores */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {cards.map((c) => (
            <Link key={c.label} href={c.href} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition">
              <p className="text-sm text-gray-500 mb-1">{c.label}</p>
              <p className={`text-3xl font-bold ${c.color}`}>{c.value}</p>
            </Link>
          ))}
        </div>

        {/* Banner principal */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl p-8 text-white">
          <h2 className="text-2xl font-bold mb-2">Painel de Controle</h2>
          <p className="text-indigo-100 mb-6">Gerencie campanhas, revise cupons e monitore o desempenho.</p>
          <div className="flex gap-3">
            <Link href="/admin/campaigns/new" className="bg-white text-indigo-600 px-5 py-2.5 rounded-lg font-medium hover:bg-indigo-50 transition text-sm">
              Criar Campanha
            </Link>
            <Link href="/admin/coupons" className="bg-indigo-700 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-indigo-800 transition text-sm">
              Revisar Cupons
            </Link>
          </div>
        </div>

        {/* Grade de acoes rapidas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Campanhas', desc: 'Criar e gerenciar campanhas', href: '/admin/campaigns', bg: 'bg-indigo-100', color: 'text-indigo-600' },
            { label: 'Cupons', desc: 'Aprovar ou rejeitar envios', href: '/admin/coupons', bg: 'bg-yellow-100', color: 'text-yellow-600' },
            { label: 'Lojas', desc: 'Gerenciar lojas parceiras', href: '/admin/stores', bg: 'bg-teal-100', color: 'text-teal-600' },
            { label: 'Sorteios', desc: 'Realizar sorteios de campanhas', href: '/admin/draws', bg: 'bg-amber-100', color: 'text-amber-600' },
            { label: 'Usuarios', desc: 'Visualizar contas de usuarios', href: '/admin/users', bg: 'bg-green-100', color: 'text-green-600' },
            { label: 'Desempenho', desc: 'Desempenho das lojas', href: '/admin/stores/rewards', bg: 'bg-pink-100', color: 'text-pink-600' },
            { label: 'Relatorios', desc: 'Relatorios e metricas', href: '/admin/analytics', bg: 'bg-purple-100', color: 'text-purple-600' },
          ].map((item) => (
            <Link key={item.href} href={item.href} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition">
              <div className={`w-10 h-10 ${item.bg} rounded-lg flex items-center justify-center mb-3`}>
                <div className={`w-5 h-5 ${item.color} rounded-full`} />
              </div>
              <h3 className="font-semibold text-gray-900 text-sm mb-1">{item.label}</h3>
              <p className="text-gray-500 text-xs">{item.desc}</p>
            </Link>
          ))}
        </div>
      </div>
    </>
  )
}

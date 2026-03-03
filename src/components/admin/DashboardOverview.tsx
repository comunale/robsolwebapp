'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import AdminHeader from './AdminHeader'
import { useAdmin } from './AdminGuard'

interface Stats {
  campaigns: number
  pendingCoupons: number
  totalCoupons: number
  totalUsers: number
  activeStores: number
  goalsCompleted: number
  luckyNumbers: number
}

export default function DashboardOverview() {
  const { profile } = useAdmin()
  const [stats, setStats] = useState<Stats>({
    campaigns: 0, pendingCoupons: 0, totalCoupons: 0,
    totalUsers: 0, activeStores: 0, goalsCompleted: 0, luckyNumbers: 0,
  })
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    const fetchStats = async () => {
      const [campRes, pendingRes, totalCoupRes, usersRes, storeRes, goalRes, luckyRes] = await Promise.all([
        supabase.from('campaigns').select('id', { count: 'exact', head: true }),
        supabase.from('coupons').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('coupons').select('id', { count: 'exact', head: true }),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'user'),
        supabase.from('stores').select('id', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('goal_completions').select('id', { count: 'exact', head: true }),
        supabase.from('lucky_numbers').select('id', { count: 'exact', head: true }),
      ])
      setStats({
        campaigns: campRes.count ?? 0,
        pendingCoupons: pendingRes.count ?? 0,
        totalCoupons: totalCoupRes.count ?? 0,
        totalUsers: usersRes.count ?? 0,
        activeStores: storeRes.count ?? 0,
        goalsCompleted: goalRes.count ?? 0,
        luckyNumbers: luckyRes.count ?? 0,
      })
    }
    fetchStats()
  }, [supabase])

  const cards = [
    { label: 'Clientes Cadastrados', value: stats.totalUsers, color: 'text-indigo-600', bg: 'bg-indigo-100', href: '/admin/users' },
    { label: 'Cupons Enviados', value: stats.totalCoupons, color: 'text-blue-600', bg: 'bg-blue-100', href: '/admin/coupons' },
    { label: 'Cupons Pendentes', value: stats.pendingCoupons, color: 'text-yellow-600', bg: 'bg-yellow-100', href: '/admin/coupons' },
    { label: 'Campanhas', value: stats.campaigns, color: 'text-teal-600', bg: 'bg-teal-100', href: '/admin/campaigns' },
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
            {
              label: 'Campanhas', desc: 'Criar e gerenciar campanhas', href: '/admin/campaigns',
              bg: 'bg-indigo-100', color: 'text-indigo-600',
              // Flag icon (Heroicons v2 outline)
              icon: 'M3 3v1.5M3 21v-6m0 0 2.77-.693a9 9 0 0 1 6.208.682l.108.054a9 9 0 0 0 6.086.71l3.114-.732a48.524 48.524 0 0 1-.005-10.499l-3.11.732a9 9 0 0 1-6.085-.711l-.108-.054a9 9 0 0 0-6.208-.682L3 4.5M3 15V4.5',
            },
            {
              label: 'Cupons', desc: 'Aprovar ou rejeitar envios', href: '/admin/coupons',
              bg: 'bg-yellow-100', color: 'text-yellow-600',
              // Ticket icon
              icon: 'M16.5 6v.75a3.75 3.75 0 0 1 0 7.5V15m0 6.75v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21.75m-9 0V15m0-9.75v.75a3.75 3.75 0 0 0 0 7.5V15m-6.75 6.75v-3.375c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125V21.75M7.5 15V5.25a2.25 2.25 0 0 1 2.25-2.25h4.5A2.25 2.25 0 0 1 16.5 5.25V15',
            },
            {
              label: 'Lojas', desc: 'Gerenciar lojas parceiras', href: '/admin/stores',
              bg: 'bg-teal-100', color: 'text-teal-600',
              // Building store icon
              icon: 'M13.5 21v-7.5a.75.75 0 0 1 .75-.75h3a.75.75 0 0 1 .75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 0 0 3.75-.615A2.993 2.993 0 0 0 9.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 0 0 2.25 1.016c.896 0 1.7-.393 2.25-1.015a3.001 3.001 0 0 0 3.75.614m-16.5 0a3.004 3.004 0 0 1-.621-4.72l1.189-1.19A1.5 1.5 0 0 1 5.378 3h13.243a1.5 1.5 0 0 1 1.06.44l1.19 1.189a3 3 0 0 1-.621 4.72m-13.5 8.65h3.75a.75.75 0 0 0 .75-.75V13.5a.75.75 0 0 0-.75-.75H6.75a.75.75 0 0 0-.75.75v3.75c0 .415.336.75.75.75Z',
            },
            {
              label: 'Sorteios', desc: 'Realizar sorteios de campanhas', href: '/admin/draws',
              bg: 'bg-amber-100', color: 'text-amber-600',
              // Sparkles icon
              icon: 'M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z',
            },
            {
              label: 'Usuarios', desc: 'Visualizar contas de usuarios', href: '/admin/users',
              bg: 'bg-green-100', color: 'text-green-600',
              // Users icon
              icon: 'M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z',
            },
            {
              label: 'Desempenho', desc: 'Desempenho das lojas', href: '/admin/stores/rewards',
              bg: 'bg-pink-100', color: 'text-pink-600',
              // Trending up / arrow icon
              icon: 'M2.25 18 9 11.25l4.306 4.306a11.95 11.95 0 0 1 5.814-5.518l2.74-1.22m0 0-5.94-2.281m5.94 2.28-2.28 5.941',
            },
            {
              label: 'Relatorios', desc: 'Relatorios e metricas', href: '/admin/analytics',
              bg: 'bg-purple-100', color: 'text-purple-600',
              // BarChart3 icon
              icon: 'M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z',
            },
          ].map((item) => (
            <Link key={item.href} href={item.href} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition group">
              <div className={`w-10 h-10 ${item.bg} rounded-lg flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                <svg className={`w-5 h-5 ${item.color}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
                </svg>
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

'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/lib/hooks/useAuth'
import { createClient } from '@/lib/supabase/client'
import AdminHeader from './AdminHeader'
import LoadingSpinner from '@/components/shared/LoadingSpinner'

interface Stats {
  campaigns: number
  pendingCoupons: number
  users: number
}

export default function DashboardOverview() {
  const { user, profile, loading } = useAuth()
  const [stats, setStats] = useState<Stats>({ campaigns: 0, pendingCoupons: 0, users: 0 })
  const supabase = createClient()

  useEffect(() => {
    if (!user) return
    const fetchStats = async () => {
      const [campRes, coupRes] = await Promise.all([
        supabase.from('campaigns').select('id', { count: 'exact', head: true }),
        supabase.from('coupons').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      ])
      setStats({
        campaigns: campRes.count ?? 0,
        pendingCoupons: coupRes.count ?? 0,
        users: 0,
      })
    }
    fetchStats()
  }, [user])

  if (loading) return <LoadingSpinner />
  if (!profile || profile.role !== 'admin') return null

  const cards = [
    { label: 'Total Campaigns', value: stats.campaigns, color: 'text-blue-600', bg: 'bg-blue-100', href: '/admin/campaigns' },
    { label: 'Pending Coupons', value: stats.pendingCoupons, color: 'text-yellow-600', bg: 'bg-yellow-100', href: '/admin/coupons' },
    { label: 'Total Users', value: stats.users, color: 'text-green-600', bg: 'bg-green-100', href: '/admin/users' },
  ]

  return (
    <>
      <AdminHeader title="Dashboard" subtitle={`Welcome back, ${profile.full_name}`} />

      <div className="p-8 space-y-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {cards.map((c) => (
            <Link key={c.label} href={c.href} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition">
              <p className="text-sm text-gray-500 mb-1">{c.label}</p>
              <p className={`text-3xl font-bold ${c.color}`}>{c.value}</p>
            </Link>
          ))}
        </div>

        {/* Hero banner */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl p-8 text-white">
          <h2 className="text-2xl font-bold mb-2">Admin Control Panel</h2>
          <p className="text-indigo-100 mb-6">Manage campaigns, review coupon submissions, and monitor user activities.</p>
          <div className="flex gap-3">
            <Link href="/admin/campaigns/new" className="bg-white text-indigo-600 px-5 py-2.5 rounded-lg font-medium hover:bg-indigo-50 transition text-sm">
              Create Campaign
            </Link>
            <Link href="/admin/coupons" className="bg-indigo-700 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-indigo-800 transition text-sm">
              Review Coupons
            </Link>
          </div>
        </div>

        {/* Quick Actions Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Manage Campaigns', desc: 'Create, edit, and manage campaigns', href: '/admin/campaigns', bg: 'bg-indigo-100', color: 'text-indigo-600' },
            { label: 'Review Coupons', desc: 'Approve or reject submissions', href: '/admin/coupons', bg: 'bg-yellow-100', color: 'text-yellow-600' },
            { label: 'User Management', desc: 'View and manage user accounts', href: '/admin/users', bg: 'bg-green-100', color: 'text-green-600' },
            { label: 'Analytics', desc: 'View reports and performance', href: '/admin/analytics', bg: 'bg-purple-100', color: 'text-purple-600' },
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

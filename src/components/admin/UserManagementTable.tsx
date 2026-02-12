'use client'

import { useEffect, useState, useMemo } from 'react'
import { useAuth } from '@/lib/hooks/useAuth'
import { createClient } from '@/lib/supabase/client'
import AdminHeader from './AdminHeader'
import LoadingSpinner from '@/components/shared/LoadingSpinner'
import type { Profile } from '@/types/user'
import type { Campaign } from '@/types/campaign'

interface ProfileWithStore extends Profile {
  stores?: { name: string } | null
}

function formatWhatsAppDisplay(digits: string): string {
  if (!digits) return '-'
  if (digits.length === 11) return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
  if (digits.length === 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`
  return digits
}

function downloadCSV(filename: string, headers: string[], rows: string[][]) {
  const BOM = '\uFEFF'
  const csvContent = BOM + [
    headers.join(';'),
    ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(';'))
  ].join('\n')

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

export default function UserManagementTable() {
  const { user, profile, loading: authLoading } = useAuth()
  const [users, setUsers] = useState<ProfileWithStore[]>([])
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [selectedCampaignExport, setSelectedCampaignExport] = useState('')
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    if (!user || profile?.role !== 'admin') return
    const fetchData = async () => {
      const [usersRes, campaignsRes] = await Promise.all([
        supabase
          .from('profiles')
          .select('*, stores(name)')
          .order('created_at', { ascending: false }),
        supabase
          .from('campaigns')
          .select('*')
          .order('title'),
      ])
      setUsers((usersRes.data as unknown as ProfileWithStore[]) || [])
      setCampaigns((campaignsRes.data as Campaign[]) || [])
      setLoading(false)
    }
    fetchData()
  }, [user, profile, supabase])

  const handleExportGeneral = () => {
    const headers = ['Nome', 'Loja', 'WhatsApp', 'Email', 'Data de Cadastro']
    const rows = users.map(u => [
      u.full_name || 'Sem nome',
      u.stores?.name || '-',
      formatWhatsAppDisplay(u.whatsapp),
      u.email,
      new Date(u.created_at).toLocaleDateString('pt-BR'),
    ])
    const date = new Date().toISOString().slice(0, 10)
    downloadCSV(`usuarios_${date}.csv`, headers, rows)
  }

  const handleExportCampaign = async () => {
    if (!selectedCampaignExport) return
    setExporting(true)

    try {
      const campaign = campaigns.find(c => c.id === selectedCampaignExport)
      if (!campaign) return

      // Fetch campaign-specific data: coupons with points, lucky numbers
      const [couponsRes, luckyRes] = await Promise.all([
        supabase
          .from('coupons')
          .select('user_id, points_awarded, status')
          .eq('campaign_id', selectedCampaignExport)
          .eq('status', 'approved'),
        supabase
          .from('lucky_numbers')
          .select('user_id, number, is_winner')
          .eq('campaign_id', selectedCampaignExport),
      ])

      const couponsData = couponsRes.data || []
      const luckyData = luckyRes.data || []

      // Aggregate per user
      const userPoints: Record<string, number> = {}
      const userCoupons: Record<string, number> = {}
      for (const c of couponsData) {
        userPoints[c.user_id] = (userPoints[c.user_id] || 0) + (c.points_awarded || 0)
        userCoupons[c.user_id] = (userCoupons[c.user_id] || 0) + 1
      }

      const userLucky: Record<string, string[]> = {}
      for (const ln of luckyData) {
        if (!userLucky[ln.user_id]) userLucky[ln.user_id] = []
        userLucky[ln.user_id].push(ln.is_winner ? `${ln.number} (GANHADOR)` : String(ln.number))
      }

      const headers = [
        'Nome', 'Loja', 'WhatsApp', 'Email', 'Data de Cadastro',
        'Pontos na Campanha', 'Cupons Aprovados', 'Numeros da Sorte', 'Participando'
      ]

      const rows = users
        .filter(u => u.role === 'user')
        .map(u => {
          const pts = userPoints[u.id] || 0
          const couponCount = userCoupons[u.id] || 0
          const lucky = userLucky[u.id]?.join(', ') || '-'
          const active = couponCount > 0 ? 'Sim' : 'Nao'
          return [
            u.full_name || 'Sem nome',
            u.stores?.name || '-',
            formatWhatsAppDisplay(u.whatsapp),
            u.email,
            new Date(u.created_at).toLocaleDateString('pt-BR'),
            String(pts),
            String(couponCount),
            lucky,
            active,
          ]
        })

      const safeName = campaign.title.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 30)
      const date = new Date().toISOString().slice(0, 10)
      downloadCSV(`campanha_${safeName}_${date}.csv`, headers, rows)
    } catch (err) {
      console.error('Export error:', err)
    } finally {
      setExporting(false)
    }
  }

  if (authLoading || loading) return <LoadingSpinner />
  if (!profile || profile.role !== 'admin') return null

  return (
    <>
      <AdminHeader title="Gestao de Usuarios" subtitle="Visualize e exporte dados dos usuarios cadastrados" />

      <div className="p-8">
        {/* Export Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Exportar Dados</h3>
          <div className="flex flex-wrap gap-4 items-end">
            {/* Option A: General Export */}
            <div>
              <p className="text-xs text-gray-500 mb-2">Exportacao Geral</p>
              <button
                onClick={handleExportGeneral}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Exportar Todos (CSV)
              </button>
            </div>

            {/* Divider */}
            <div className="hidden sm:block w-px h-12 bg-gray-200" />

            {/* Option B: Campaign Export */}
            <div className="flex items-end gap-2">
              <div>
                <p className="text-xs text-gray-500 mb-2">Exportacao por Campanha</p>
                <select
                  value={selectedCampaignExport}
                  onChange={(e) => setSelectedCampaignExport(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-white min-w-[200px]"
                >
                  <option value="">Selecione a campanha...</option>
                  {campaigns.map(c => (
                    <option key={c.id} value={c.id}>{c.title}</option>
                  ))}
                </select>
              </div>
              <button
                onClick={handleExportCampaign}
                disabled={!selectedCampaignExport || exporting}
                className="px-4 py-2 bg-teal-600 hover:bg-teal-700 disabled:bg-gray-300 text-white rounded-lg text-sm font-medium transition flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                {exporting ? 'Exportando...' : 'Exportar Campanha (CSV)'}
              </button>
            </div>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Usuario</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">WhatsApp</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Loja</th>
                  <th className="text-center px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Perfil</th>
                  <th className="text-center px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Pontos</th>
                  <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Cadastro</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-400">
                      Nenhum usuario encontrado
                    </td>
                  </tr>
                ) : (
                  users.map((u) => (
                    <tr key={u.id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-semibold text-sm">
                            {u.full_name?.charAt(0)?.toUpperCase() || '?'}
                          </div>
                          <span className="font-medium text-gray-900 text-sm">{u.full_name || 'Sem nome'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{u.email}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{formatWhatsAppDisplay(u.whatsapp)}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {u.stores?.name || <span className="text-gray-400">-</span>}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          u.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-700'
                        }`}>
                          {u.role === 'admin' ? 'Admin' : 'Usuario'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center text-sm font-medium text-gray-900">{u.total_points}</td>
                      <td className="px-6 py-4 text-right text-sm text-gray-500">
                        {new Date(u.created_at).toLocaleDateString('pt-BR')}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 text-xs text-gray-500">
            Total: {users.length} usuario(s) cadastrado(s)
          </div>
        </div>
      </div>
    </>
  )
}

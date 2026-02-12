'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/lib/hooks/useAuth'
import AdminHeader from './AdminHeader'
import LoadingSpinner from '@/components/shared/LoadingSpinner'
import type { Campaign } from '@/types/campaign'

export default function CampaignList() {
  const { user, profile, loading: authLoading } = useAuth()
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (user && profile?.role === 'admin') {
      fetchCampaigns()
    }
  }, [user, profile])

  const fetchCampaigns = async () => {
    try {
      const response = await fetch('/api/campaigns')
      if (!response.ok) throw new Error('Falha ao carregar campanhas')
      const data = await response.json()
      setCampaigns(data.campaigns || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta campanha?')) return
    try {
      const response = await fetch(`/api/campaigns/${id}`, { method: 'DELETE' })
      if (!response.ok) throw new Error('Falha ao excluir campanha')
      await fetchCampaigns()
    } catch (err: any) {
      alert(err.message)
    }
  }

  const toggleActive = async (campaign: Campaign) => {
    try {
      const response = await fetch(`/api/campaigns/${campaign.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !campaign.is_active }),
      })
      if (!response.ok) throw new Error('Falha ao atualizar campanha')
      await fetchCampaigns()
    } catch (err: any) {
      alert(err.message)
    }
  }

  if (authLoading || loading) return <LoadingSpinner />
  if (!profile || profile.role !== 'admin') return null

  return (
    <>
      <AdminHeader title="Campanhas" subtitle="Crie e gerencie campanhas de incentivo">
        <Link
          href="/admin/campaigns/new"
          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition text-sm"
        >
          + Criar Campanha
        </Link>
      </AdminHeader>

      <div className="p-8">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {campaigns.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Nenhuma campanha ainda</h3>
            <p className="text-gray-600 mb-6">Comece criando sua primeira campanha</p>
            <Link
              href="/admin/campaigns/new"
              className="inline-block px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition"
            >
              Criar Primeira Campanha
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {campaigns.map((campaign) => (
              <div key={campaign.id} className="bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition">
                <div className="p-6">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-bold text-gray-900">{campaign.title}</h3>
                        <button
                          onClick={() => toggleActive(campaign)}
                          className={`px-3 py-1 rounded-full text-xs font-medium ${
                            campaign.is_active
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {campaign.is_active ? 'Ativa' : 'Inativa'}
                        </button>
                      </div>
                      {campaign.description && (
                        <p className="text-gray-600 text-sm mb-3">{campaign.description}</p>
                      )}
                      {campaign.keywords?.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-3">
                          {campaign.keywords.map((kw, i) => (
                            <span key={i} className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-full text-xs font-medium">
                              {kw}
                            </span>
                          ))}
                        </div>
                      )}
                      {/* Settings Badges */}
                      {campaign.settings && (
                        <div className="flex flex-wrap gap-1.5 mb-3">
                          {campaign.settings.points_per_coupon != null && (
                            <span className="px-2 py-0.5 bg-purple-50 text-purple-700 rounded-full text-xs font-medium">
                              {campaign.settings.points_per_coupon} pts/cupom
                            </span>
                          )}
                          {campaign.settings.has_draws && (
                            <span className="px-2 py-0.5 bg-amber-50 text-amber-700 rounded-full text-xs font-medium">
                              Sorteio ({campaign.settings.draw_type || 'manual'})
                            </span>
                          )}
                          {campaign.settings.goals?.length > 0 && (
                            <span className="px-2 py-0.5 bg-teal-50 text-teal-700 rounded-full text-xs font-medium">
                              {campaign.settings.goals.length} meta(s)
                            </span>
                          )}
                        </div>
                      )}
                      <div className="flex gap-6 text-xs text-gray-500">
                        <span><span className="font-medium">Inicio:</span> {new Date(campaign.start_date).toLocaleDateString('pt-BR')}</span>
                        <span><span className="font-medium">Fim:</span> {new Date(campaign.end_date).toLocaleDateString('pt-BR')}</span>
                        <span><span className="font-medium">Criada em:</span> {new Date(campaign.created_at).toLocaleDateString('pt-BR')}</span>
                      </div>
                    </div>
                    {campaign.banner_url && (
                      <div className="ml-6 flex-shrink-0">
                        <img
                          src={campaign.banner_url}
                          alt={campaign.title}
                          className="w-40 h-28 object-cover rounded-lg"
                        />
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100">
                    <Link
                      href={`/admin/campaigns/${campaign.id}/edit`}
                      className="px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-sm font-medium transition"
                    >
                      Editar
                    </Link>
                    <button
                      onClick={() => handleDelete(campaign.id)}
                      className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg text-sm font-medium transition"
                    >
                      Excluir
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}

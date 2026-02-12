'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useAuth } from '@/lib/hooks/useAuth'
import { createClient } from '@/lib/supabase/client'
import AdminHeader from './AdminHeader'
import LoadingSpinner from '@/components/shared/LoadingSpinner'
import type { Campaign } from '@/types/campaign'
import type { LuckyNumber } from '@/types/goal'

export default function DrawManager() {
  const { user, profile, loading: authLoading } = useAuth()
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [selectedCampaign, setSelectedCampaign] = useState<string>('')
  const [luckyNumbers, setLuckyNumbers] = useState<(LuckyNumber & { full_name?: string })[]>([])
  const [loading, setLoading] = useState(true)
  const [drawing, setDrawing] = useState(false)
  const [drawCount, setDrawCount] = useState(1)
  const [lastWinners, setLastWinners] = useState<{ number: number; user_id: string }[]>([])
  const supabase = useMemo(() => createClient(), [])

  const fetchCampaigns = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('campaigns')
        .select('*')
        .eq('is_active', true)
        .order('title')
      if (data) setCampaigns(data as Campaign[])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [supabase])

  const fetchLuckyNumbers = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('lucky_numbers')
        .select('*, profiles(full_name)')
        .eq('campaign_id', selectedCampaign)
        .order('number')
      if (data) {
        setLuckyNumbers(data.map((n: LuckyNumber & { profiles?: { full_name: string } | null }) => ({
          ...n,
          full_name: n.profiles?.full_name,
        })))
      }
    } catch (err) {
      console.error(err)
    }
  }, [selectedCampaign, supabase])

  useEffect(() => {
    if (user && profile?.role === 'admin') {
      void fetchCampaigns()
    }
  }, [user, profile, fetchCampaigns])

  useEffect(() => {
    if (selectedCampaign) {
      void fetchLuckyNumbers()
    }
  }, [selectedCampaign, fetchLuckyNumbers])

  const executeDraw = async () => {
    if (!selectedCampaign) return
    setDrawing(true)
    setLastWinners([])
    try {
      const res = await fetch('/api/draws', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaign_id: selectedCampaign, draw_count: drawCount }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setLastWinners(data.winners)
      await fetchLuckyNumbers()
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Falha ao executar sorteio')
    } finally {
      setDrawing(false)
    }
  }

  const totalNumbers = luckyNumbers.length
  const eligibleNumbers = luckyNumbers.filter((n) => !n.is_winner).length
  const winners = luckyNumbers.filter((n) => n.is_winner)

  if (authLoading || loading) return <LoadingSpinner />
  if (!user || profile?.role !== 'admin') return null

  return (
    <>
      <AdminHeader title="Gerenciador de Sorteios" subtitle="Realize sorteios de numeros da sorte para campanhas" />

      <div className="p-6 space-y-6">
        {/* Campaign Selection */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Selecionar Campanha</label>
          <select
            value={selectedCampaign}
            onChange={(e) => setSelectedCampaign(e.target.value)}
            className="w-full max-w-md px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-white"
          >
            <option value="">Escolha uma campanha...</option>
            {campaigns.map((c) => (
              <option key={c.id} value={c.id}>{c.title}</option>
            ))}
          </select>
        </div>

        {selectedCampaign && (
          <>
            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
                <p className="text-sm text-gray-500">Total de Numeros</p>
                <p className="text-2xl font-bold text-gray-900">{totalNumbers}</p>
              </div>
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
                <p className="text-sm text-gray-500">Elegiveis para Sorteio</p>
                <p className="text-2xl font-bold text-indigo-600">{eligibleNumbers}</p>
              </div>
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
                <p className="text-sm text-gray-500">Ganhadores Ate Agora</p>
                <p className="text-2xl font-bold text-green-600">{winners.length}</p>
              </div>
            </div>

            {/* Draw Controls */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold mb-4">Realizar Sorteio</h3>
              <div className="flex items-end gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ganhadores a sortear</label>
                  <input
                    type="number"
                    min={1}
                    max={eligibleNumbers || 1}
                    value={drawCount}
                    onChange={(e) => setDrawCount(parseInt(e.target.value) || 1)}
                    className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                  />
                </div>
                <button
                  onClick={executeDraw}
                  disabled={drawing || eligibleNumbers === 0}
                  className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg font-medium transition"
                >
                  {drawing ? 'Sorteando...' : 'Realizar Sorteio'}
                </button>
              </div>

              {/* Last Draw Results */}
              {lastWinners.length > 0 && (
                <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <p className="font-semibold text-green-800 mb-2">Ganhadores sorteados:</p>
                  <div className="flex flex-wrap gap-2">
                    {lastWinners.map((w) => (
                      <span key={w.number} className="bg-green-200 text-green-900 px-3 py-1 rounded-full text-sm font-bold">
                        #{w.number}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* All Numbers */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold mb-4">Todos os Numeros da Sorte</h3>
              {luckyNumbers.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Nenhum numero da sorte gerado para esta campanha.</p>
              ) : (
                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2">
                  {luckyNumbers.map((n) => (
                    <div
                      key={n.id}
                      className={`p-2 rounded-lg text-center text-sm font-bold border-2 ${
                        n.is_winner
                          ? 'bg-green-100 border-green-400 text-green-800'
                          : 'bg-gray-50 border-gray-200 text-gray-700'
                      }`}
                      title={n.full_name || n.user_id}
                    >
                      #{n.number}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Winners History */}
            {winners.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold mb-4">Ganhadores</h3>
                <div className="space-y-2">
                  {winners.map((w) => (
                    <div key={w.id} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <span className="bg-green-200 text-green-900 px-3 py-1 rounded-full text-sm font-bold">
                          #{w.number}
                        </span>
                        <span className="text-sm font-medium text-gray-900">{w.full_name || 'Desconhecido'}</span>
                      </div>
                      {w.drawn_at && (
                        <span className="text-xs text-gray-500">
                          {new Date(w.drawn_at).toLocaleDateString('pt-BR')}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </>
  )
}

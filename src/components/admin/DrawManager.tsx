'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import AdminHeader from './AdminHeader'
import LoadingSpinner from '@/components/shared/LoadingSpinner'
import type { Campaign } from '@/types/campaign'
import type { LuckyNumber } from '@/types/goal'

type LuckyNumberWithProfile = LuckyNumber & {
  full_name?: string
  store_name?: string
}

type DrawAction = 'publish_winners' | 'notify_winners' | 'notify_base'

export default function DrawManager() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [selectedCampaign, setSelectedCampaign] = useState<string>('')
  const [luckyNumbers, setLuckyNumbers] = useState<LuckyNumberWithProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [drawing, setDrawing] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [notifyingWinners, setNotifyingWinners] = useState(false)
  const [notifyingBase, setNotifyingBase] = useState(false)
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
    if (!selectedCampaign) return

    try {
      const { data } = await supabase
        .from('lucky_numbers')
        .select('*, profiles(full_name, stores(name))')
        .eq('campaign_id', selectedCampaign)
        .order('number')

      if (data) {
        setLuckyNumbers(data.map((n: LuckyNumber & { profiles?: { full_name: string; stores?: { name: string } | null } | null }) => ({
          ...n,
          full_name: n.profiles?.full_name,
          store_name: n.profiles?.stores?.name,
        })))
      }
    } catch (err) {
      console.error(err)
    }
  }, [selectedCampaign, supabase])

  useEffect(() => {
    void fetchCampaigns()
  }, [fetchCampaigns])

  useEffect(() => {
    void fetchLuckyNumbers()
  }, [fetchLuckyNumbers])

  const syncLuckyNumbers = async () => {
    if (!selectedCampaign) return
    setSyncing(true)
    try {
      const res = await fetch('/api/lucky-numbers/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaign_id: selectedCampaign }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      alert(data.message)
      await fetchLuckyNumbers()
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Falha ao sincronizar')
    } finally {
      setSyncing(false)
    }
  }

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

  const runDrawAction = async (action: DrawAction, setBusy: (value: boolean) => void) => {
    if (!selectedCampaign) return
    setBusy(true)
    try {
      const res = await fetch('/api/draws', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaign_id: selectedCampaign, action }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      alert(data.message)
      await fetchLuckyNumbers()
      await fetchCampaigns()
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Falha ao executar ação')
    } finally {
      setBusy(false)
    }
  }

  const totalNumbers = luckyNumbers.length
  const eligibleNumbers = luckyNumbers.filter((n) => !n.is_winner).length
  const winners = luckyNumbers.filter((n) => n.is_winner)
  const privateWinners = winners.filter((n) => !n.is_public)
  const publicWinners = winners.filter((n) => n.is_public)
  const pendingWinnerNotifications = winners.filter((n) => !n.winner_notified_at)
  const currentCampaign = campaigns.find((campaign) => campaign.id === selectedCampaign)

  if (loading) return <LoadingSpinner />

  return (
    <>
      <AdminHeader title="Gerenciador de Sorteios" subtitle="Realize, publique e notifique ganhadores manualmente" />

      <div className="p-6 space-y-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Selecionar Campanha</label>
          <select
            value={selectedCampaign}
            onChange={(e) => setSelectedCampaign(e.target.value)}
            className="w-full max-w-md px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-white"
          >
            <option value="">Escolha uma campanha...</option>
            {campaigns.map((campaign) => (
              <option key={campaign.id} value={campaign.id}>{campaign.title}</option>
            ))}
          </select>
        </div>

        {selectedCampaign && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
                <p className="text-sm text-gray-500">Total de números</p>
                <p className="text-2xl font-bold text-gray-900">{totalNumbers}</p>
              </div>
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
                <p className="text-sm text-gray-500">Elegíveis para sorteio</p>
                <p className="text-2xl font-bold text-indigo-600">{eligibleNumbers}</p>
              </div>
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
                <p className="text-sm text-gray-500">Ganhadores</p>
                <p className="text-2xl font-bold text-green-600">{winners.length}</p>
                <p className="text-xs text-gray-400 mt-1">{publicWinners.length} público(s), {privateWinners.length} aguardando publicação</p>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold mb-4">Realizar Sorteio</h3>
              <div className="flex flex-col md:flex-row md:items-end gap-4">
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
                  onClick={syncLuckyNumbers}
                  disabled={syncing}
                  title="Gera números para cupons aprovados que ainda não têm número da sorte"
                  className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg font-medium transition text-sm"
                >
                  {syncing ? 'Sincronizando...' : 'Sincronizar Números'}
                </button>
                <button
                  onClick={executeDraw}
                  disabled={drawing || eligibleNumbers === 0}
                  className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg font-medium transition"
                >
                  {drawing ? 'Sorteando...' : 'Realizar Sorteio'}
                </button>
              </div>

              {lastWinners.length > 0 && (
                <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="font-semibold text-amber-900 mb-2">Ganhadores sorteados em validação:</p>
                  <div className="flex flex-wrap gap-2">
                    {lastWinners.map((winner) => (
                      <span key={winner.number} className="bg-amber-200 text-amber-900 px-3 py-1 rounded-full text-sm font-bold">
                        #{winner.number}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold mb-2">Validação e Publicação</h3>
              <p className="text-sm text-gray-500 mb-5">
                O sorteio salva os ganhadores em modo privado. Publique quando o resultado estiver validado.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <button
                  onClick={() => runDrawAction('publish_winners', setPublishing)}
                  disabled={publishing || privateWinners.length === 0}
                  className="bg-amber-500 hover:bg-amber-600 disabled:bg-gray-300 text-white px-4 py-3 rounded-lg font-semibold transition text-sm"
                >
                  {publishing ? 'Publicando...' : `Publicar Ganhadores (${privateWinners.length})`}
                </button>
                <button
                  onClick={() => runDrawAction('notify_winners', setNotifyingWinners)}
                  disabled={notifyingWinners || pendingWinnerNotifications.length === 0}
                  className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 text-white px-4 py-3 rounded-lg font-semibold transition text-sm"
                >
                  {notifyingWinners ? 'Notificando...' : `Notificar Ganhadores (${pendingWinnerNotifications.length})`}
                </button>
                <button
                  onClick={() => runDrawAction('notify_base', setNotifyingBase)}
                  disabled={notifyingBase || winners.length === 0}
                  className="bg-slate-800 hover:bg-slate-900 disabled:bg-gray-300 text-white px-4 py-3 rounded-lg font-semibold transition text-sm"
                >
                  {notifyingBase ? 'Notificando base...' : 'Notificar Base'}
                </button>
              </div>
              {currentCampaign?.draw_base_notified_at && (
                <p className="text-xs text-gray-500 mt-3">
                  Base notificada em {new Date(currentCampaign.draw_base_notified_at).toLocaleString('pt-BR')}.
                </p>
              )}
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold mb-4">Todos os Números da Sorte</h3>
              {luckyNumbers.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Nenhum número da sorte gerado para esta campanha.</p>
              ) : (
                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2">
                  {luckyNumbers.map((number) => (
                    <div
                      key={number.id}
                      className={`p-2 rounded-lg text-center text-sm font-bold border-2 ${
                        number.is_winner
                          ? number.is_public
                            ? 'bg-green-100 border-green-400 text-green-800'
                            : 'bg-amber-100 border-amber-400 text-amber-800'
                          : 'bg-gray-50 border-gray-200 text-gray-700'
                      }`}
                      title={number.full_name || number.user_id}
                    >
                      #{number.number}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {winners.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold mb-4">Ganhadores</h3>
                <div className="space-y-2">
                  {winners.map((winner) => (
                    <div key={winner.id} className={`flex items-center justify-between p-3 rounded-lg ${winner.is_public ? 'bg-green-50' : 'bg-amber-50'}`}>
                      <div className="flex items-center gap-3">
                        <span className={`${winner.is_public ? 'bg-green-200 text-green-900' : 'bg-amber-200 text-amber-900'} px-3 py-1 rounded-full text-sm font-bold`}>
                          #{winner.number}
                        </span>
                        <div>
                          <span className="text-sm font-medium text-gray-900">{winner.full_name || 'Desconhecido'}</span>
                          <p className="text-xs text-gray-500">{winner.store_name || 'Loja não informada'}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-semibold text-gray-600">{winner.is_public ? 'Público' : 'Aguardando publicação'}</p>
                        {winner.drawn_at && (
                          <span className="text-xs text-gray-500">
                            {new Date(winner.drawn_at).toLocaleDateString('pt-BR')}
                          </span>
                        )}
                      </div>
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

'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
interface Prize {
  id: string
  title: string
  points_cost: number | null
  image_url: string | null
  image_horizontal: string | null
  description: string | null
  campaign_id: string | null
  campaign_type?: string | null
}

interface PendingSelection {
  id: string
  prize_id: string
  status: string
  created_at: string
  prizes_catalog: { title: string; points_cost: number }
}

interface StoreData {
  prizes: Prize[]
  pendingSelections: PendingSelection[]
  totalPoints: number
  allocatedPoints: number
  spendablePoints: number
}

// ─────────────────────────────────────────────────────────────────────────────
// Countdown to campaign end date
// ─────────────────────────────────────────────────────────────────────────────
function CampaignCountdown({ endDate }: { endDate: string }) {
  const days = useMemo(() => {
    const end = new Date(endDate + 'T23:59:59')
    // eslint-disable-next-line react-hooks/purity
    const diff = Math.ceil((end.getTime() - Date.now()) / 86_400_000)
    return diff > 0 ? diff : 0
  }, [endDate])

  return (
    <div className="mx-4 mt-4 rounded-2xl p-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-center">
      <p className="text-xs font-bold uppercase tracking-widest opacity-70 mb-0.5">Fechamento da Campanha</p>
      {days === 0 ? (
        <p className="text-lg font-black">Campanha encerrada!</p>
      ) : (
        <p className="text-2xl font-black">
          Faltam <span className="text-yellow-300">{days}</span> dias para o fechamento!
        </p>
      )}
      <p className="text-xs opacity-60 mt-0.5">{new Date(endDate + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────
export default function LojaPremios() {
  const [data, setData] = useState<StoreData | null>(null)
  const [loading, setLoading] = useState(true)
  const [selecting, setSelecting] = useState<Record<string, boolean>>({})
  const [cancelling, setCancelling] = useState<Record<string, boolean>>({})
  const [campaignEndDate, setCampaignEndDate] = useState('')

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [prizeRes, settingsRes] = await Promise.all([
        fetch('/api/user/prizes'),
        fetch('/api/landing/settings'),
      ])
      const [prizeData, settingsData] = await Promise.all([prizeRes.json(), settingsRes.json()])
      setData(prizeData)
      setCampaignEndDate(settingsData.settings?.campaign_end_date ?? '')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const handleSelect = async (prize: Prize) => {
    setSelecting((p) => ({ ...p, [prize.id]: true }))
    try {
      const res = await fetch('/api/user/prizes/select', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prize_id: prize.id, campaign_id: prize.campaign_id }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error ?? 'Erro')
      await fetchData()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Erro ao selecionar prêmio')
    } finally {
      setSelecting((p) => ({ ...p, [prize.id]: false }))
    }
  }

  const handleCancel = async (selectionId: string) => {
    if (!confirm('Cancelar seleção? Seus pontos serão liberados.')) return
    setCancelling((p) => ({ ...p, [selectionId]: true }))
    try {
      const res = await fetch('/api/user/prizes/select', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selection_id: selectionId }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error ?? 'Erro')
      await fetchData()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Erro ao cancelar')
    } finally {
      setCancelling((p) => ({ ...p, [selectionId]: false }))
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!data) return null

  const { prizes, pendingSelections, spendablePoints, totalPoints, allocatedPoints } = data
  const selectedPrizeIds = new Set(pendingSelections.map((s) => s.prize_id))

  const closingMessage = campaignEndDate
    ? `A entrega será realizada ao final da campanha em ${new Date(campaignEndDate + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}.`
    : 'A entrega será realizada ao final da campanha.'

  return (
    <div className="px-4 py-4 pb-24 md:pb-8">
      <h1 className="text-xl font-bold text-gray-900 mb-0.5">Loja de Prêmios</h1>
      <p className="text-sm text-gray-500 mb-4">Selecione seu prêmio com os pontos acumulados</p>

      {/* Countdown */}
      {campaignEndDate && <CampaignCountdown endDate={campaignEndDate} />}

      {/* Points balance card */}
      <div className="mt-4 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl border border-indigo-100 p-4">
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <p className="text-2xl font-black text-indigo-700">{totalPoints}</p>
            <p className="text-xs text-gray-500 font-medium">Total</p>
          </div>
          <div>
            <p className="text-2xl font-black text-amber-600">{allocatedPoints}</p>
            <p className="text-xs text-gray-500 font-medium">Reservados</p>
          </div>
          <div>
            <p className="text-2xl font-black text-green-600">{spendablePoints}</p>
            <p className="text-xs text-gray-500 font-medium">Disponíveis</p>
          </div>
        </div>
      </div>

      {/* Pending selections */}
      {pendingSelections.length > 0 && (
        <div className="mt-4 space-y-2">
          <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Minha Seleção</p>
          {pendingSelections.map((sel) => (
            <div key={sel.id} className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-green-800">🎁 {sel.prizes_catalog.title}</p>
                <p className="text-xs text-green-600 mt-0.5">{closingMessage}</p>
              </div>
              <button
                onClick={() => handleCancel(sel.id)}
                disabled={!!cancelling[sel.id]}
                className="flex-shrink-0 text-xs text-red-500 border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-50 transition disabled:opacity-50"
              >
                {cancelling[sel.id] ? '...' : 'Cancelar'}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Prize grid */}
      <div className="mt-5">
        <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">
          {prizes.length > 0 ? `${prizes.length} prêmio${prizes.length !== 1 ? 's' : ''} disponível${prizes.length !== 1 ? 'is' : ''}` : 'Catálogo'}
        </p>

        {prizes.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <div className="text-5xl mb-3">🎁</div>
            <p className="font-semibold">Nenhum prêmio disponível</p>
            <p className="text-sm mt-1">Acumule pontos participando das campanhas!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {prizes.map((prize) => {
              const isRafflePrize = prize.points_cost == null
              const isSelected = selectedPrizeIds.has(prize.id)
              const canAfford = isRafflePrize || spendablePoints >= (prize.points_cost ?? 0)
              const isSelecting = !!selecting[prize.id]
              const displayImage = prize.image_horizontal ?? prize.image_url

              return (
                <div
                  key={prize.id}
                  className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition ${
                    isSelected ? 'border-green-400 ring-2 ring-green-300' : 'border-gray-200'
                  }`}
                >
                  {displayImage ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={displayImage} alt={prize.title} loading="lazy" className="w-full h-40 object-cover" />
                  ) : (
                    <div className="w-full h-40 bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center">
                      <span className="text-5xl">🎁</span>
                    </div>
                  )}

                  <div className="p-4">
                    <h3 className="font-bold text-gray-900 text-sm leading-tight">{prize.title}</h3>
                    {prize.description && (
                      <p className="text-xs text-gray-500 mt-1 line-clamp-2">{prize.description}</p>
                    )}

                    <div className="flex items-center justify-between mt-3 gap-2">
                      {isRafflePrize ? (
                        <span className="text-sm font-black text-amber-600">🎲 Sorteio</span>
                      ) : (
                        <span className={`text-sm font-black ${canAfford || isSelected ? 'text-indigo-700' : 'text-gray-400'}`}>
                          {prize.points_cost} pts
                        </span>
                      )}

                      {isRafflePrize ? (
                        <span className="text-xs text-gray-500 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl">
                          Disponível por sorteio
                        </span>
                      ) : isSelected ? (
                        <span className="flex items-center gap-1.5 text-xs font-bold text-green-700 bg-green-50 border border-green-200 px-3 py-1.5 rounded-xl">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                          </svg>
                          Selecionado
                        </span>
                      ) : (
                        <button
                          onClick={() => handleSelect(prize)}
                          disabled={!canAfford || isSelecting || pendingSelections.length > 0}
                          className="text-xs font-bold px-4 py-2 rounded-xl transition disabled:opacity-40 disabled:cursor-not-allowed bg-indigo-600 hover:bg-indigo-700 text-white disabled:bg-gray-200 disabled:text-gray-400"
                          title={
                            !canAfford
                              ? `Você precisa de ${(prize.points_cost ?? 0) - spendablePoints} pts a mais`
                              : pendingSelections.length > 0 && !isSelected
                              ? 'Cancele sua seleção atual antes de escolher outro prêmio'
                              : ''
                          }
                        >
                          {isSelecting ? 'Selecionando...' : !canAfford ? `Faltam ${(prize.points_cost ?? 0) - spendablePoints} pts` : 'Selecionar'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

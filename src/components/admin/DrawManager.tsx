'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import AdminHeader from './AdminHeader'
import LoadingSpinner from '@/components/shared/LoadingSpinner'
import type { Campaign } from '@/types/campaign'
import type { Draw } from '@/types/draw'
import type { LuckyNumber } from '@/types/goal'

// ── Operator Manual ────────────────────────────────────────────────────────────

const HELP_STEPS = [
  {
    icon: '🔄', title: 'Sincronizar Números', color: 'bg-indigo-50 border-indigo-200', titleColor: 'text-indigo-800',
    body: 'Gera números da sorte para participantes elegíveis que ainda não os possuem. Execute antes de qualquer sorteio para campanhas de pontos.',
  },
  {
    icon: '🎲', title: 'Realizar Sorteio', color: 'bg-green-50 border-green-200', titleColor: 'text-green-800',
    body: 'Sorteia os ganhadores de forma aleatória e os salva em modo RASCUNHO — invisível para os participantes. Você pode revisar antes de publicar.',
  },
  {
    icon: '📢', title: 'Publicar Ganhadores', color: 'bg-amber-50 border-amber-200', titleColor: 'text-amber-800',
    body: 'Torna os resultados visíveis na página pública /sorteios. Em campanhas multi-rodada, o próximo sorteio fica disponível após publicação.',
  },
  {
    icon: '🏆', title: 'Notificar Ganhadores', color: 'bg-purple-50 border-purple-200', titleColor: 'text-purple-800',
    body: 'Envia e-mail personalizado de "Você ganhou!" para cada ganhador não notificado. Execute após publicar.',
  },
  {
    icon: '📣', title: 'Notificar Base', color: 'bg-slate-50 border-slate-200', titleColor: 'text-slate-800',
    body: 'Envia notificação geral para TODOS os participantes informando que os resultados foram divulgados.',
  },
  {
    icon: '🔒', title: 'Encerrar Campanha', color: 'bg-red-50 border-red-200', titleColor: 'text-red-800',
    body: 'Encerra a campanha manualmente, impedindo novas participações. Use quando todos os sorteios foram concluídos ou para fechar antecipadamente.',
  },
]

function HelpModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }} onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Manual do Operador</h2>
            <p className="text-xs text-gray-500 mt-0.5">Ordem recomendada de execução</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="p-6 space-y-3">
          {HELP_STEPS.map((step, i) => (
            <div key={step.title} className={`rounded-xl border p-4 ${step.color}`}>
              <div className="flex items-start gap-3">
                <span className="text-2xl flex-shrink-0 mt-0.5">{step.icon}</span>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Passo {i + 1}</span>
                  </div>
                  <p className={`text-sm font-bold mb-1 ${step.titleColor}`}>{step.title}</p>
                  <p className="text-xs text-gray-600 leading-relaxed">{step.body}</p>
                </div>
              </div>
            </div>
          ))}
          <div className="mt-4 rounded-xl bg-gray-50 border border-gray-200 p-4">
            <p className="text-xs font-semibold text-gray-700 mb-1">Dica de segurança</p>
            <p className="text-xs text-gray-500 leading-relaxed">
              O sorteio é irreversível após a publicação. Valide os números internamente antes de executar &ldquo;Publicar Ganhadores&rdquo;.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

type LuckyNumberWithProfile = LuckyNumber & {
  full_name?: string
  whatsapp?: string
  cpf?: string | null
  store_name?: string
}

function exportLuckyNumbersCsv(numbers: LuckyNumberWithProfile[], campaignTitle: string) {
  const header = 'Número,Nome,WhatsApp,CPF,Loja,Ganhador,Rodada'
  const rows = numbers.map((n) =>
    [n.number, n.full_name ?? '', n.whatsapp ?? '', n.cpf ?? '', n.store_name ?? '', n.is_winner ? 'Sim' : 'Não', '']
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(',')
  )
  const csv = [header, ...rows].join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `sorteio-${campaignTitle.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

type DrawAction = 'publish_winners' | 'notify_winners' | 'notify_base' | 'close_campaign'

export default function DrawManager() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [selectedCampaign, setSelectedCampaign] = useState<string>('')
  const [luckyNumbers, setLuckyNumbers] = useState<LuckyNumberWithProfile[]>([])
  const [draws, setDraws] = useState<Draw[]>([])
  const [loading, setLoading] = useState(true)
  const [drawing, setDrawing] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [notifyingWinners, setNotifyingWinners] = useState(false)
  const [notifyingBase, setNotifyingBase] = useState(false)
  const [closing, setClosing] = useState(false)
  const [drawCount, setDrawCount] = useState(1)
  const [lastWinners, setLastWinners] = useState<{ number: number; user_id: string }[]>([])
  const [showHelp, setShowHelp] = useState(false)
  const supabase = useMemo(() => createClient(), [])

  const fetchCampaigns = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('campaigns')
        .select('*')
        .order('created_at', { ascending: false })
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
      const { data, error } = await supabase
        .from('lucky_numbers')
        .select('*, profiles(full_name, whatsapp, cpf, stores(name))')
        .eq('campaign_id', selectedCampaign)
        .order('number')
      if (error) { console.error('[DrawManager] fetchLuckyNumbers error:', error); return }
      if (data) {
        setLuckyNumbers(data.map((n: LuckyNumber & { profiles?: { full_name: string; whatsapp?: string; cpf?: string | null; stores?: { name: string } | null } | null }) => ({
          ...n,
          full_name: n.profiles?.full_name,
          whatsapp: n.profiles?.whatsapp,
          cpf: n.profiles?.cpf,
          store_name: n.profiles?.stores?.name,
        })))
      }
    } catch (err) {
      console.error(err)
    }
  }, [selectedCampaign, supabase])

  const fetchDraws = useCallback(async () => {
    if (!selectedCampaign) return
    try {
      const { data, error } = await supabase
        .from('draws')
        .select('*')
        .eq('campaign_id', selectedCampaign)
        .order('round_number')
      if (error) { console.error('[DrawManager] fetchDraws error:', error); return }
      if (data) setDraws(data as Draw[])
    } catch (err) {
      console.error(err)
    }
  }, [selectedCampaign, supabase])

  useEffect(() => { void fetchCampaigns() }, [fetchCampaigns])

  useEffect(() => {
    setDraws([])
    setLuckyNumbers([])
    setLastWinners([])
    void fetchLuckyNumbers()
    void fetchDraws()
  }, [fetchLuckyNumbers, fetchDraws])

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
    } catch (err) {
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
      await Promise.all([fetchLuckyNumbers(), fetchDraws()])
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Falha ao executar sorteio')
    } finally {
      setDrawing(false)
    }
  }

  const runDrawAction = async (action: DrawAction, setBusy: (v: boolean) => void, drawId?: string) => {
    if (!selectedCampaign) return
    setBusy(true)
    try {
      const res = await fetch('/api/draws', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaign_id: selectedCampaign, action, draw_id: drawId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      alert(data.message)
      await Promise.all([fetchLuckyNumbers(), fetchDraws(), fetchCampaigns()])
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Falha ao executar ação')
    } finally {
      setBusy(false)
    }
  }

  // ── Derived state ──────────────────────────────────────────────────────────
  const totalNumbers = luckyNumbers.length
  const eligibleNumbers = luckyNumbers.filter((n) => !n.is_winner).length
  const winners = luckyNumbers.filter((n) => n.is_winner)
  const privateWinners = winners.filter((n) => !n.is_public)
  const publicWinners = winners.filter((n) => n.is_public)
  const pendingWinnerNotifications = winners.filter((n) => !n.winner_notified_at)
  const currentCampaign = campaigns.find((c) => c.id === selectedCampaign)
  const isRaffle = currentCampaign?.type === 'raffle_only'
  const isClosed = currentCampaign?.status === 'closed'
  const maxRounds = currentCampaign?.max_draw_rounds ?? 1
  const draftDraw = draws.find((d) => d.status === 'draft')
  const publishedDraws = draws.filter((d) => d.status === 'published')
  const nextRound = draws.length + 1
  const allRoundsComplete = publishedDraws.length >= maxRounds

  if (loading) return <LoadingSpinner />

  return (
    <>
      {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}

      <AdminHeader title="Gerenciador de Sorteios" subtitle="Realize, publique e notifique ganhadores manualmente">
        <button
          onClick={() => setShowHelp(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-600 hover:text-gray-900 hover:border-gray-300 transition shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Ajuda
        </button>
      </AdminHeader>

      <div className="p-6 space-y-6">

        {/* ── Campaign Selector ──────────────────────────────────────────── */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Selecionar Campanha</label>
          <div className="flex items-center gap-3 flex-wrap">
            <select
              value={selectedCampaign}
              onChange={(e) => setSelectedCampaign(e.target.value)}
              className="w-full max-w-md px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-white"
            >
              <option value="">Escolha uma campanha...</option>
              {campaigns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}{c.type === 'raffle_only' ? ' 🎲' : ' ⭐'}{c.status === 'closed' ? ' [Encerrada]' : ''}
                </option>
              ))}
            </select>
            {selectedCampaign && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-xs font-semibold px-3 py-1 rounded-full ${isRaffle ? 'bg-purple-100 text-purple-700' : 'bg-indigo-100 text-indigo-700'}`}>
                  {isRaffle ? '🎲 Sorteio Puro' : '⭐ Campanha de Pontos'}
                </span>
                {isClosed && <span className="text-xs font-semibold px-3 py-1 rounded-full bg-gray-200 text-gray-600">🔒 Encerrada</span>}
                <span className="text-xs font-semibold px-3 py-1 rounded-full bg-blue-100 text-blue-700">
                  {publishedDraws.length}/{maxRounds} rodada{maxRounds !== 1 ? 's' : ''}
                </span>
              </div>
            )}
          </div>
          {isRaffle && !isClosed && (
            <p className="text-xs text-purple-600 mt-2">
              Os números da sorte são gerados automaticamente quando participantes clicam em &ldquo;Participar&rdquo;. Nenhuma sincronização manual é necessária.
            </p>
          )}
        </div>

        {selectedCampaign && (
          <>
            {/* ── Stats ─────────────────────────────────────────────────── */}
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
                <p className="text-xs text-gray-400 mt-1">{publicWinners.length} público(s), {privateWinners.length} rascunho</p>
              </div>
            </div>

            {/* ── Draw Rounds History ────────────────────────────────────── */}
            {draws.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold mb-4">Histórico de Rodadas</h3>
                <div className="space-y-2">
                  {draws.map((draw) => (
                    <div
                      key={draw.id}
                      className={`flex items-center justify-between p-3 rounded-lg border ${
                        draw.status === 'draft' ? 'bg-amber-50 border-amber-200' : 'bg-green-50 border-green-200'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className={`text-sm font-bold px-2.5 py-1 rounded-full ${
                          draw.status === 'draft' ? 'bg-amber-200 text-amber-900' : 'bg-green-200 text-green-900'
                        }`}>
                          Rodada {draw.round_number}
                        </span>
                        <span className={`text-xs font-medium ${draw.status === 'draft' ? 'text-amber-700' : 'text-green-700'}`}>
                          {draw.status === 'draft' ? 'Rascunho — aguardando publicação' : `Publicada em ${new Date(draw.published_at!).toLocaleDateString('pt-BR')}`}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-gray-500">{draw.winner_count} ganhador(es)</span>
                        {draw.status === 'published' && draw.base_notified_at && (
                          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">Base notificada</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Draw Action ────────────────────────────────────────────── */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              {!draftDraw ? (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">
                      {allRoundsComplete || isClosed
                        ? 'Sorteio Concluído'
                        : `Realizar Sorteio — Rodada ${nextRound} de ${maxRounds}`}
                    </h3>
                    {maxRounds > 1 && !isClosed && !allRoundsComplete && (
                      <span className="text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                        {maxRounds - publishedDraws.length} rodada(s) restante(s)
                      </span>
                    )}
                  </div>
                  {allRoundsComplete || isClosed ? (
                    <p className="text-sm text-gray-500">
                      {isClosed ? 'Esta campanha está encerrada.' : 'Todas as rodadas planejadas já foram realizadas.'}
                    </p>
                  ) : (
                    <div className="flex flex-col md:flex-row md:items-end gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Ganhadores a sortear</label>
                        <input
                          type="number" min={1} max={eligibleNumbers || 1}
                          value={drawCount}
                          onChange={(e) => setDrawCount(parseInt(e.target.value) || 1)}
                          className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                        />
                      </div>
                      {!isRaffle && (
                        <button
                          onClick={syncLuckyNumbers} disabled={syncing}
                          className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg font-medium transition text-sm"
                        >
                          {syncing ? 'Sincronizando...' : 'Sincronizar Números'}
                        </button>
                      )}
                      <button
                        onClick={executeDraw}
                        disabled={drawing || eligibleNumbers === 0}
                        className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg font-medium transition"
                      >
                        {drawing ? 'Sorteando...' : 'Realizar Sorteio'}
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <h3 className="text-lg font-semibold mb-2">
                    Rodada {draftDraw.round_number} — Ganhadores em Validação
                  </h3>
                  <p className="text-sm text-gray-500 mb-4">
                    Os ganhadores foram sorteados e estão em modo privado. Valide e publique quando estiver pronto.
                  </p>
                  {lastWinners.length > 0 && (
                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                      <p className="font-semibold text-amber-900 mb-2 text-sm">Ganhadores desta rodada:</p>
                      <div className="flex flex-wrap gap-2">
                        {lastWinners.map((w) => (
                          <span key={w.number} className="bg-amber-200 text-amber-900 px-3 py-1 rounded-full text-sm font-bold">
                            #{w.number}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* ── Publish / Notify ──────────────────────────────────────── */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold mb-2">Validação e Publicação</h3>
              <p className="text-sm text-gray-500 mb-5">
                {draftDraw
                  ? `Rodada ${draftDraw.round_number} em rascunho — publique para tornar os resultados visíveis.`
                  : 'O sorteio salva os ganhadores em modo privado. Publique quando o resultado estiver validado.'}
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <button
                  onClick={() => runDrawAction('publish_winners', setPublishing, draftDraw?.id)}
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
                  onClick={() => runDrawAction('notify_base', setNotifyingBase, draftDraw?.id ?? publishedDraws[publishedDraws.length - 1]?.id)}
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

            {/* ── Close Campaign ────────────────────────────────────────── */}
            {!isClosed && (
              <div className="bg-white rounded-lg shadow-sm border border-red-100 p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-base font-semibold text-gray-900 mb-1">Encerrar Campanha</h3>
                    <p className="text-sm text-gray-500">
                      Encerra a campanha imediatamente, impedindo novas participações. Use quando todos os sorteios foram concluídos ou para fechar antecipadamente.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      if (!confirm(`Encerrar "${currentCampaign?.title}"? Esta ação impedirá novas participações.`)) return
                      void runDrawAction('close_campaign', setClosing)
                    }}
                    disabled={closing}
                    className="flex-shrink-0 bg-red-600 hover:bg-red-700 disabled:bg-gray-300 text-white px-4 py-2 rounded-lg font-semibold transition text-sm whitespace-nowrap"
                  >
                    {closing ? 'Encerrando...' : '🔒 Encerrar Campanha'}
                  </button>
                </div>
              </div>
            )}

            {/* ── All Lucky Numbers grid ────────────────────────────────── */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Todos os Números da Sorte</h3>
                {luckyNumbers.length > 0 && (
                  <button
                    onClick={() => exportLuckyNumbersCsv(luckyNumbers, currentCampaign?.title ?? 'sorteio')}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold rounded-lg transition"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                    </svg>
                    Exportar CSV
                  </button>
                )}
              </div>
              {luckyNumbers.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  {isRaffle
                    ? 'Nenhum participante inscrito ainda. Os números da sorte são criados automaticamente quando os usuários clicam em "Participar".'
                    : 'Nenhum número da sorte gerado. Use "Sincronizar Números" para gerar a partir dos cupons aprovados.'}
                </p>
              ) : (
                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2">
                  {luckyNumbers.map((n) => (
                    <div
                      key={n.id}
                      className={`p-2 rounded-lg text-center text-sm font-bold border-2 ${
                        n.is_winner
                          ? n.is_public ? 'bg-green-100 border-green-400 text-green-800' : 'bg-amber-100 border-amber-400 text-amber-800'
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

            {/* ── Winners list ──────────────────────────────────────────── */}
            {winners.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold mb-4">Ganhadores</h3>
                <div className="space-y-2">
                  {winners.map((w) => (
                    <div key={w.id} className={`flex items-center justify-between p-3 rounded-lg ${w.is_public ? 'bg-green-50' : 'bg-amber-50'}`}>
                      <div className="flex items-center gap-3">
                        <span className={`${w.is_public ? 'bg-green-200 text-green-900' : 'bg-amber-200 text-amber-900'} px-3 py-1 rounded-full text-sm font-bold`}>
                          #{w.number}
                        </span>
                        <div>
                          <span className="text-sm font-medium text-gray-900">{w.full_name || 'Desconhecido'}</span>
                          <p className="text-xs text-gray-500">{w.store_name || 'Loja não informada'}</p>
                          {w.cpf && <p className="text-xs text-gray-400 font-mono">CPF: {w.cpf}</p>}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-semibold text-gray-600">{w.is_public ? 'Público' : 'Rascunho'}</p>
                        {w.drawn_at && (
                          <span className="text-xs text-gray-500">
                            {new Date(w.drawn_at).toLocaleDateString('pt-BR')}
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

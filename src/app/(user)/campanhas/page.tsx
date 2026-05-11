'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useAuth } from '@/lib/hooks/useAuth'
import { createClient } from '@/lib/supabase/client'
import CabecalhoUsuario from '@/components/user/CabecalhoUsuario'
import BarraNavegacao from '@/components/user/BarraNavegacao'
import LoadingSpinner from '@/components/shared/LoadingSpinner'
import type { Campaign } from '@/types/campaign'

export default function CampanhasPage() {
  const { user, loading: authLoading } = useAuth()
  const supabase = useMemo(() => createClient(), [])

  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [joinedIds, setJoinedIds] = useState<Set<string>>(new Set())
  const [luckyNumbersByCampaign, setLuckyNumbersByCampaign] = useState<Record<string, number>>({})
  const [latestWinnerByCampaign, setLatestWinnerByCampaign] = useState<Record<string, string>>({})
  const [publishedRoundsByCampaign, setPublishedRoundsByCampaign] = useState<Record<string, number>>({})
  const [joining, setJoining] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    let active = true

    const fetchData = async () => {
      const [campaignsRes, participantsRes, luckyNumbersRes] = await Promise.all([
        supabase
          .from('campaigns')
          .select('*')
          .eq('is_active', true)
          .gte('end_date', new Date().toISOString())
          .order('created_at', { ascending: false }),
        supabase.from('campaign_participants').select('campaign_id').eq('user_id', user.id),
        supabase.from('lucky_numbers').select('campaign_id, number').eq('user_id', user.id),
      ])

      if (!active) return
      const fetchedCampaigns = (campaignsRes.data ?? []) as Campaign[]
      setCampaigns(fetchedCampaigns)

      if (participantsRes.data) {
        setJoinedIds(new Set(participantsRes.data.map((p: { campaign_id: string }) => p.campaign_id)))
      }
      if (luckyNumbersRes.data) {
        const map: Record<string, number> = {}
        for (const ln of luckyNumbersRes.data as { campaign_id: string; number: number }[]) {
          map[ln.campaign_id] = ln.number
        }
        setLuckyNumbersByCampaign(map)
      }

      // Fetch draw data for all campaigns in parallel
      if (fetchedCampaigns.length > 0) {
        const campaignIds = fetchedCampaigns.map((c) => c.id)
        const [drawsRes, winnersRes] = await Promise.all([
          supabase.from('draws').select('campaign_id, round_number').in('campaign_id', campaignIds).eq('status', 'published'),
          supabase.from('lucky_numbers')
            .select('campaign_id, number, published_at, profiles!lucky_numbers_user_id_fkey(full_name)')
            .in('campaign_id', campaignIds)
            .eq('is_winner', true)
            .eq('is_public', true)
            .order('published_at', { ascending: false }),
        ])
        if (!active) return

        if (drawsRes.data) {
          const rounds: Record<string, number> = {}
          for (const d of drawsRes.data as { campaign_id: string; round_number: number }[]) {
            rounds[d.campaign_id] = (rounds[d.campaign_id] ?? 0) + 1
          }
          setPublishedRoundsByCampaign(rounds)
        }

        if (winnersRes.data) {
          type WRow = { campaign_id: string; profiles: { full_name: string | null } | null }
          const latest: Record<string, string> = {}
          for (const w of (winnersRes.data as unknown as WRow[])) {
            if (!latest[w.campaign_id]) {
              latest[w.campaign_id] = w.profiles?.full_name ?? 'Ganhador'
            }
          }
          setLatestWinnerByCampaign(latest)
        }
      }

      setLoading(false)
    }

    void fetchData()
    return () => { active = false }
  }, [user, supabase])

  const handleJoinRaffle = async (e: React.MouseEvent, campaignId: string) => {
    e.preventDefault()
    e.stopPropagation()
    if (joining.has(campaignId)) return
    setJoining((prev) => new Set([...prev, campaignId]))
    try {
      const res = await fetch('/api/lucky-numbers/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaign_id: campaignId }),
      })
      const d = await res.json()
      if (res.ok && d.lucky_number) {
        setLuckyNumbersByCampaign((prev) => ({ ...prev, [campaignId]: d.lucky_number.number }))
        setJoinedIds((prev) => new Set([...prev, campaignId]))
      }
    } catch { /* silent */ } finally {
      setJoining((prev) => { const n = new Set(prev); n.delete(campaignId); return n })
    }
  }

  const handleJoinIncentive = async (e: React.MouseEvent, campaignId: string) => {
    e.preventDefault()
    e.stopPropagation()
    if (joining.has(campaignId)) return
    setJoining((prev) => new Set([...prev, campaignId]))
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/participate`, { method: 'POST' })
      if (res.ok) setJoinedIds((prev) => new Set([...prev, campaignId]))
    } catch { /* silent */ } finally {
      setJoining((prev) => { const n = new Set(prev); n.delete(campaignId); return n })
    }
  }

  if (authLoading || loading) return <LoadingSpinner />
  if (!user) return null

  return (
    <>
      <CabecalhoUsuario />
      <main className="max-w-lg md:max-w-3xl mx-auto px-4 md:px-8 py-4 pb-24 md:pb-8">
        <h1 className="text-xl font-bold text-gray-900 mb-1">Campanhas</h1>
        <p className="text-sm text-gray-500 mb-5">
          Participe das campanhas ativas e acumule pontos ou concorra a sorteios.
        </p>

        {campaigns.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
            <svg className="w-12 h-12 text-gray-200 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <p className="text-gray-500 text-sm">Nenhuma campanha ativa no momento.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {campaigns.map((campaign) => {
              const isRaffle = campaign.type === 'raffle_only'
              const isJoined = joinedIds.has(campaign.id)
              const isJoining = joining.has(campaign.id)
              const luckyNumber = luckyNumbersByCampaign[campaign.id]
              const isClosed = campaign.status === 'closed'
              const publishedRounds = publishedRoundsByCampaign[campaign.id] ?? 0
              const latestWinner = latestWinnerByCampaign[campaign.id]

              return (
                <Link
                  key={campaign.id}
                  href={`/campaigns/${campaign.id}`}
                  className={`rounded-xl border shadow-sm hover:shadow-md transition overflow-hidden flex flex-col ${isClosed ? 'bg-gray-50 border-gray-200' : 'bg-white border-gray-100'}`}
                >
                  {/* Banner */}
                  {(campaign.banner_url || campaign.banner_url_mobile) ? (
                    <div className="relative w-full aspect-video bg-gray-100">
                      {campaign.banner_url_mobile && (
                        <Image
                          src={campaign.banner_url_mobile}
                          alt={campaign.title}
                          fill
                          sizes="(max-width:768px) 100vw, 50vw"
                          loading="lazy"
                          className="object-contain md:hidden"
                        />
                      )}
                      {campaign.banner_url && (
                        <Image
                          src={campaign.banner_url}
                          alt={campaign.title}
                          fill
                          sizes="(max-width:768px) 100vw, 50vw"
                          loading="lazy"
                          className={`object-contain ${campaign.banner_url_mobile ? 'hidden md:block' : ''}`}
                        />
                      )}
                    </div>
                  ) : (
                    <div className={`w-full aspect-video flex items-center justify-center ${isRaffle ? 'bg-gradient-to-br from-amber-400 to-orange-500' : 'bg-gradient-to-br from-indigo-500 to-purple-600'}`}>
                      <svg className="w-10 h-10 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                          d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2" />
                      </svg>
                    </div>
                  )}

                  <div className="p-4 flex-1 flex flex-col">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h2 className="font-semibold text-gray-900 text-sm leading-snug">{campaign.title}</h2>
                      <div className="flex-shrink-0 flex items-center gap-1.5 flex-wrap justify-end">
                        {isClosed ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-200 text-gray-600">
                            🔒 Encerrada
                          </span>
                        ) : isRaffle ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                            🎲 Sorteio
                          </span>
                        ) : null}
                        {isJoined && !isRaffle && !isClosed && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                            Participando
                          </span>
                        )}
                      </div>
                    </div>

                    {campaign.description && (
                      <p className="text-xs text-gray-500 line-clamp-2 mb-3">{campaign.description}</p>
                    )}

                    <div className="mt-auto space-y-2">
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        {isRaffle ? (
                          <span className="bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                            Sorteio Direto
                          </span>
                        ) : (
                          <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full font-medium">
                            {campaign.settings?.points_per_coupon || 10} pts/cupom
                          </span>
                        )}
                        <span>
                          Até {new Date(campaign.end_date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                        </span>
                      </div>

                      {/* Last winner tag (active campaign with published draws) */}
                      {isRaffle && !isClosed && publishedRounds > 0 && latestWinner && (
                        <div className="flex items-center gap-1.5 bg-green-50 border border-green-200 rounded-lg px-2.5 py-1.5">
                          <span className="text-green-600 text-xs">🏆</span>
                          <span className="text-xs text-green-800 font-medium truncate">
                            Rodada {publishedRounds}: {latestWinner}
                          </span>
                        </div>
                      )}

                      {/* Closed: final winner summary */}
                      {isClosed && latestWinner && (
                        <div className="flex items-center gap-1.5 bg-gray-100 border border-gray-200 rounded-lg px-2.5 py-1.5">
                          <span className="text-gray-500 text-xs">🏆</span>
                          <span className="text-xs text-gray-600 font-medium truncate">Ganhador: {latestWinner}</span>
                        </div>
                      )}

                      {/* Lucky number badge OR join button */}
                      {isRaffle && !isClosed && (
                        luckyNumber != null ? (
                          <span className="inline-flex items-center gap-1 bg-amber-400 text-amber-900 text-xs font-black px-2.5 py-1 rounded-full">
                            🎲 Número #{luckyNumber}
                          </span>
                        ) : (
                          <button
                            onClick={(e) => void handleJoinRaffle(e, campaign.id)}
                            disabled={isJoining}
                            className="w-full bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-amber-900 text-xs font-black px-3 py-1.5 rounded-lg transition"
                          >
                            {isJoining ? 'Entrando...' : 'Participar do Sorteio'}
                          </button>
                        )
                      )}
                      {!isRaffle && !isJoined && !isClosed && (
                        <button
                          onClick={(e) => void handleJoinIncentive(e, campaign.id)}
                          disabled={isJoining}
                          className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition"
                        >
                          {isJoining ? 'Entrando...' : 'Participar Agora'}
                        </button>
                      )}
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </main>
      <BarraNavegacao />
    </>
  )
}

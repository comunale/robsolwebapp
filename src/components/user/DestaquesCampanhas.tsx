'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import type { Campaign } from '@/types/campaign'

interface DestaquesCampanhasProps {
  campaigns: Campaign[]
  joinedIds: Set<string>
  luckyNumbersByCampaign?: Record<string, number>
  onJoin: (campaignId: string) => void
  onLuckyNumberJoined?: (campaignId: string, number: number) => void
}

export default function DestaquesCampanhas({
  campaigns,
  joinedIds,
  luckyNumbersByCampaign = {},
  onJoin,
  onLuckyNumberJoined,
}: DestaquesCampanhasProps) {
  const [joining, setJoining] = useState<Set<string>>(new Set())

  if (campaigns.length === 0) return null

  const handleJoin = async (e: React.MouseEvent, campaignId: string) => {
    e.preventDefault()
    e.stopPropagation()
    if (joining.has(campaignId)) return
    setJoining((prev) => new Set([...prev, campaignId]))
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/participate`, { method: 'POST' })
      if (res.ok) onJoin(campaignId)
    } catch { /* silent */ } finally {
      setJoining((prev) => { const n = new Set(prev); n.delete(campaignId); return n })
    }
  }

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
        onLuckyNumberJoined?.(campaignId, d.lucky_number.number)
        onJoin(campaignId)
      }
    } catch { /* silent */ } finally {
      setJoining((prev) => { const n = new Set(prev); n.delete(campaignId); return n })
    }
  }

  return (
    <section className="mb-6">
      <h2 className="text-sm font-semibold text-gray-700 mb-3 px-1">Campanhas Disponíveis</h2>
      <div
        className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory"
        style={{ scrollbarWidth: 'none' }}
      >
        {campaigns.map((campaign) => {
          const isRaffle = campaign.type === 'raffle_only'
          const isJoined = joinedIds.has(campaign.id)
          const isJoining = joining.has(campaign.id)
          const luckyNumber = luckyNumbersByCampaign[campaign.id]

          return (
            <Link
              key={campaign.id}
              href={`/campaigns/${campaign.id}`}
              className="snap-start flex-shrink-0 w-64 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl p-4 text-white shadow-md hover:shadow-lg transition-shadow"
            >
              {(campaign.banner_url || campaign.banner_url_mobile) && (
                <div className="relative w-full aspect-[4/3] md:aspect-video rounded-lg overflow-hidden mb-3 bg-white/10">
                  {campaign.banner_url_mobile && (
                    <Image
                      src={campaign.banner_url_mobile}
                      alt={campaign.title}
                      fill
                      sizes="256px"
                      className="object-cover md:hidden"
                    />
                  )}
                  {campaign.banner_url && (
                    <Image
                      src={campaign.banner_url}
                      alt={campaign.title}
                      fill
                      sizes="320px"
                      className={`object-cover ${campaign.banner_url_mobile ? 'hidden md:block' : ''}`}
                    />
                  )}
                </div>
              )}

              <h3 className="font-bold text-sm mb-1 truncate">{campaign.title}</h3>
              {campaign.description && (
                <p className="text-white/80 text-xs mb-2 line-clamp-2">{campaign.description}</p>
              )}

              <div className="flex items-center justify-between text-xs mb-3">
                {isRaffle ? (
                  <span className="bg-amber-400/30 text-amber-200 px-2 py-0.5 rounded-full font-semibold">
                    🎲 Sorteio
                  </span>
                ) : (
                  <span className="bg-white/20 px-2 py-0.5 rounded-full">
                    {campaign.settings?.points_per_coupon || 10} pts/cupom
                  </span>
                )}
                <span className="text-white/70">
                  ate {new Date(campaign.end_date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                </span>
              </div>

              {/* Participation CTA */}
              {isRaffle ? (
                luckyNumber != null ? (
                  <div className="flex items-center gap-1.5">
                    <span className="inline-flex items-center gap-1 bg-amber-400 text-amber-900 text-xs font-black px-2.5 py-1 rounded-full">
                      🎲 Número #{luckyNumber}
                    </span>
                  </div>
                ) : (
                  <button
                    onClick={(e) => void handleJoinRaffle(e, campaign.id)}
                    disabled={isJoining}
                    className="w-full bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-amber-900 text-xs font-black px-3 py-1.5 rounded-lg transition"
                  >
                    {isJoining ? 'Entrando...' : 'Participar do Sorteio'}
                  </button>
                )
              ) : isJoined ? (
                <div className="flex items-center gap-1.5">
                  <span className="inline-flex items-center gap-1 bg-green-500 text-white text-xs font-bold px-2.5 py-1 rounded-full">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                    Participando
                  </span>
                </div>
              ) : (
                <button
                  onClick={(e) => void handleJoin(e, campaign.id)}
                  disabled={isJoining}
                  className="w-full bg-white/20 hover:bg-white/30 disabled:opacity-50 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition border border-white/30"
                >
                  {isJoining ? 'Entrando...' : 'Participar Agora'}
                </button>
              )}

              {!isRaffle && campaign.settings?.goals && campaign.settings.goals.length > 0 && (
                <div className="mt-1.5 text-xs text-white/60">
                  {campaign.settings.goals.length} meta(s) disponivel(is)
                </div>
              )}
            </Link>
          )
        })}
      </div>
    </section>
  )
}

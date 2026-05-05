'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { useAuth } from '@/lib/hooks/useAuth'
import { createClient } from '@/lib/supabase/client'
import CabecalhoUsuario from '@/components/user/CabecalhoUsuario'
import BarraNavegacao from '@/components/user/BarraNavegacao'
import LoadingSpinner from '@/components/shared/LoadingSpinner'
import type { Campaign } from '@/types/campaign'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
interface CampaignPrize {
  id: string
  title: string
  points_cost: number | null
  image_url: string | null
  image_horizontal: string | null
  images: string[] | null
  pdf_url: string | null
  description: string | null
}

interface PendingSelection {
  id: string
  prize_id: string
  status: string
}

interface PrizesData {
  prizes: CampaignPrize[]
  spendablePoints: number
  totalPoints: number
  pendingSelections: PendingSelection[]
}

// ─────────────────────────────────────────────────────────────────────────────
// Lightbox
// ─────────────────────────────────────────────────────────────────────────────
function Lightbox({ src, onClose }: { src: string; onClose: () => void }) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <button
        className="absolute top-4 right-4 text-white/80 hover:text-white p-2 rounded-full bg-white/10"
        onClick={onClose}
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Prize Card
// ─────────────────────────────────────────────────────────────────────────────
function PrizeCard({
  prize,
  isRaffle,
  spendablePoints,
  isSelected,
  hasPendingSelection,
  selecting,
  onResgatar,
  onImageClick,
}: {
  prize: CampaignPrize
  isRaffle: boolean
  spendablePoints: number
  isSelected: boolean
  hasPendingSelection: boolean
  selecting: boolean
  onResgatar: (prize: CampaignPrize) => void
  onImageClick: (src: string) => void
}) {
  const mainImage = prize.image_horizontal ?? prize.image_url
  const galleryImages = prize.images?.filter(Boolean) ?? []
  const canAfford = isRaffle || spendablePoints >= (prize.points_cost ?? 0)
  const needed = (prize.points_cost ?? 0) - spendablePoints

  return (
    <div className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${isSelected ? 'border-green-400 ring-2 ring-green-300' : 'border-gray-200'}`}>
      {/* Main image */}
      {mainImage ? (
        <button
          type="button"
          className="w-full"
          onClick={() => onImageClick(mainImage)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={mainImage} alt={prize.title} className="w-full h-48 object-cover" />
        </button>
      ) : (
        <div className="w-full h-48 bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center">
          <span className="text-5xl">🎁</span>
        </div>
      )}

      {/* Gallery thumbnails */}
      {galleryImages.length > 0 && (
        <div className="flex gap-1.5 p-2 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          {galleryImages.map((src, i) => (
            <button
              key={i}
              type="button"
              onClick={() => onImageClick(src)}
              className="flex-shrink-0 w-14 h-14 rounded-lg overflow-hidden border border-gray-200 hover:ring-2 hover:ring-indigo-400 transition"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}

      <div className="p-4">
        <h3 className="font-bold text-gray-900 text-sm leading-tight mb-1">{prize.title}</h3>
        {prize.description && (
          <p className="text-xs text-gray-500 mb-3 line-clamp-3">{prize.description}</p>
        )}

        {/* PDF download */}
        {prize.pdf_url && (
          <a
            href={prize.pdf_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-800 mb-3 font-medium"
            onClick={(e) => e.stopPropagation()}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            Baixar Catálogo (PDF)
          </a>
        )}

        <div className="flex items-center justify-between gap-2">
          {isRaffle ? (
            <span className="text-sm font-bold text-amber-600">🎲 Sorteio</span>
          ) : (
            <span className={`text-sm font-black ${canAfford || isSelected ? 'text-indigo-700' : 'text-gray-400'}`}>
              {prize.points_cost} pts
            </span>
          )}

          {isRaffle ? (
            <span className="text-xs text-gray-500 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl font-medium">
              Prêmios Disponíveis
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
              onClick={() => onResgatar(prize)}
              disabled={!canAfford || selecting || hasPendingSelection}
              className="text-xs font-bold px-4 py-2 rounded-xl transition disabled:opacity-40 disabled:cursor-not-allowed bg-indigo-600 hover:bg-indigo-700 text-white disabled:bg-gray-200 disabled:text-gray-400"
            >
              {selecting
                ? 'Resgatando...'
                : !canAfford
                ? `Faltam ${needed} pts`
                : 'Resgatar'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────────────────────
export default function CampaignDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const supabase = useMemo(() => createClient(), [])

  const id = params.id as string

  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [participating, setParticipating] = useState(false)
  const [joinedAt, setJoinedAt] = useState<string | null>(null)
  const [luckyNumber, setLuckyNumber] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState(false)
  const [joinError, setJoinError] = useState('')

  const [prizesData, setPrizesData] = useState<PrizesData | null>(null)
  const [selecting, setSelecting] = useState<Record<string, boolean>>({})
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null)

  const fetchPrizes = useCallback(async () => {
    const res = await fetch(`/api/campaigns/${id}/prizes`)
    if (res.ok) {
      const d = await res.json()
      setPrizesData(d)
    }
  }, [id])

  useEffect(() => {
    if (!user || !id) return
    let active = true

    const fetchData = async () => {
      const [campaignRes, participationRes, luckyRes] = await Promise.all([
        supabase.from('campaigns').select('*').eq('id', id).single(),
        supabase
          .from('campaign_participants')
          .select('id, joined_at')
          .eq('user_id', user.id)
          .eq('campaign_id', id)
          .maybeSingle(),
        supabase
          .from('lucky_numbers')
          .select('number')
          .eq('user_id', user.id)
          .eq('campaign_id', id)
          .maybeSingle(),
      ])

      if (!active) return

      if (campaignRes.error || !campaignRes.data) {
        router.replace('/dashboard')
        return
      }

      setCampaign(campaignRes.data as Campaign)
      if (participationRes.data) {
        setParticipating(true)
        setJoinedAt(participationRes.data.joined_at)
      }
      if (luckyRes.data) setLuckyNumber(luckyRes.data.number)
      setLoading(false)
    }

    void fetchData()
    void fetchPrizes()
    return () => { active = false }
  }, [user, id, supabase, router, fetchPrizes])

  const handleJoin = async () => {
    if (!user || !campaign) return
    const isRaffle = campaign.type === 'raffle_only'
    setJoining(true)
    setJoinError('')
    try {
      if (isRaffle) {
        const res = await fetch('/api/lucky-numbers/join', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ campaign_id: campaign.id }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error)
        setParticipating(true)
        setLuckyNumber(data.lucky_number?.number ?? null)
        await fetchPrizes()
      } else {
        const res = await fetch(`/api/campaigns/${campaign.id}/participate`, { method: 'POST' })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error)
        setParticipating(true)
        setJoinedAt(data.joined_at)
        await fetchPrizes()
      }
    } catch (err: unknown) {
      setJoinError(err instanceof Error ? err.message : 'Falha ao participar')
    } finally {
      setJoining(false)
    }
  }

  const handleResgatar = async (prize: CampaignPrize) => {
    setSelecting((p) => ({ ...p, [prize.id]: true }))
    try {
      const res = await fetch('/api/user/prizes/select', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prize_id: prize.id, campaign_id: id }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error ?? 'Erro')
      await fetchPrizes()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Erro ao resgatar prêmio')
    } finally {
      setSelecting((p) => ({ ...p, [prize.id]: false }))
    }
  }

  if (authLoading || loading) return <LoadingSpinner />
  if (!user || !campaign) return null

  const isRaffle = campaign.type === 'raffle_only'
  const isExpired = new Date(campaign.end_date) < new Date()
  const canJoin = campaign.is_active && !isExpired && !participating

  const selectedPrizeIds = new Set((prizesData?.pendingSelections ?? []).map((s) => s.prize_id))
  const hasPendingSelection = (prizesData?.pendingSelections ?? []).length > 0

  return (
    <>
      {lightboxSrc && <Lightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />}

      <CabecalhoUsuario />
      <main className="max-w-lg mx-auto pb-24">
        {/* Banner */}
        {(campaign.banner_url || campaign.banner_url_mobile) && (
          <div className="relative w-full aspect-video overflow-hidden bg-gray-100">
            {campaign.banner_url_mobile && (
              <Image
                src={campaign.banner_url_mobile}
                alt={campaign.title}
                fill
                sizes="100vw"
                className="object-cover md:hidden"
                priority
              />
            )}
            {campaign.banner_url && (
              <Image
                src={campaign.banner_url}
                alt={campaign.title}
                fill
                sizes="100vw"
                className={`object-cover ${campaign.banner_url_mobile ? 'hidden md:block' : ''}`}
                priority
              />
            )}
          </div>
        )}

        <div className="px-4 py-5 space-y-5">
          {/* Back link */}
          <Link href="/campanhas" className="inline-flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-800">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Voltar às Campanhas
          </Link>

          {/* Title + badges */}
          <div>
            <div className="flex items-start justify-between gap-3 mb-2">
              <h1 className="text-xl font-bold text-gray-900">{campaign.title}</h1>
              <div className="flex flex-col items-end gap-1.5">
                {isRaffle && (
                  <span className="flex-shrink-0 inline-flex items-center bg-amber-100 text-amber-700 text-xs font-bold px-3 py-1 rounded-full">
                    🎲 Sorteio
                  </span>
                )}
                {participating && !isRaffle && (
                  <span className="flex-shrink-0 inline-flex items-center gap-1 bg-green-100 text-green-800 text-xs font-semibold px-3 py-1 rounded-full">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Participando
                  </span>
                )}
                {!campaign.is_active && (
                  <span className="flex-shrink-0 inline-flex items-center bg-gray-100 text-gray-500 text-xs font-medium px-3 py-1 rounded-full">
                    Encerrada
                  </span>
                )}
              </div>
            </div>

            <p className="text-sm text-gray-500">
              {new Date(campaign.start_date).toLocaleDateString('pt-BR')}
              {' — '}
              {new Date(campaign.end_date).toLocaleDateString('pt-BR')}
              {isExpired && <span className="ml-2 text-red-500">(Expirada)</span>}
            </p>
          </div>

          {/* Incentive stats */}
          {!isRaffle && campaign.settings?.points_per_coupon != null && (
            <div className="flex gap-3">
              <div className="bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3 text-center">
                <p className="text-xs text-indigo-500 mb-0.5">Pontos por cupom</p>
                <p className="text-lg font-bold text-indigo-700">{campaign.settings.points_per_coupon}</p>
              </div>
              {campaign.settings.goals?.length > 0 && (
                <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 text-center">
                  <p className="text-xs text-amber-500 mb-0.5">Metas disponíveis</p>
                  <p className="text-lg font-bold text-amber-700">{campaign.settings.goals.length}</p>
                </div>
              )}
              {prizesData && (
                <div className="bg-green-50 border border-green-100 rounded-xl px-4 py-3 text-center">
                  <p className="text-xs text-green-500 mb-0.5">Seus pontos</p>
                  <p className="text-lg font-bold text-green-700">{prizesData.spendablePoints}</p>
                </div>
              )}
            </div>
          )}

          {/* Raffle lucky number */}
          {isRaffle && participating && luckyNumber != null && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-amber-600 uppercase tracking-widest mb-0.5">Seu número da sorte</p>
                <p className="text-3xl font-black text-amber-700">#{luckyNumber}</p>
              </div>
              <span className="text-5xl">🎲</span>
            </div>
          )}

          {/* Description */}
          {campaign.description && (
            <div>
              <h2 className="text-sm font-semibold text-gray-700 mb-2">Como funciona</h2>
              <p className="text-sm text-gray-600 leading-relaxed">{campaign.description}</p>
            </div>
          )}

          {/* Keywords */}
          {!isRaffle && campaign.keywords?.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-gray-700 mb-2">Produtos participantes</h2>
              <div className="flex flex-wrap gap-2">
                {campaign.keywords.map((kw, i) => (
                  <span key={i} className="px-3 py-1 bg-indigo-100 text-indigo-700 text-xs rounded-full font-medium">
                    {kw}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Error */}
          {joinError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
              {joinError}
            </div>
          )}

          {/* Join CTA */}
          {canJoin && (
            <button
              onClick={handleJoin}
              disabled={joining}
              className={`w-full font-semibold py-4 rounded-xl transition text-base ${
                isRaffle
                  ? 'bg-amber-400 hover:bg-amber-300 disabled:bg-amber-200 text-amber-900'
                  : 'bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white'
              }`}
            >
              {joining
                ? 'Entrando...'
                : isRaffle
                ? '🎲 Participar do Sorteio'
                : 'Quero Participar'}
            </button>
          )}

          {/* Incentive: already participating — scan CTA */}
          {participating && !isRaffle && joinedAt && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-sm text-green-800">
              <p className="font-semibold mb-0.5">Você já está participando!</p>
              <p className="text-green-600 text-xs">
                Participando desde {new Date(joinedAt).toLocaleDateString('pt-BR')}
              </p>
              <Link
                href="/dashboard/scan"
                className="mt-3 inline-flex w-full items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-lg transition text-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Escanear Cupom
              </Link>
            </div>
          )}

          {/* ── Prizes Section ─────────────────────────────────────────────── */}
          {prizesData && prizesData.prizes.length > 0 && (
            <div className="pt-2">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-bold text-gray-900">Prêmios desta Campanha</h2>
                <span className="text-xs text-gray-400">
                  {prizesData.prizes.length} prêmio{prizesData.prizes.length !== 1 ? 's' : ''}
                </span>
              </div>

              {/* Points balance for incentive */}
              {!isRaffle && (
                <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl border border-indigo-100 p-3 mb-4">
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <p className="text-lg font-black text-indigo-700">{prizesData.totalPoints}</p>
                      <p className="text-[10px] text-gray-500 font-medium">Total</p>
                    </div>
                    <div>
                      <p className="text-lg font-black text-amber-600">{prizesData.totalPoints - prizesData.spendablePoints}</p>
                      <p className="text-[10px] text-gray-500 font-medium">Reservados</p>
                    </div>
                    <div>
                      <p className="text-lg font-black text-green-600">{prizesData.spendablePoints}</p>
                      <p className="text-[10px] text-gray-500 font-medium">Disponíveis</p>
                    </div>
                  </div>
                </div>
              )}

              {isRaffle && (
                <p className="text-xs text-gray-500 mb-4">
                  Prêmios que serão sorteados entre os participantes ao final da campanha.
                </p>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {prizesData.prizes.map((prize) => (
                  <PrizeCard
                    key={prize.id}
                    prize={prize}
                    isRaffle={isRaffle}
                    spendablePoints={prizesData.spendablePoints}
                    isSelected={selectedPrizeIds.has(prize.id)}
                    hasPendingSelection={hasPendingSelection && !selectedPrizeIds.has(prize.id)}
                    selecting={!!selecting[prize.id]}
                    onResgatar={handleResgatar}
                    onImageClick={setLightboxSrc}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
      <BarraNavegacao />
    </>
  )
}

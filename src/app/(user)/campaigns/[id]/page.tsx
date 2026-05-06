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
        loading="lazy"
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
  const displayImages = useMemo(
    () => [mainImage, ...(prize.images?.filter(Boolean) ?? [])].filter(Boolean) as string[],
    [mainImage, prize.images],
  )
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const currentImage = selectedImage && displayImages.includes(selectedImage) ? selectedImage : displayImages[0] ?? null
  const canAfford = spendablePoints >= (prize.points_cost ?? 0)
  const needed = (prize.points_cost ?? 0) - spendablePoints

  return (
    <div className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${!isRaffle && isSelected ? 'border-green-400 ring-2 ring-green-300' : 'border-gray-200'}`}>
      {/* Main image */}
      {currentImage ? (
        <button type="button" className="relative w-full group" onClick={() => onImageClick(currentImage)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={currentImage} alt={prize.title} loading="lazy" className="w-full h-48 object-cover" />
          <span className="absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-full bg-black/65 px-2.5 py-1 text-[11px] font-semibold text-white shadow-sm">
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35m1.1-5.15a6.25 6.25 0 11-12.5 0 6.25 6.25 0 0112.5 0zM10.5 8v5m-2.5-2.5h5" />
            </svg>
            Toque na imagem para ampliar
          </span>
        </button>
      ) : (
        <div className="w-full h-48 bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center">
          <span className="text-5xl">🎁</span>
        </div>
      )}

      {/* Gallery thumbnails */}
      {displayImages.length > 1 && (
        <div className="flex gap-1.5 p-2 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          {displayImages.map((src, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setSelectedImage(src)}
              aria-label={`Ver imagem ${i + 1} de ${prize.title}`}
              className={`flex-shrink-0 w-14 h-14 rounded-lg overflow-hidden border transition ${
                currentImage === src
                  ? 'border-indigo-500 ring-2 ring-indigo-400'
                  : 'border-gray-200 hover:ring-2 hover:ring-indigo-300'
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" loading="lazy" className="w-full h-full object-cover" />
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

        {/* Incentive-only: points cost + resgatar button */}
        {!isRaffle && (
          <div className="flex items-center justify-between gap-2 mt-2">
            <span className={`text-sm font-black ${canAfford || isSelected ? 'text-indigo-700' : 'text-gray-400'}`}>
              {prize.points_cost} pts
            </span>
            {isSelected ? (
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
                {selecting ? 'Resgatando...' : !canAfford ? `Faltam ${needed} pts` : 'Resgatar'}
              </button>
            )}
          </div>
        )}
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
  const [luckyNumberId, setLuckyNumberId] = useState<string | null>(null)
  const [isWinner, setIsWinner] = useState(false)
  const [winnerPrizeId, setWinnerPrizeId] = useState<string | null>(null)
  const [selectingPrize, setSelectingPrize] = useState(false)
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
          .select('id, number, is_winner, selected_prize_id')
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
      if (luckyRes.data) {
        setLuckyNumber(luckyRes.data.number)
        setLuckyNumberId(luckyRes.data.id)
        setIsWinner(luckyRes.data.is_winner ?? false)
        setWinnerPrizeId(luckyRes.data.selected_prize_id ?? null)
      }
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
        setLuckyNumberId(data.lucky_number?.id ?? null)
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

  const handleSelectWinnerPrize = async (prizeId: string) => {
    if (!luckyNumberId) return
    setSelectingPrize(true)
    try {
      const res = await fetch('/api/lucky-numbers/select-prize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lucky_number_id: luckyNumberId, prize_id: prizeId }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error ?? 'Erro')
      setWinnerPrizeId(prizeId)
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Erro ao selecionar prêmio')
    } finally {
      setSelectingPrize(false)
    }
  }

  if (authLoading || loading) return <LoadingSpinner />
  if (!user || !campaign) return null

  const isRaffle = campaign.type === 'raffle_only'
  const isExpired = new Date(campaign.end_date) < new Date()
  const hasJoinedRaffle = isRaffle && luckyNumber != null
  const isClosed = campaign.status === 'closed'
  const canJoin = campaign.is_active && !isExpired && !participating && !hasJoinedRaffle && !isClosed
  const campaignDescription =
    campaign.description?.trim() ||
    'Confira os detalhes da campanha, acompanhe os premios disponiveis e veja como participar.'
  const campaignEndDate = new Date(campaign.end_date).toLocaleDateString('pt-BR')
  const howItWorksSteps = isRaffle
    ? [
        participating && luckyNumber != null
          ? `Seu numero da sorte #${luckyNumber} foi gerado. Aguarde o sorteio no dia ${campaignEndDate}.`
          : 'Toque em Participar do Sorteio para gerar seu numero da sorte.',
        'Confira os premios desta campanha abaixo.',
        'O resultado sera divulgado conforme as regras da campanha.',
      ]
    : [
        participating
          ? 'Envie seus cupons pelo painel para acumular pontos nesta campanha.'
          : 'Toque em Quero Participar para entrar na campanha.',
        campaign.settings?.points_per_coupon != null
          ? `Cada cupom aprovado vale ${campaign.settings.points_per_coupon} ponto(s).`
          : 'Cada cupom aprovado soma pontos para resgate.',
        'Use seus pontos disponiveis para escolher um premio da campanha.',
      ]

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
                loading="lazy"
                className="object-cover md:hidden"
              />
            )}
            {campaign.banner_url && (
              <Image
                src={campaign.banner_url}
                alt={campaign.title}
                fill
                sizes="100vw"
                loading="lazy"
                className={`object-cover ${campaign.banner_url_mobile ? 'hidden md:block' : ''}`}
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
                {(!campaign.is_active || isClosed) && (
                  <span className="flex-shrink-0 inline-flex items-center bg-gray-100 text-gray-500 text-xs font-medium px-3 py-1 rounded-full">
                    Encerrada
                  </span>
                )}
                {isRaffle && hasJoinedRaffle && !isClosed && (
                  <span className="flex-shrink-0 inline-flex items-center gap-1 bg-amber-100 text-amber-700 text-xs font-semibold px-3 py-1 rounded-full">
                    🎲 Participando
                  </span>
                )}
              </div>
            </div>

            <p className="text-sm text-gray-500">
              {new Date(campaign.start_date).toLocaleDateString('pt-BR')}
              {' — '}
              {campaignEndDate}
              {isExpired && <span className="ml-2 text-red-500">(Expirada)</span>}
            </p>

            <p className="mt-3 text-sm text-gray-700 leading-relaxed">{campaignDescription}</p>
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
          {isRaffle && luckyNumber != null && (
            <div className={`border rounded-xl p-4 flex items-center justify-between ${isWinner ? 'bg-green-50 border-green-300' : 'bg-amber-50 border-amber-200'}`}>
              <div>
                <p className={`text-xs font-bold uppercase tracking-widest mb-0.5 ${isWinner ? 'text-green-700' : 'text-amber-600'}`}>
                  {isWinner ? 'Número da sorte — GANHADOR!' : 'Seu número da sorte'}
                </p>
                <p className={`text-3xl font-black ${isWinner ? 'text-green-800' : 'text-amber-700'}`}>#{luckyNumber}</p>
              </div>
              <span className="text-5xl">{isWinner ? '🏆' : '🎲'}</span>
            </div>
          )}

          {/* Winner: prize selection */}
          {isRaffle && isWinner && (
            <div className="bg-gradient-to-br from-amber-50 to-yellow-50 border-2 border-amber-400 rounded-xl p-5">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-3xl">🏆</span>
                <div>
                  <p className="font-bold text-amber-900 text-base">Parabéns, você foi sorteado!</p>
                  <p className="text-sm text-amber-700">
                    {winnerPrizeId ? 'Seu prêmio foi escolhido com sucesso.' : 'Escolha seu prêmio abaixo:'}
                  </p>
                </div>
              </div>

              {winnerPrizeId ? (
                <div className="flex items-center gap-2 bg-green-100 border border-green-300 rounded-xl px-4 py-3">
                  <svg className="w-5 h-5 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                  <p className="text-sm font-semibold text-green-800">
                    {prizesData?.prizes.find((p) => p.id === winnerPrizeId)?.title ?? 'Prêmio selecionado'}
                  </p>
                </div>
              ) : prizesData && prizesData.prizes.length > 0 ? (
                <div className="space-y-2">
                  {prizesData.prizes.map((prize) => {
                    const img = prize.image_horizontal ?? prize.image_url
                    return (
                      <button
                        key={prize.id}
                        onClick={() => void handleSelectWinnerPrize(prize.id)}
                        disabled={selectingPrize}
                        className="w-full text-left flex items-center gap-3 bg-white border border-amber-300 hover:border-amber-500 hover:shadow-sm rounded-xl p-3 transition disabled:opacity-50"
                      >
                        {img ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={img} alt="" loading="lazy" className="w-16 h-16 object-cover rounded-lg flex-shrink-0" />
                        ) : (
                          <div className="w-16 h-16 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
                            <span className="text-2xl">🎁</span>
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-900 text-sm">{prize.title}</p>
                          {prize.description && (
                            <p className="text-xs text-gray-500 line-clamp-2 mt-0.5">{prize.description}</p>
                          )}
                        </div>
                        <svg className="w-5 h-5 text-amber-400 flex-shrink-0 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    )
                  })}
                </div>
              ) : (
                <p className="text-sm text-amber-700 bg-white border border-amber-200 rounded-lg px-4 py-3">
                  Entre em contato com a equipe para escolher seu prêmio.
                </p>
              )}
            </div>
          )}

          {/* How it works */}
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <h2 className="text-sm font-semibold text-gray-800 mb-3">Como funciona</h2>
            <ol className="space-y-2">
              {howItWorksSteps.map((step, i) => (
                <li key={i} className="flex gap-3 text-sm text-gray-600 leading-relaxed">
                  <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-indigo-100 text-[11px] font-bold text-indigo-700">
                    {i + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </div>

          {prizesData && prizesData.prizes.length > 0 && (
            <div className="pt-1">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-bold text-gray-900">Prêmios desta Campanha</h2>
                <span className="text-xs text-gray-400">
                  {prizesData.prizes.length} prêmio{prizesData.prizes.length !== 1 ? 's' : ''}
                </span>
              </div>

              {/* Points balance — incentive only */}
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

          {/* Raffle: already participating (locked) */}
          {isRaffle && hasJoinedRaffle && !isClosed && !isWinner && (
            <div className="w-full flex items-center justify-center gap-2 bg-amber-50 border border-amber-200 text-amber-700 font-semibold py-4 rounded-xl text-base">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Aguardando Sorteio
            </div>
          )}

          {/* Closed campaign notice */}
          {isClosed && (
            <div className="w-full flex items-center justify-center gap-2 bg-gray-100 border border-gray-200 text-gray-500 font-semibold py-4 rounded-xl text-base">
              Campanha encerrada
            </div>
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
        </div>
      </main>
      <BarraNavegacao />
    </>
  )
}

'use client'

import { useState, useEffect, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { useAuth } from '@/lib/hooks/useAuth'
import { createClient } from '@/lib/supabase/client'
import CabecalhoUsuario from '@/components/user/CabecalhoUsuario'
import BarraNavegacao from '@/components/user/BarraNavegacao'
import LoadingSpinner from '@/components/shared/LoadingSpinner'
import type { Campaign } from '@/types/campaign'

export default function CampaignDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const supabase = useMemo(() => createClient(), [])

  const id = params.id as string

  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [participating, setParticipating] = useState(false)
  const [joinedAt, setJoinedAt] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!user || !id) return
    let active = true

    const fetchData = async () => {
      const [campaignRes, participationRes] = await Promise.all([
        supabase.from('campaigns').select('*').eq('id', id).single(),
        supabase
          .from('campaign_participants')
          .select('id, joined_at')
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
      setLoading(false)
    }

    void fetchData()
    return () => { active = false }
  }, [user, id, supabase, router])

  const handleJoin = async () => {
    if (!user || !campaign) return
    setJoining(true)
    setError('')

    try {
      const res = await fetch(`/api/campaigns/${campaign.id}/participate`, {
        method: 'POST',
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setParticipating(true)
      setJoinedAt(data.joined_at)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Falha ao participar')
    } finally {
      setJoining(false)
    }
  }

  if (authLoading || loading) return <LoadingSpinner />
  if (!user || !campaign) return null

  const isExpired = new Date(campaign.end_date) < new Date()
  const canJoin = campaign.is_active && !isExpired && !participating

  return (
    <>
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
          <Link href="/dashboard" className="inline-flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-800">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Voltar
          </Link>

          {/* Title + status badge */}
          <div>
            <div className="flex items-start justify-between gap-3 mb-2">
              <h1 className="text-xl font-bold text-gray-900">{campaign.title}</h1>
              {participating && (
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

            {/* Dates */}
            <p className="text-sm text-gray-500">
              {new Date(campaign.start_date).toLocaleDateString('pt-BR')}
              {' — '}
              {new Date(campaign.end_date).toLocaleDateString('pt-BR')}
              {isExpired && <span className="ml-2 text-red-500">(Expirada)</span>}
            </p>
          </div>

          {/* Points per coupon */}
          {campaign.settings?.points_per_coupon != null && (
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
          {campaign.keywords?.length > 0 && (
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
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
              {error}
            </div>
          )}

          {/* Join CTA */}
          {canJoin && (
            <button
              onClick={handleJoin}
              disabled={joining}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-semibold py-4 rounded-xl transition text-base"
            >
              {joining ? 'Entrando...' : 'Quero Participar'}
            </button>
          )}

          {participating && joinedAt && (
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

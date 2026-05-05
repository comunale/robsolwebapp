'use client'

import { useState, useEffect, useRef, useMemo, Suspense } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import confetti from 'canvas-confetti'
import { useSearchParams } from 'next/navigation'
import { useAuth } from '@/lib/hooks/useAuth'
import { createClient } from '@/lib/supabase/client'
import { scanCouponImage } from '@/app/actions/scanCoupon'
import { uploadCouponImage } from '@/lib/storage/imageStorage'
import CabecalhoUsuario from '@/components/user/CabecalhoUsuario'
import BarraNavegacao from '@/components/user/BarraNavegacao'
import LoadingSpinner from '@/components/shared/LoadingSpinner'
import type { Campaign } from '@/types/campaign'
import type { ExtractedData } from '@/types/coupon'

// ─────────────────────────────────────────────────────────────────────────────
// Victory Modal — shown when a coupon is successfully submitted
// ─────────────────────────────────────────────────────────────────────────────
function VictoryModal({
  pointsPending,
  currentPoints,
  onScanAnother,
}: {
  pointsPending: number
  currentPoints: number
  onScanAnother: () => void
}) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (pointsPending <= 0) return
    const duration = 1200
    const interval = 40
    const steps = duration / interval
    const increment = pointsPending / steps
    let current = 0
    const id = setInterval(() => {
      current += increment
      if (current >= pointsPending) {
        setCount(pointsPending)
        clearInterval(id)
      } else {
        setCount(Math.floor(current))
      }
    }, interval)
    return () => clearInterval(id)
  }, [pointsPending])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div
        className="relative w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl"
        style={{ background: 'linear-gradient(160deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)' }}
      >
        {/* Gold shimmer top strip */}
        <div className="h-1.5 w-full" style={{ background: 'linear-gradient(90deg, #ffc400, #fff6cc, #ffc400)' }} />

        <div className="px-6 py-8 text-center">
          {/* Checkmark circle */}
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5 shadow-lg"
            style={{ background: 'linear-gradient(135deg, #ffc400, #ffe066)' }}
          >
            <svg className="w-10 h-10" fill="none" stroke="#1a1a2e" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>

          {/* Headline */}
          <h2 className="text-2xl font-black text-white mb-1 tracking-tight">Cupom Enviado!</h2>
          <p className="text-white/50 text-sm mb-6">Aguardando aprovação do administrador</p>

          {/* Points earned card */}
          {pointsPending > 0 && (
            <div
              className="rounded-2xl p-4 mb-4 border border-yellow-400/20"
              style={{ background: 'rgba(255, 196, 0, 0.08)' }}
            >
              <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: '#ffc400' }}>
                Pontos em breve
              </p>
              <p className="text-4xl font-black" style={{ color: '#ffc400' }}>
                +{count}
              </p>
              <p className="text-white/40 text-xs mt-1">após aprovação do cupom</p>
            </div>
          )}

          {/* Current total */}
          <div className="flex items-center justify-center gap-2 mb-6">
            <svg className="w-4 h-4 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <span className="text-white/50 text-sm">
              Total atual: <span className="text-white font-bold">{currentPoints} pontos</span>
            </span>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <button
              onClick={onScanAnother}
              className="w-full py-3.5 rounded-2xl text-sm font-black transition active:scale-95"
              style={{ background: 'linear-gradient(135deg, #ffc400, #ffe066)', color: '#1a1a2e' }}
            >
              Enviar outro cupom
            </button>
            <Link
              href="/dashboard/meus-cupons"
              className="block w-full py-3 rounded-2xl text-sm font-semibold text-center transition"
              style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.7)' }}
            >
              Ver Meus Cupons
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

// Locale-agnostic date formatter — avoids SSR/client hydration mismatch
// caused by Node.js not having the pt-BR ICU locale compiled in.
function formatDateBR(dateStr: string): string {
  const d = new Date(dateStr)
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const year = d.getFullYear()
  return `${day}/${month}/${year}`
}

// ─────────────────────────────────────────────────────────────────────────
// Client-side image compression (Canvas API — no external library)
//
// Reduces a typical 5–10 MB smartphone photo to ~300–500 KB before upload:
//   • Max dimension: 1200 px (longest side), aspect ratio preserved
//   • Output:        JPEG at 80 % quality
//   • Falls back to the original file if the browser Canvas is unavailable
// ─────────────────────────────────────────────────────────────────────────
function compressImage(file: File): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = document.createElement('img')
    const objectUrl = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(objectUrl)

      const MAX = 1200
      let { width, height } = img

      // Scale down only — never upscale
      if (width > MAX || height > MAX) {
        if (width >= height) {
          height = Math.round((height * MAX) / width)
          width = MAX
        } else {
          width = Math.round((width * MAX) / height)
          height = MAX
        }
      }

      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height

      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('Canvas not supported'))
        return
      }

      ctx.drawImage(img, 0, 0, width, height)

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('canvas.toBlob returned null'))
            return
          }
          const name = file.name.replace(/\.[^.]+$/, '.jpg')
          resolve(new File([blob], name, { type: 'image/jpeg' }))
        },
        'image/jpeg',
        0.8
      )
    }

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('Failed to load image for compression'))
    }

    img.src = objectUrl
  })
}

type ScanPhase = 'idle' | 'uploading' | 'scanning' | 'ai_success' | 'ai_failed' | 'submitting' | 'done'

function ScanPageContent() {
  const { user, profile, loading: authLoading } = useAuth()
  const supabase = useMemo(() => createClient(), [])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const searchParams = useSearchParams()

  // Campaign & participation data
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [joinedIds, setJoinedIds] = useState<Set<string>>(new Set())
  const [dataReady, setDataReady] = useState(false)
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null)

  // Image state
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  // Stores the Supabase URL after the image-first upload in handleScan
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null)

  // Workflow state machine
  const [phase, setPhase] = useState<ScanPhase>('idle')
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null)

  // Manual fallback fields
  const [manualModel, setManualModel] = useState('')
  const [manualQuantity, setManualQuantity] = useState(1)

  // Feedback
  const [error, setError] = useState('')

  useEffect(() => {
    if (!user) return
    let active = true

    const fetchData = async () => {
      const [campaignsRes, participantsRes] = await Promise.all([
        supabase
          .from('campaigns')
          .select('*')
          .eq('is_active', true)
          .neq('type', 'raffle_only')
          .gte('end_date', new Date().toISOString())
          .order('created_at', { ascending: false }),
        supabase
          .from('campaign_participants')
          .select('campaign_id')
          .eq('user_id', user.id),
      ])

      if (!active) return
      if (campaignsRes.data) setCampaigns(campaignsRes.data as Campaign[])
      if (participantsRes.data) {
        setJoinedIds(new Set(participantsRes.data.map((p: { campaign_id: string }) => p.campaign_id)))
      }
      setDataReady(true)
    }

    void fetchData()
    return () => { active = false }
  }, [user, supabase])

  // Confetti + haptic feedback on success
  useEffect(() => {
    if (phase !== 'done') return

    // Haptic feedback
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate([200, 100, 200])
    }

    // Dual-cannon gold + white confetti burst
    const fire = (origin: { x: number; y: number }, angle: number) => {
      confetti({
        particleCount: 60,
        spread: 70,
        angle,
        origin,
        colors: ['#ffc400', '#ffe066', '#ffffff', '#fff6cc', '#ffb300'],
        zIndex: 9999,
        scalar: 1.1,
      })
    }

    fire({ x: 0.1, y: 0.6 }, 60)
    fire({ x: 0.9, y: 0.6 }, 120)
    setTimeout(() => {
      fire({ x: 0.2, y: 0.7 }, 75)
      fire({ x: 0.8, y: 0.7 }, 105)
    }, 250)
  }, [phase])

  // Auto-select campaign from URL param (e.g. coming from "Corrigir e Reenviar")
  useEffect(() => {
    if (!dataReady || campaigns.length === 0) return
    const preselect = searchParams.get('campaign_id')
    if (!preselect || selectedCampaign) return
    const match = campaigns.find((c) => c.id === preselect)
    if (match) setSelectedCampaign(match)
  }, [dataReady, campaigns, searchParams, selectedCampaign])

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setError('Por favor, selecione um arquivo de imagem válido')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('A imagem deve ter no máximo 10MB')
      return
    }

    setImageFile(file)
    setUploadedImageUrl(null)   // new image → clear any previously uploaded URL
    setExtractedData(null)
    setError('')
    setPhase('idle')
    setManualModel('')
    setManualQuantity(1)

    const reader = new FileReader()
    reader.onloadend = () => setImagePreview(reader.result as string)
    reader.readAsDataURL(file)
  }

  // ─────────────────────────────────────────────────────────────────────────
  // IMAGE-FIRST SCAN FLOW
  //
  // 1. Upload the raw file to Supabase Storage → get a public URL.
  //    This means no large base64 payload is ever sent through a Server Action.
  // 2. Pass only the URL to the AI server action.
  // 3. If AI succeeds → ai_success; if AI fails for any reason → ai_failed
  //    (manual form), never back to idle with an error.
  // ─────────────────────────────────────────────────────────────────────────
  const handleScan = async () => {
    if (!imageFile || !selectedCampaign || !user) {
      setError('Selecione uma campanha e envie uma imagem primeiro')
      return
    }

    setError('')

    try {
      // ── Step 1: Compress + upload (skip if already done for this file) ──
      let imageUrl = uploadedImageUrl
      if (!imageUrl) {
        setPhase('uploading')

        // Compress before upload — gracefully fall back to original on failure
        let fileToUpload = imageFile
        try {
          fileToUpload = await compressImage(imageFile)
          console.log(
            `[scan] Compressed: ${(imageFile.size / 1024).toFixed(0)} KB → ${(fileToUpload.size / 1024).toFixed(0)} KB`
          )
        } catch (compressErr) {
          console.warn('[scan] Compression failed — uploading original:', compressErr)
        }

        console.log('[scan] Uploading to Supabase Storage...')
        imageUrl = await uploadCouponImage(fileToUpload, user.id, selectedCampaign.id)
        setUploadedImageUrl(imageUrl)
        console.log('[scan] Upload complete:', imageUrl)
      }

      // ── Step 2: AI analysis via public URL (no base64 payload) ─────────
      setPhase('scanning')
      console.log('[scan] Calling AI analysis...')
      const result = await scanCouponImage(imageUrl, selectedCampaign.keywords || [])
      console.log('[scan] AI result — success:', result.success, '| has_matching:', result.data?.has_matching_products)

      if (!result.success || !result.data) {
        // AI could not process the image — fall through to manual entry.
        // Do NOT throw; the user must never be blocked.
        console.log('[scan] AI failed — opening manual entry form. Reason:', result.error)
        setExtractedData(null)
        setPhase('ai_failed')
        return
      }

      setExtractedData(result.data)
      // has_matching_products=false → ai_failed (manual form) with partial data preserved
      setPhase(result.data.has_matching_products ? 'ai_success' : 'ai_failed')
    } catch (err: unknown) {
      // Only hard upload errors reach here — AI failures are handled above.
      console.error('[scan] Upload error:', err)
      setError(err instanceof Error ? err.message : 'Falha ao fazer upload da imagem')
      setPhase('idle')
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SUBMIT — image is already in Supabase from the scan step, so we only
  // need to POST the metadata to /api/coupons. No re-upload.
  // ─────────────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!uploadedImageUrl || !selectedCampaign || !user) return

    // Capture phase before any async state change (avoid stale closure issues)
    const currentPhase = phase

    // Validate manual fields
    if (currentPhase === 'ai_failed') {
      if (!manualModel.trim()) {
        setError('Informe o Modelo do Óculos')
        return
      }
      if (manualQuantity < 1) {
        setError('A quantidade deve ser pelo menos 1')
        return
      }
    }

    setPhase('submitting')
    setError('')

    const dataToSubmit: ExtractedData = currentPhase === 'ai_failed'
      ? {
          ...(extractedData ?? { items: [], matched_keywords: [], has_matching_products: false }),
          submission_type: 'manual',
          manual_model: manualModel.trim(),
          manual_quantity: manualQuantity,
        }
      : {
          ...(extractedData!),
          submission_type: 'ai',
        }

    try {
      console.log('[scan] Submitting coupon — campaign:', selectedCampaign.id, '| type:', dataToSubmit.submission_type)
      const res = await fetch('/api/coupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaign_id: selectedCampaign.id,
          image_url: uploadedImageUrl,
          extracted_data: dataToSubmit,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Falha ao enviar cupom')
      }

      console.log('[scan] Coupon submitted successfully')
      setPhase('done')
    } catch (err: unknown) {
      console.error('[scan] Submit error:', err)
      setError(err instanceof Error ? err.message : 'Falha ao enviar cupom')
      // Restore the phase the user was in before submitting
      setPhase(extractedData?.has_matching_products ? 'ai_success' : 'ai_failed')
    }
  }

  const handleReset = () => {
    setImageFile(null)
    setImagePreview(null)
    setUploadedImageUrl(null)
    setExtractedData(null)
    setError('')
    setPhase('idle')
    setManualModel('')
    setManualQuantity(1)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const isSelectedJoined = selectedCampaign ? joinedIds.has(selectedCampaign.id) : false
  const isBusy = phase === 'uploading' || phase === 'scanning' || phase === 'submitting'
  const canScan = dataReady && !!selectedCampaign && !!imageFile && isSelectedJoined && phase === 'idle'

  if (authLoading) return <LoadingSpinner />
  if (!user) return null

  return (
    <>
      <CabecalhoUsuario />
      <main className="max-w-lg md:max-w-2xl mx-auto px-4 md:px-8 py-4 pb-24 md:pb-8">
        <h1 className="text-xl font-bold text-gray-900 mb-1">Escanear Cupom</h1>
        <p className="text-sm text-gray-500 mb-6">
          Envie a foto do seu cupom fiscal. Nossa IA vai identificar os produtos automaticamente.
        </p>

        {/* Error banner */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-4 text-sm flex items-start gap-2">
            <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </div>
        )}

        {/* ── DONE STATE — Victory Modal ──────────────────── */}
        {phase === 'done' && (
          <VictoryModal
            pointsPending={selectedCampaign?.settings?.points_per_coupon ?? 0}
            currentPoints={profile?.total_points ?? 0}
            onScanAnother={handleReset}
          />
        )}

        {/* ── NORMAL WORKFLOW (not done) ──────────────────── */}
        {phase !== 'done' && (
          <>
            {/* Step 1: Campaign */}
            <div className="mb-4">
              <h2 className="text-sm font-semibold text-gray-700 mb-2">1. Selecione a Campanha</h2>
              {!dataReady ? (
                <div className="bg-white rounded-xl p-4 border border-gray-100 text-center">
                  <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
                </div>
              ) : campaigns.length === 0 ? (
                <p className="text-gray-500 text-sm bg-white rounded-xl p-4 border border-gray-100">
                  Nenhuma campanha ativa no momento.
                </p>
              ) : (
                <div className="space-y-2">
                  {campaigns.map((campaign) => {
                    const isJoined = joinedIds.has(campaign.id)
                    const isSelected = selectedCampaign?.id === campaign.id
                    return (
                      <button
                        key={campaign.id}
                        onClick={() => {
                          setSelectedCampaign(campaign)
                          setExtractedData(null)
                          setUploadedImageUrl(null)  // stale URL belongs to old campaign path
                          setPhase('idle')
                          setError('')
                        }}
                        disabled={isBusy}
                        className={`w-full text-left p-3 rounded-xl border-2 transition text-sm ${
                          isSelected
                            ? 'border-indigo-500 bg-indigo-50'
                            : 'border-gray-100 bg-white hover:border-gray-200'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-semibold text-gray-900">{campaign.title}</p>
                          {isJoined ? (
                            <span className="flex-shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                              Participando
                            </span>
                          ) : (
                            <span className="flex-shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                              Não inscrito
                            </span>
                          )}
                        </div>
                        {campaign.keywords?.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {campaign.keywords.map((kw, i) => (
                              <span key={i} className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-xs rounded-full">
                                {kw}
                              </span>
                            ))}
                          </div>
                        )}
                        <p className="text-xs text-gray-400 mt-1.5">
                          Encerra em {formatDateBR(campaign.end_date)}
                        </p>
                      </button>
                    )
                  })}
                </div>
              )}

              {/* Join-gate warning */}
              {selectedCampaign && !isSelectedJoined && (
                <div className="mt-3 flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <svg className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <p className="text-sm font-semibold text-amber-800">Entre na campanha para enviar cupons</p>
                    <p className="text-xs text-amber-600 mt-0.5 mb-2">
                      Você precisa participar desta campanha antes de escanear cupons.
                    </p>
                    <Link
                      href={`/campaigns/${selectedCampaign.id}`}
                      className="inline-block bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition"
                    >
                      Participar agora
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* Step 2: Image Upload */}
            <div className="mb-4">
              <h2 className="text-sm font-semibold text-gray-700 mb-2">2. Envie o Cupom Fiscal</h2>
              <label
                htmlFor="receipt-upload"
                className="relative flex flex-col items-center justify-center w-full h-48 border-2 border-gray-200 border-dashed rounded-xl cursor-pointer bg-white hover:bg-gray-50 transition overflow-hidden"
              >
                {imagePreview ? (
                  <Image
                    src={imagePreview}
                    alt="Preview do cupom"
                    fill
                    unoptimized
                    sizes="100vw"
                    className="object-contain"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center py-6">
                    <svg className="w-10 h-10 mb-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <p className="text-sm text-gray-500">
                      <span className="font-semibold">Toque para tirar foto</span> ou enviar
                    </p>
                    <p className="text-xs text-gray-400 mt-1">PNG, JPG até 10MB</p>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  id="receipt-upload"
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleImageChange}
                  disabled={isBusy}
                  className="hidden"
                />
              </label>
              {imagePreview && phase === 'idle' && (
                <button onClick={handleReset} className="mt-2 text-sm text-red-500 hover:text-red-700">
                  Remover imagem
                </button>
              )}
            </div>

            {/* Step 3: Scan button (idle only) */}
            {phase === 'idle' && (
              <div className="mb-4">
                <h2 className="text-sm font-semibold text-gray-700 mb-2">3. Analisar com IA</h2>
                <button
                  onClick={handleScan}
                  disabled={!canScan}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 text-white font-semibold py-3 px-4 rounded-xl transition text-sm"
                >
                  Escanear com IA
                </button>
                {!canScan && imageFile && selectedCampaign && isSelectedJoined && (
                  <p className="text-xs text-gray-400 mt-1 text-center">Aguardando dados carregarem…</p>
                )}
              </div>
            )}

            {/* Uploading overlay */}
            {phase === 'uploading' && (
              <div className="mb-4 bg-white rounded-xl border border-gray-100 p-8 text-center">
                <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <h3 className="text-base font-semibold text-gray-900 mb-1">Enviando imagem…</h3>
                <p className="text-sm text-gray-500">Carregando o cupom para análise</p>
              </div>
            )}

            {/* Scanning overlay */}
            {phase === 'scanning' && (
              <div className="mb-4 bg-white rounded-xl border border-gray-100 p-8 text-center">
                <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <h3 className="text-base font-semibold text-gray-900 mb-1">IA analisando seu cupom…</h3>
                <p className="text-sm text-gray-500">Extraindo produtos e verificando palavras-chave da campanha</p>
              </div>
            )}

            {/* ── AI SUCCESS RESULT ──────────────────────── */}
            {phase === 'ai_success' && extractedData && (
              <div className="mb-4 space-y-3">
                <h2 className="text-sm font-semibold text-gray-700">3. Resultado da IA</h2>

                {/* Match status */}
                <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-green-200 rounded-full flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-green-800">Produtos correspondentes encontrados!</p>
                      {extractedData.matched_keywords?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {extractedData.matched_keywords.map((kw, i) => (
                            <span key={i} className="px-2 py-0.5 bg-green-200 text-green-800 text-xs rounded-full">{kw}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Extracted info grid */}
                <div className="bg-white rounded-xl border border-gray-100 p-4">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Dados Extraídos</h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {extractedData.receipt_number && (
                      <div className="col-span-2">
                        <span className="text-xs text-gray-400">Nº do Cupom Fiscal</span>
                        <p className="font-semibold text-indigo-700">{extractedData.receipt_number}</p>
                      </div>
                    )}
                    <div>
                      <span className="text-xs text-gray-400">Cliente</span>
                      <p className="font-medium text-gray-900">{extractedData.customer_name || 'N/D'}</p>
                    </div>
                    <div>
                      <span className="text-xs text-gray-400">Data</span>
                      <p className="font-medium text-gray-900">{extractedData.date || 'N/D'}</p>
                    </div>
                    <div>
                      <span className="text-xs text-gray-400">Loja</span>
                      <p className="font-medium text-gray-900">{extractedData.store || 'N/D'}</p>
                    </div>
                    <div>
                      <span className="text-xs text-gray-400">Total</span>
                      <p className="font-medium text-gray-900">
                        {extractedData.total != null ? `R$ ${extractedData.total.toFixed(2)}` : 'N/D'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Matched products */}
                {extractedData.items?.filter((i) => i.matched_keyword).length > 0 && (
                  <div className="bg-white rounded-xl border border-gray-100 p-4">
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                      Produtos que Correspondem ({extractedData.items.filter((i) => i.matched_keyword).length})
                    </h3>
                    <div className="space-y-2">
                      {extractedData.items.filter((i) => i.matched_keyword).map((item, i) => (
                        <div key={i} className="flex items-center justify-between text-sm bg-green-50 rounded-lg px-3 py-2">
                          <div>
                            <p className="font-medium text-gray-900">{item.name}</p>
                            <span className="text-xs text-green-600">{item.matched_keyword}</span>
                          </div>
                          <div className="text-right text-xs text-gray-500">
                            <p>Qtd: {item.quantity ?? '-'}</p>
                            {item.price != null && <p>R$ {item.price.toFixed(2)}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Confirm & Submit */}
                <button
                  onClick={handleSubmit}
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-4 rounded-xl transition text-sm"
                >
                  Confirmar e Enviar para Revisão
                </button>
                <button onClick={handleReset} className="w-full text-sm text-gray-400 hover:text-gray-600 py-1">
                  Cancelar e começar de novo
                </button>
              </div>
            )}

            {/* ── AI FAILED → MANUAL FORM ──────────────────── */}
            {phase === 'ai_failed' && (
              <div className="mb-4 space-y-3">
                <h2 className="text-sm font-semibold text-gray-700">3. Identificação Manual</h2>

                {/* Warning */}
                <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <svg className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <p className="text-sm font-semibold text-amber-800">Não identificamos o produto automaticamente</p>
                    <p className="text-xs text-amber-600 mt-0.5">
                      Preencha os campos abaixo para que o administrador possa validar sua compra.
                    </p>
                  </div>
                </div>

                {/* Manual fields */}
                <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                      Modelo do Óculos <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={manualModel}
                      onChange={(e) => setManualModel(e.target.value)}
                      placeholder="Ex: Ray-Ban RB3025 Aviador"
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                      Quantidade <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={99}
                      value={manualQuantity}
                      onChange={(e) => setManualQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-28 px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition"
                    />
                  </div>
                </div>

                {/* Submit */}
                <button
                  onClick={handleSubmit}
                  disabled={!manualModel.trim() || manualQuantity < 1}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 text-white font-semibold py-3 px-4 rounded-xl transition text-sm"
                >
                  Enviar para Revisão Manual
                </button>
                <button onClick={handleReset} className="w-full text-sm text-gray-400 hover:text-gray-600 py-1">
                  Cancelar e começar de novo
                </button>
              </div>
            )}

            {/* Submitting overlay */}
            {phase === 'submitting' && (
              <div className="mb-4 bg-white rounded-xl border border-gray-100 p-8 text-center">
                <div className="w-12 h-12 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <h3 className="text-base font-semibold text-gray-900 mb-1">Enviando cupom…</h3>
                <p className="text-sm text-gray-500">Aguarde um momento</p>
              </div>
            )}
          </>
        )}
      </main>
      <BarraNavegacao />
    </>
  )
}

export default function ScanPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <ScanPageContent />
    </Suspense>
  )
}

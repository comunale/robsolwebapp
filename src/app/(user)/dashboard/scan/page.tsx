'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useAuth } from '@/lib/hooks/useAuth'
import { createClient } from '@/lib/supabase/client'
import { scanCouponImage } from '@/app/actions/scanCoupon'
import { uploadCouponImage } from '@/lib/storage/imageStorage'
import CabecalhoUsuario from '@/components/user/CabecalhoUsuario'
import BarraNavegacao from '@/components/user/BarraNavegacao'
import LoadingSpinner from '@/components/shared/LoadingSpinner'
import type { Campaign } from '@/types/campaign'
import type { ExtractedData } from '@/types/coupon'

// Locale-agnostic date formatter — avoids SSR/client hydration mismatch
// caused by Node.js not having the pt-BR ICU locale compiled in.
function formatDateBR(dateStr: string): string {
  const d = new Date(dateStr)
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const year = d.getFullYear()
  return `${day}/${month}/${year}`
}

type ScanPhase = 'idle' | 'scanning' | 'ai_success' | 'ai_failed' | 'submitting' | 'done'

export default function ScanPage() {
  const { user, loading: authLoading } = useAuth()
  const supabase = useMemo(() => createClient(), [])
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Campaign & participation data
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [joinedIds, setJoinedIds] = useState<Set<string>>(new Set())
  const [dataReady, setDataReady] = useState(false)
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null)

  // Image state
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)

  // Workflow state machine
  const [phase, setPhase] = useState<ScanPhase>('idle')
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null)

  // Manual fallback fields
  const [manualModel, setManualModel] = useState('')
  const [manualQuantity, setManualQuantity] = useState(1)

  // Feedback
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  useEffect(() => {
    if (!user) return
    let active = true

    const fetchData = async () => {
      const [campaignsRes, participantsRes] = await Promise.all([
        supabase
          .from('campaigns')
          .select('*')
          .eq('is_active', true)
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
    setExtractedData(null)
    setError('')
    setSuccessMessage('')
    setPhase('idle')
    setManualModel('')
    setManualQuantity(1)

    const reader = new FileReader()
    reader.onloadend = () => setImagePreview(reader.result as string)
    reader.readAsDataURL(file)
  }

  const handleScan = async () => {
    if (!imageFile || !selectedCampaign || !imagePreview) {
      setError('Selecione uma campanha e envie uma imagem primeiro')
      return
    }

    setPhase('scanning')
    setError('')

    try {
      // imagePreview is already a data URL ("data:<mime>;base64,<data>")
      // produced by FileReader in handleImageChange — no need to re-encode.
      const base64 = imagePreview.split(',')[1]

      const result = await scanCouponImage(
        base64,
        imageFile.type,
        selectedCampaign.keywords || []
      )

      if (!result.success || !result.data) {
        throw new Error(result.error || 'Falha ao escanear')
      }

      setExtractedData(result.data)

      if (result.data.has_matching_products) {
        setPhase('ai_success')
      } else {
        setPhase('ai_failed')
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Falha ao escanear a imagem')
      setPhase('idle')
    }
  }

  const handleSubmit = async () => {
    if (!imageFile || !selectedCampaign || !user) return

    // Validate manual fields when in manual phase
    if (phase === 'ai_failed') {
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

    try {
      const imageUrl = await uploadCouponImage(imageFile, user.id, selectedCampaign.id)

      const dataToSubmit: ExtractedData = phase === 'ai_failed'
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

      const res = await fetch('/api/coupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaign_id: selectedCampaign.id,
          image_url: imageUrl,
          extracted_data: dataToSubmit,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Falha ao enviar cupom')
      }

      setSuccessMessage(`Cupom enviado com sucesso! Aguardando revisão do administrador.`)
      setPhase('done')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Falha ao enviar cupom')
      // Go back to the right phase on error
      setPhase(extractedData?.has_matching_products ? 'ai_success' : 'ai_failed')
    }
  }

  const handleReset = () => {
    setImageFile(null)
    setImagePreview(null)
    setExtractedData(null)
    setError('')
    setSuccessMessage('')
    setPhase('idle')
    setManualModel('')
    setManualQuantity(1)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const isSelectedJoined = selectedCampaign ? joinedIds.has(selectedCampaign.id) : false
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

        {/* ── DONE STATE ─────────────────────────────────── */}
        {phase === 'done' && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
            <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-base font-bold text-green-800 mb-1">Cupom enviado!</h2>
            <p className="text-sm text-green-700 mb-4">{successMessage}</p>
            <button
              onClick={handleReset}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition"
            >
              Enviar outro cupom
            </button>
          </div>
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
                          setPhase('idle')
                          setError('')
                        }}
                        disabled={phase === 'scanning' || phase === 'submitting'}
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
                  disabled={phase === 'scanning' || phase === 'submitting'}
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

            {/* Scanning overlay */}
            {phase === 'scanning' && (
              <div className="mb-4 bg-white rounded-xl border border-gray-100 p-8 text-center">
                <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <h3 className="text-base font-semibold text-gray-900 mb-1">IA analisando seu cupom…</h3>
                <p className="text-sm text-gray-500">Extraindo produtos e verificando palavras-chave da campanha</p>
              </div>
            )}

            {/* ── AI SUCCESS RESULT ──────────────────────── */}
            {(phase === 'ai_success') && extractedData && (
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

'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/hooks/useAuth'
import { createClient } from '@/lib/supabase/client'
import { scanCouponImage } from '@/app/actions/scanCoupon'
import { uploadCouponImage } from '@/lib/storage/imageStorage'
import CabecalhoUsuario from '@/components/user/CabecalhoUsuario'
import BarraNavegacao from '@/components/user/BarraNavegacao'
import LoadingSpinner from '@/components/shared/LoadingSpinner'
import type { Campaign } from '@/types/campaign'
import type { ExtractedData } from '@/types/coupon'

export default function ScanPage() {
  const { user, profile, loading: authLoading } = useAuth()
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [scanning, setScanning] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    if (!authLoading && !user) router.push('/login')
  }, [user, authLoading, router])

  useEffect(() => {
    const fetchCampaigns = async () => {
      const res = await fetch('/api/campaigns')
      if (res.ok) {
        const data = await res.json()
        const active = (data.campaigns || []).filter(
          (c: Campaign) =>
            c.is_active && new Date(c.end_date) >= new Date()
        )
        setCampaigns(active)
      }
    }
    if (user) fetchCampaigns()
  }, [user])

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setError('Por favor, selecione um arquivo de imagem valido')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('A imagem deve ter no maximo 10MB')
      return
    }

    setImageFile(file)
    setExtractedData(null)
    setError('')
    setSuccess('')

    const reader = new FileReader()
    reader.onloadend = () => setImagePreview(reader.result as string)
    reader.readAsDataURL(file)
  }

  const handleScan = async () => {
    if (!imageFile || !selectedCampaign) {
      setError('Selecione uma campanha e envie uma imagem primeiro')
      return
    }

    setScanning(true)
    setError('')

    try {
      const buffer = await imageFile.arrayBuffer()
      const base64 = btoa(
        new Uint8Array(buffer).reduce(
          (data, byte) => data + String.fromCharCode(byte),
          ''
        )
      )

      const result = await scanCouponImage(
        base64,
        imageFile.type,
        selectedCampaign.keywords || []
      )

      if (!result.success || !result.data) {
        throw new Error(result.error || 'Falha ao escanear')
      }

      setExtractedData(result.data)
    } catch (err: any) {
      setError(err.message || 'Falha ao escanear a imagem')
    } finally {
      setScanning(false)
    }
  }

  const handleSubmit = async () => {
    if (!imageFile || !selectedCampaign || !extractedData || !user) return

    setSubmitting(true)
    setError('')

    try {
      const imageUrl = await uploadCouponImage(
        imageFile,
        user.id,
        selectedCampaign.id
      )

      const res = await fetch('/api/coupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaign_id: selectedCampaign.id,
          image_url: imageUrl,
          extracted_data: extractedData,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Falha ao enviar cupom')
      }

      setSuccess('Cupom enviado com sucesso! Aguardando revisao.')
      setImageFile(null)
      setImagePreview(null)
      setExtractedData(null)
      setSelectedCampaign(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    } catch (err: any) {
      setError(err.message || 'Falha ao enviar cupom')
    } finally {
      setSubmitting(false)
    }
  }

  const resetForm = () => {
    setImageFile(null)
    setImagePreview(null)
    setExtractedData(null)
    setError('')
    setSuccess('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  if (authLoading) return <LoadingSpinner />
  if (!user) return null

  return (
    <>
      <CabecalhoUsuario />
      <main className="max-w-lg mx-auto px-4 py-4 pb-24">
        <h1 className="text-xl font-bold text-gray-900 mb-4">Escanear Cupom</h1>
        <p className="text-sm text-gray-500 mb-6">
          Envie a foto do seu cupom e nossa IA vai extrair os dados automaticamente
        </p>

        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl mb-4 flex items-center justify-between text-sm">
            <span>{success}</span>
            <button onClick={() => setSuccess('')} className="text-green-800 font-medium text-xs">
              Fechar
            </button>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-4 text-sm">
            {error}
          </div>
        )}

        {/* Passo 1: Selecionar Campanha */}
        <div className="mb-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-2">1. Selecione a Campanha</h2>
          {campaigns.length === 0 ? (
            <p className="text-gray-500 text-sm bg-white rounded-xl p-4 border border-gray-100">
              Nenhuma campanha ativa no momento.
            </p>
          ) : (
            <div className="space-y-2">
              {campaigns.map((campaign) => (
                <button
                  key={campaign.id}
                  onClick={() => {
                    setSelectedCampaign(campaign)
                    setExtractedData(null)
                  }}
                  className={`w-full text-left p-3 rounded-xl border-2 transition text-sm ${
                    selectedCampaign?.id === campaign.id
                      ? 'border-indigo-500 bg-indigo-50'
                      : 'border-gray-100 bg-white hover:border-gray-200'
                  }`}
                >
                  <p className="font-semibold text-gray-900">{campaign.title}</p>
                  {campaign.keywords?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {campaign.keywords.map((kw, i) => (
                        <span key={i} className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-xs rounded-full">
                          {kw}
                        </span>
                      ))}
                    </div>
                  )}
                  <p className="text-xs text-gray-500 mt-1.5">
                    Encerra em {new Date(campaign.end_date).toLocaleDateString('pt-BR')}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Passo 2: Enviar Imagem */}
        <div className="mb-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-2">2. Envie o Cupom</h2>
          <label
            htmlFor="receipt-upload"
            className="flex flex-col items-center justify-center w-full h-48 border-2 border-gray-200 border-dashed rounded-xl cursor-pointer bg-white hover:bg-gray-50 transition overflow-hidden"
          >
            {imagePreview ? (
              <img src={imagePreview} alt="Preview do cupom" className="w-full h-full object-contain" />
            ) : (
              <div className="flex flex-col items-center justify-center py-6">
                <svg className="w-10 h-10 mb-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <p className="text-sm text-gray-500">
                  <span className="font-semibold">Toque para tirar foto</span> ou enviar
                </p>
                <p className="text-xs text-gray-400 mt-1">PNG, JPG ate 10MB</p>
              </div>
            )}
            <input
              ref={fileInputRef}
              id="receipt-upload"
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleImageChange}
              className="hidden"
            />
          </label>

          {imagePreview && (
            <button onClick={resetForm} className="mt-2 text-sm text-red-600 hover:text-red-800">
              Remover imagem
            </button>
          )}
        </div>

        {/* Passo 3: Escanear e Enviar */}
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-2">3. Escanear e Enviar</h2>
          <div className="flex gap-2">
            <button
              onClick={handleScan}
              disabled={!selectedCampaign || !imageFile || scanning}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 text-white font-medium py-3 px-4 rounded-xl transition text-sm"
            >
              {scanning ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Escaneando...
                </span>
              ) : (
                'Escanear com IA'
              )}
            </button>

            {extractedData && (
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white font-medium py-3 px-4 rounded-xl transition text-sm"
              >
                {submitting ? 'Enviando...' : 'Enviar para Revisao'}
              </button>
            )}
          </div>
        </div>

        {/* Resultado do Escaneamento */}
        {scanning && (
          <div className="bg-white rounded-xl border border-gray-100 p-8 text-center">
            <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <h3 className="text-base font-semibold text-gray-900 mb-1">IA analisando seu cupom...</h3>
            <p className="text-sm text-gray-500">Extraindo produtos e comparando com palavras-chave</p>
          </div>
        )}

        {!scanning && !extractedData && !success && (
          <div className="bg-white rounded-xl border border-gray-100 p-8 text-center">
            <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <h3 className="text-sm font-semibold text-gray-400 mb-1">Dados Extraidos</h3>
            <p className="text-xs text-gray-400">Selecione uma campanha, envie o cupom e clique em "Escanear com IA"</p>
          </div>
        )}

        {!scanning && extractedData && (
          <div className="space-y-3">
            {/* Status de Match */}
            <div className={`rounded-xl p-4 ${
              extractedData.has_matching_products
                ? 'bg-green-50 border border-green-200'
                : 'bg-yellow-50 border border-yellow-200'
            }`}>
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  extractedData.has_matching_products ? 'bg-green-200' : 'bg-yellow-200'
                }`}>
                  {extractedData.has_matching_products ? (
                    <svg className="w-5 h-5 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 text-yellow-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                </div>
                <div>
                  <p className={`text-sm font-semibold ${
                    extractedData.has_matching_products ? 'text-green-800' : 'text-yellow-800'
                  }`}>
                    {extractedData.has_matching_products
                      ? 'Produtos correspondentes encontrados!'
                      : 'Nenhum produto correspondente'}
                  </p>
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

            {/* Info do Cupom */}
            <div className="bg-white rounded-xl border border-gray-100 p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Dados do Cupom</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-gray-500 text-xs">Cliente</span>
                  <p className="font-medium text-gray-900">{extractedData.customer_name || 'N/D'}</p>
                </div>
                <div>
                  <span className="text-gray-500 text-xs">Data</span>
                  <p className="font-medium text-gray-900">{extractedData.date || 'N/D'}</p>
                </div>
                <div>
                  <span className="text-gray-500 text-xs">Loja</span>
                  <p className="font-medium text-gray-900">{extractedData.store || 'N/D'}</p>
                </div>
                <div>
                  <span className="text-gray-500 text-xs">Total</span>
                  <p className="font-medium text-gray-900">
                    {extractedData.total != null ? `R$ ${extractedData.total.toFixed(2)}` : 'N/D'}
                  </p>
                </div>
              </div>
            </div>

            {/* Tabela de Itens */}
            <div className="bg-white rounded-xl border border-gray-100 p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">
                Produtos Encontrados ({extractedData.items?.length || 0})
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-2 pr-3 text-gray-600 font-medium text-xs">Produto</th>
                      <th className="text-center py-2 px-2 text-gray-600 font-medium text-xs">Qtd</th>
                      <th className="text-right py-2 px-2 text-gray-600 font-medium text-xs">Preco</th>
                      <th className="text-center py-2 pl-2 text-gray-600 font-medium text-xs">Match</th>
                    </tr>
                  </thead>
                  <tbody>
                    {extractedData.items?.map((item, i) => (
                      <tr key={i} className={`border-b border-gray-100 ${item.matched_keyword ? 'bg-green-50' : ''}`}>
                        <td className="py-2 pr-3">
                          <p className="font-medium text-gray-900 text-xs">{item.name}</p>
                          {item.matched_keyword && (
                            <span className="text-[10px] text-green-600">Match: {item.matched_keyword}</span>
                          )}
                        </td>
                        <td className="text-center py-2 px-2 text-gray-700 text-xs">{item.quantity ?? '-'}</td>
                        <td className="text-right py-2 px-2 text-gray-700 text-xs">
                          {item.price != null ? `R$ ${item.price.toFixed(2)}` : '-'}
                        </td>
                        <td className="text-center py-2 pl-2">
                          {item.matched_keyword ? (
                            <span className="inline-block w-5 h-5 bg-green-200 text-green-800 rounded-full leading-5 text-xs font-bold">
                              &#10003;
                            </span>
                          ) : (
                            <span className="inline-block w-5 h-5 bg-gray-100 text-gray-400 rounded-full leading-5 text-xs">
                              -
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>
      <BarraNavegacao />
    </>
  )
}

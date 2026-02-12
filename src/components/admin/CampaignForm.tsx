'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/hooks/useAuth'
import { uploadCampaignBanner } from '@/lib/storage/imageStorage'
import AdminHeader from './AdminHeader'
import LoadingSpinner from '@/components/shared/LoadingSpinner'
import type { GoalConfig } from '@/types/goal'

export default function CampaignForm() {
  const { user, profile, loading: authLoading } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [keywords, setKeywords] = useState<string[]>([])
  const [keywordInput, setKeywordInput] = useState('')
  const [bannerFile, setBannerFile] = useState<File | null>(null)
  const [bannerPreview, setBannerPreview] = useState<string | null>(null)

  // Campaign Settings
  const [pointsPerCoupon, setPointsPerCoupon] = useState(10)
  const [hasDraws, setHasDraws] = useState(false)
  const [drawType, setDrawType] = useState<'manual' | 'random'>('random')
  const [goals, setGoals] = useState<GoalConfig[]>([])

  const addGoal = () => {
    setGoals([...goals, {
      id: crypto.randomUUID(),
      label: '',
      period: 'weekly',
      metric: 'approved_coupons',
      target: 5,
      bonus_points: 10,
      lucky_numbers: 1,
    }])
  }

  const updateGoal = (index: number, field: keyof GoalConfig, value: string | number) => {
    const updated = [...goals]
    updated[index] = { ...updated[index], [field]: value }
    setGoals(updated)
  }

  const removeGoal = (index: number) => {
    setGoals(goals.filter((_, i) => i !== index))
  }

  const handleBannerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (!file.type.startsWith('image/')) {
        setError('Por favor, selecione um arquivo de imagem valido')
        return
      }
      if (file.size > 5 * 1024 * 1024) {
        setError('O tamanho da imagem deve ser menor que 5MB')
        return
      }
      setBannerFile(file)
      const reader = new FileReader()
      reader.onloadend = () => setBannerPreview(reader.result as string)
      reader.readAsDataURL(file)
      setError('')
    }
  }

  const addKeyword = () => {
    const kw = keywordInput.trim()
    if (kw && !keywords.includes(kw)) {
      setKeywords([...keywords, kw])
      setKeywordInput('')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (new Date(endDate) < new Date(startDate)) {
        throw new Error('A data final deve ser posterior a data inicial')
      }

      const tempCampaignId = crypto.randomUUID()
      let bannerUrl: string | null = null

      if (bannerFile) {
        try {
          bannerUrl = await uploadCampaignBanner(bannerFile, tempCampaignId)
        } catch (uploadErr: any) {
          const msg = uploadErr.message || ''
          if (msg.includes('Bucket not found') || msg.includes('not found')) {
            throw new Error('Bucket de armazenamento "incentive-campaigns" nao encontrado. Crie-o no painel do Supabase.')
          }
          throw new Error(`Falha ao enviar banner: ${msg}`)
        }
      }

      const response = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description: description || null,
          start_date: startDate,
          end_date: endDate,
          is_active: isActive,
          banner_url: bannerUrl,
          keywords,
          settings: {
            points_per_coupon: pointsPerCoupon,
            has_draws: hasDraws,
            draw_type: hasDraws ? drawType : null,
            goals: goals.filter(g => g.label.trim()),
          },
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Falha ao criar campanha')
      }

      router.push('/admin/campaigns')
    } catch (err: any) {
      setError(err.message || 'Falha ao criar campanha')
      setLoading(false)
    }
  }

  if (authLoading) return <LoadingSpinner />
  if (!user || profile?.role !== 'admin') return null

  return (
    <>
      <AdminHeader title="Nova Campanha" subtitle="Configure uma nova campanha de incentivo" />

      <div className="p-8 max-w-3xl">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Title */}
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                Titulo da Campanha <span className="text-red-500">*</span>
              </label>
              <input
                id="title"
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition"
                placeholder="Ex.: Promocao de Verao 2026"
              />
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                Descricao
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition"
                placeholder="Descreva a campanha e seus objetivos..."
              />
            </div>

            {/* Dates */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-2">
                  Data de Inicio <span className="text-red-500">*</span>
                </label>
                <input
                  id="startDate"
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition"
                />
              </div>
              <div>
                <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-2">
                  Data de Fim <span className="text-red-500">*</span>
                </label>
                <input
                  id="endDate"
                  type="date"
                  required
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition"
                />
              </div>
            </div>

            {/* Active Status */}
            <div className="flex items-center">
              <input
                id="isActive"
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
              />
              <label htmlFor="isActive" className="ml-2 text-sm text-gray-700">
                Ativar campanha imediatamente
              </label>
            </div>

            {/* Target Keywords */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Palavras-chave (Produtos Elegiveis)
              </label>
              <p className="text-xs text-gray-500 mb-2">
                Adicione nomes de produtos ou marcas que se qualificam para esta campanha. A IA ira compara-los com os itens do cupom.
              </p>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={keywordInput}
                  onChange={(e) => setKeywordInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      addKeyword()
                    }
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition"
                  placeholder="Ex.: Coca-Cola, Cerveja, Heineken..."
                />
                <button
                  type="button"
                  onClick={addKeyword}
                  className="px-4 py-2 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 rounded-lg font-medium transition"
                >
                  Adicionar
                </button>
              </div>
              {keywords.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {keywords.map((kw, i) => (
                    <span key={i} className="inline-flex items-center gap-1 px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm">
                      {kw}
                      <button type="button" onClick={() => setKeywords(keywords.filter((_, j) => j !== i))} className="hover:text-red-600">
                        &times;
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Campaign Settings */}
            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Configuracoes da Campanha</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pontos por Cupom</label>
                  <input
                    type="number"
                    min={1}
                    value={pointsPerCoupon}
                    onChange={(e) => setPointsPerCoupon(parseInt(e.target.value) || 10)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition"
                  />
                  <p className="text-xs text-gray-500 mt-1">Pontos padrao concedidos por cupom aprovado</p>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center">
                    <input
                      id="hasDraws"
                      type="checkbox"
                      checked={hasDraws}
                      onChange={(e) => setHasDraws(e.target.checked)}
                      className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                    />
                    <label htmlFor="hasDraws" className="ml-2 text-sm text-gray-700">Habilitar Sorteios</label>
                  </div>
                  {hasDraws && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Sorteio</label>
                      <select
                        value={drawType}
                        onChange={(e) => setDrawType(e.target.value as 'manual' | 'random')}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-white"
                      >
                        <option value="random">Aleatorio</option>
                        <option value="manual">Manual</option>
                      </select>
                    </div>
                  )}
                </div>
              </div>

              {/* Goals */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-medium text-gray-700">Metas</label>
                  <button
                    type="button"
                    onClick={addGoal}
                    className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
                  >
                    + Adicionar Meta
                  </button>
                </div>
                <p className="text-xs text-gray-500 mb-3">
                  Defina metas que concedem pontos bonus e numeros da sorte ao serem atingidas.
                </p>
                {goals.map((goal, i) => (
                  <div key={goal.id} className="border border-gray-200 rounded-lg p-4 mb-3 bg-gray-50">
                    <div className="flex justify-between items-start mb-3">
                      <span className="text-xs font-medium text-gray-500">Meta {i + 1}</span>
                      <button type="button" onClick={() => removeGoal(i)} className="text-red-500 hover:text-red-700 text-sm">Remover</button>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      <div className="col-span-2 md:col-span-1">
                        <label className="block text-xs text-gray-600 mb-1">Nome</label>
                        <input
                          type="text"
                          value={goal.label}
                          onChange={(e) => updateGoal(i, 'label', e.target.value)}
                          className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                          placeholder="Ex.: Meta Semanal"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Periodo</label>
                        <select
                          value={goal.period}
                          onChange={(e) => updateGoal(i, 'period', e.target.value)}
                          className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-white"
                        >
                          <option value="weekly">Semanal</option>
                          <option value="monthly">Mensal</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Alvo (cupons)</label>
                        <input
                          type="number"
                          min={1}
                          value={goal.target}
                          onChange={(e) => updateGoal(i, 'target', parseInt(e.target.value) || 1)}
                          className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Pontos Bonus</label>
                        <input
                          type="number"
                          min={0}
                          value={goal.bonus_points}
                          onChange={(e) => updateGoal(i, 'bonus_points', parseInt(e.target.value) || 0)}
                          className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Numeros da Sorte</label>
                        <input
                          type="number"
                          min={0}
                          value={goal.lucky_numbers}
                          onChange={(e) => updateGoal(i, 'lucky_numbers', parseInt(e.target.value) || 0)}
                          className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Banner Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Banner da Campanha</label>
              <div className="flex items-center justify-center w-full">
                <label
                  htmlFor="banner-upload"
                  className="flex flex-col items-center justify-center w-full h-64 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition"
                >
                  {bannerPreview ? (
                    <div className="relative w-full h-full">
                      <img src={bannerPreview} alt="Preview do banner" className="w-full h-full object-cover rounded-lg" />
                      <button
                        type="button"
                        onClick={(e) => { e.preventDefault(); setBannerFile(null); setBannerPreview(null) }}
                        className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-2 transition"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <svg className="w-12 h-12 mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      <p className="mb-2 text-sm text-gray-500"><span className="font-semibold">Clique para enviar</span> ou arraste e solte</p>
                      <p className="text-xs text-gray-500">PNG, JPG, GIF ate 5MB</p>
                    </div>
                  )}
                  <input id="banner-upload" type="file" accept="image/*" onChange={handleBannerChange} className="hidden" />
                </label>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{error}</div>
            )}

            {/* Submit */}
            <div className="flex gap-4 pt-6">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-medium py-3 px-6 rounded-lg transition"
              >
                {loading ? 'Criando Campanha...' : 'Criar Campanha'}
              </button>
              <Link
                href="/admin/campaigns"
                className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium transition text-center"
              >
                Cancelar
              </Link>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}

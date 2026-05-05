'use client'

import { useState, useEffect, useCallback } from 'react'
import AdminHeader from './AdminHeader'
import { uploadPrizeImage, uploadPrizeImageHorizontal } from '@/lib/storage/imageStorage'
import { compressImageForUpload } from '@/lib/images/compressImage'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
interface Prize {
  id: string
  title: string
  points_cost: number | null
  image_url: string | null
  image_horizontal: string | null
  images: string[]
  pdf_url: string | null
  description: string | null
  is_active: boolean
  campaign_id: string | null
  created_at: string
}

interface Campaign {
  id: string
  title: string
}

interface SelectionProfile {
  id: string
  full_name: string
  email: string
  whatsapp: string | null
  total_points: number
  allocated_points: number
}

interface Selection {
  id: string
  status: 'pending' | 'fulfilled' | 'cancelled'
  created_at: string
  profiles: SelectionProfile
  prizes_catalog: { id: string; title: string; points_cost: number | null; image_url: string | null }
  campaigns: { title: string } | null
}

type Tab = 'catalogo' | 'fechamento'

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
const STATUS_LABEL: Record<string, string> = {
  pending: 'Pendente',
  fulfilled: 'Entregue',
  cancelled: 'Cancelado',
}
const STATUS_CLASS: Record<string, string> = {
  pending:   'bg-yellow-100 text-yellow-800',
  fulfilled: 'bg-green-100  text-green-800',
  cancelled: 'bg-gray-100   text-gray-500',
}

function exportCsv(selections: Selection[]) {
  const pending = selections.filter((s) => s.status === 'pending')
  const header = 'Nome,Email,WhatsApp,Prêmio,Pontos,Campanha,Data Seleção'
  const rows = pending.map((s) =>
    [
      s.profiles.full_name,
      s.profiles.email,
      s.profiles.whatsapp ?? '',
      s.prizes_catalog.title,
      s.prizes_catalog.points_cost,
      s.campaigns?.title ?? '',
      new Date(s.created_at).toLocaleDateString('pt-BR'),
    ]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(','),
  )
  const csv = [header, ...rows].join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `fechamento-premios-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// ─────────────────────────────────────────────────────────────────────────────
// Prize Form (add / edit)
// ─────────────────────────────────────────────────────────────────────────────
const EMPTY_FORM = { title: '', points_cost: '', image_url: '', image_horizontal: '', images: [] as string[], pdf_url: '', description: '', is_active: true, campaign_id: '' }

function PrizeForm({
  initial,
  campaigns,
  onSave,
  onCancel,
  saving,
}: {
  initial?: Partial<Prize>
  campaigns: Campaign[]
  onSave: (data: typeof EMPTY_FORM) => void
  onCancel: () => void
  saving: boolean
}) {
  const [form, setForm] = useState({
    title: initial?.title ?? '',
    points_cost: initial?.points_cost != null ? String(initial.points_cost) : '',
    image_url: initial?.image_url ?? '',
    image_horizontal: initial?.image_horizontal ?? '',
    images: initial?.images ?? [] as string[],
    pdf_url: initial?.pdf_url ?? '',
    description: initial?.description ?? '',
    is_active: initial?.is_active ?? true,
    campaign_id: initial?.campaign_id ?? '',
  })
  const [newImageUrl, setNewImageUrl] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(initial?.image_url ?? null)
  const [imageHorizFile, setImageHorizFile] = useState<File | null>(null)
  const [imageHorizPreview, setImageHorizPreview] = useState<string | null>(initial?.image_horizontal ?? null)
  const [uploading, setUploading] = useState(false)

  const set = (k: string, v: string | boolean) => setForm((p) => ({ ...p, [k]: v }))

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { alert('Selecione um arquivo de imagem'); return }
    if (file.size > 5 * 1024 * 1024) { alert('Imagem deve ter menos de 5MB'); return }
    setImageFile(file)
    const reader = new FileReader()
    reader.onloadend = () => setImagePreview(reader.result as string)
    reader.readAsDataURL(file)
  }

  const handleImageHorizChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { alert('Selecione um arquivo de imagem'); return }
    if (file.size > 5 * 1024 * 1024) { alert('Imagem deve ter menos de 5MB'); return }
    setImageHorizFile(file)
    const reader = new FileReader()
    reader.onloadend = () => setImageHorizPreview(reader.result as string)
    reader.readAsDataURL(file)
  }

  const handleSave = async () => {
    if (!form.title) return
    setUploading(true)
    try {
      const uploadId = initial?.id ?? crypto.randomUUID()
      let imageUrl = form.image_url
      let imageHorizUrl = form.image_horizontal
      if (imageFile) {
        const compressedImage = await compressImageForUpload(imageFile)
        imageUrl = await uploadPrizeImage(compressedImage, uploadId)
      }
      if (imageHorizFile) {
        const compressedImageHoriz = await compressImageForUpload(imageHorizFile)
        imageHorizUrl = await uploadPrizeImageHorizontal(compressedImageHoriz, uploadId)
      }
      onSave({ ...form, image_url: imageUrl, image_horizontal: imageHorizUrl })
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Erro ao enviar imagem')
    } finally {
      setUploading(false)
    }
  }

  const isBusy = saving || uploading

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">Título do Prêmio *</label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => set('title', e.target.value)}
            placeholder="Ex: Kit Maquiagem Sabrina Sato"
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">
            Pontos Necessários <span className="font-normal text-gray-400">(deixe vazio para sorteio)</span>
          </label>
          <input
            type="number"
            min={1}
            value={form.points_cost}
            onChange={(e) => set('points_cost', e.target.value)}
            placeholder="Ex: 10"
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
          />
        </div>
      </div>

      {/* Image uploads — square + horizontal */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-0.5">Imagem Quadrada (card mobile)</label>
          <p className="text-[10px] text-gray-400 mb-1">Recomendado: 800 × 800 px · máx. 5 MB</p>
          <label
            htmlFor="prize-image-upload"
            className="flex items-center justify-center w-full h-28 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition overflow-hidden relative"
          >
            {imagePreview ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imagePreview} alt="preview" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={(e) => { e.preventDefault(); setImageFile(null); setImagePreview(null); set('image_url', '') }}
                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600 transition"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </>
            ) : (
              <div className="flex flex-col items-center text-gray-400">
                <svg className="w-7 h-7 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="text-[10px]">Clique para enviar</span>
              </div>
            )}
          </label>
          <input id="prize-image-upload" type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-0.5">Imagem Horizontal (detalhes)</label>
          <p className="text-[10px] text-gray-400 mb-1">Recomendado: 1200 × 600 px · máx. 5 MB</p>
          <label
            htmlFor="prize-image-horiz-upload"
            className="flex items-center justify-center w-full h-28 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition overflow-hidden relative"
          >
            {imageHorizPreview ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imageHorizPreview} alt="preview horizontal" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={(e) => { e.preventDefault(); setImageHorizFile(null); setImageHorizPreview(null); set('image_horizontal', '') }}
                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600 transition"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </>
            ) : (
              <div className="flex flex-col items-center text-gray-400">
                <svg className="w-7 h-7 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="text-[10px]">Clique para enviar</span>
              </div>
            )}
          </label>
          <input id="prize-image-horiz-upload" type="file" accept="image/*" onChange={handleImageHorizChange} className="hidden" />
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-700 mb-1">Descrição</label>
        <textarea
          rows={2}
          value={form.description}
          onChange={(e) => set('description', e.target.value)}
          placeholder="Detalhes do prêmio..."
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
        />
      </div>

      {/* PDF URL */}
      <div>
        <label className="block text-xs font-semibold text-gray-700 mb-1">
          URL do Catálogo PDF <span className="font-normal text-gray-400">(opcional)</span>
        </label>
        <input
          type="url"
          value={form.pdf_url}
          onChange={(e) => set('pdf_url', e.target.value)}
          placeholder="https://..."
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
        />
        <p className="text-[10px] text-gray-400 mt-0.5">Aparece como botão &quot;Baixar Catálogo&quot; na página do prêmio</p>
      </div>

      {/* Additional images gallery (up to 30 URLs) */}
      <div>
        <label className="block text-xs font-semibold text-gray-700 mb-1">
          Galeria de Imagens <span className="font-normal text-gray-400">(até 30 URLs)</span>
        </label>
        <div className="flex gap-2 mb-2">
          <input
            type="url"
            value={newImageUrl}
            onChange={(e) => setNewImageUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                const url = newImageUrl.trim()
                if (url && form.images.length < 30 && !form.images.includes(url)) {
                  setForm((p) => ({ ...p, images: [...p.images, url] }))
                  setNewImageUrl('')
                }
              }
            }}
            placeholder="Cole a URL da imagem e pressione Enter"
            className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
          />
          <button
            type="button"
            disabled={!newImageUrl.trim() || form.images.length >= 30}
            onClick={() => {
              const url = newImageUrl.trim()
              if (url && form.images.length < 30 && !form.images.includes(url)) {
                setForm((p) => ({ ...p, images: [...p.images, url] }))
                setNewImageUrl('')
              }
            }}
            className="px-3 py-2 bg-indigo-100 hover:bg-indigo-200 disabled:opacity-40 text-indigo-700 text-sm font-medium rounded-lg transition"
          >
            Adicionar
          </button>
        </div>
        {form.images.length > 0 && (
          <div className="grid grid-cols-4 gap-2">
            {form.images.map((src, i) => (
              <div key={i} className="relative group">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="" className="w-full h-16 object-cover rounded-lg border border-gray-200" />
                <button
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, images: p.images.filter((_, j) => j !== i) }))}
                  className="absolute top-0.5 right-0.5 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
        {form.images.length === 0 && (
          <p className="text-xs text-gray-400">Nenhuma imagem de galeria adicionada</p>
        )}
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-700 mb-1">
          Campanha vinculada <span className="font-normal text-gray-400">(opcional — deixe vazio para prêmio global)</span>
        </label>
        <select
          value={form.campaign_id}
          onChange={(e) => set('campaign_id', e.target.value)}
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
        >
          <option value="">🌐 Global — visível para todos</option>
          {campaigns.map((c) => (
            <option key={c.id} value={c.id}>{c.title}</option>
          ))}
        </select>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="is_active"
          checked={form.is_active}
          onChange={(e) => set('is_active', e.target.checked)}
          className="rounded border-gray-300 text-indigo-600"
        />
        <label htmlFor="is_active" className="text-sm text-gray-700">Prêmio ativo (visível na loja)</label>
      </div>
      <div className="flex gap-2 pt-1">
        <button
          onClick={() => void handleSave()}
          disabled={isBusy || !form.title}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white text-sm font-semibold rounded-lg transition"
        >
          {isBusy ? 'Salvando...' : 'Salvar Prêmio'}
        </button>
        <button
          onClick={onCancel}
          className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg transition"
        >
          Cancelar
        </button>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────
export default function PrizeCatalogManager() {
  const [tab, setTab] = useState<Tab>('catalogo')
  const [prizes, setPrizes] = useState<Prize[]>([])
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [selections, setSelections] = useState<Selection[]>([])
  const [loadingPrizes, setLoadingPrizes] = useState(true)
  const [loadingSelections, setLoadingSelections] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingPrize, setEditingPrize] = useState<Prize | null>(null)
  const [saving, setSaving] = useState(false)
  const [fulfilling, setFulfilling] = useState<Record<string, boolean>>({})
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'fulfilled' | 'cancelled'>('pending')

  const fetchPrizes = useCallback(async () => {
    setLoadingPrizes(true)
    try {
      const [prizeRes, campaignRes] = await Promise.all([
        fetch('/api/admin/prizes'),
        fetch('/api/campaigns'),
      ])
      const [prizeData, campaignData] = await Promise.all([prizeRes.json(), campaignRes.json()])
      setPrizes(prizeData.prizes ?? [])
      setCampaigns(campaignData.campaigns ?? [])
    } finally {
      setLoadingPrizes(false)
    }
  }, [])

  const fetchSelections = useCallback(async () => {
    setLoadingSelections(true)
    try {
      const res = await fetch('/api/admin/prizes/selections')
      const d = await res.json()
      setSelections(d.selections ?? [])
    } finally {
      setLoadingSelections(false)
    }
  }, [])

  useEffect(() => { fetchPrizes() }, [fetchPrizes])
  useEffect(() => {
    if (tab === 'fechamento') fetchSelections()
  }, [tab, fetchSelections])

  const handleSavePrize = async (form: typeof EMPTY_FORM) => {
    setSaving(true)
    try {
      const url = editingPrize ? `/api/admin/prizes/${editingPrize.id}` : '/api/admin/prizes'
      const method = editingPrize ? 'PATCH' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          points_cost: form.points_cost !== '' ? Number(form.points_cost) : null,
        }),
      })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error ?? 'Erro ao salvar')
      }
      await fetchPrizes()
      setShowForm(false)
      setEditingPrize(null)
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Erro')
    } finally {
      setSaving(false)
    }
  }

  const handleToggleActive = async (prize: Prize) => {
    const method = prize.is_active ? 'DELETE' : 'PATCH'
    const res = await fetch(`/api/admin/prizes/${prize.id}`, {
      method: prize.is_active ? 'DELETE' : 'PATCH',
      ...(method === 'PATCH' ? {
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: true }),
      } : {}),
    })
    if (!res.ok) {
      const d = await res.json()
      alert(d.error ?? 'Erro')
      return
    }
    await fetchPrizes()
  }

  const handleFulfill = async (selectionId: string, newStatus: 'fulfilled' | 'cancelled') => {
    setFulfilling((p) => ({ ...p, [selectionId]: true }))
    try {
      const res = await fetch(`/api/admin/prizes/selections/${selectionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error ?? 'Erro')
      }
      await fetchSelections()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Erro')
    } finally {
      setFulfilling((p) => ({ ...p, [selectionId]: false }))
    }
  }

  const filteredSelections = filterStatus === 'all'
    ? selections
    : selections.filter((s) => s.status === filterStatus)

  // Group pending by prize for the fulfillment summary
  const pendingByPrize = selections
    .filter((s) => s.status === 'pending')
    .reduce<Record<string, { title: string; count: number; points: number | null }>>((acc, s) => {
      const key = s.prizes_catalog.id
      if (!acc[key]) acc[key] = { title: s.prizes_catalog.title, count: 0, points: s.prizes_catalog.points_cost }
      acc[key].count++
      return acc
    }, {})

  return (
    <>
      <AdminHeader
        title="Catálogo de Prêmios"
        subtitle="Gerencie o catálogo de prêmios e processe as seleções dos consultores"
      />

      <div className="p-6 lg:p-8">
        {/* Tab bar */}
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6 w-fit">
          {[
            { id: 'catalogo' as Tab,   label: 'Catálogo',      icon: '🎁' },
            { id: 'fechamento' as Tab, label: 'Fechamento',    icon: '📋' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
                tab === t.id
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <span>{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── TAB: CATÁLOGO ──────────────────────────────────────────────────── */}
        {tab === 'catalogo' && (
          <div className="space-y-5">
            {!showForm && !editingPrize && (
              <button
                onClick={() => setShowForm(true)}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg transition"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                Novo Prêmio
              </button>
            )}

            {(showForm && !editingPrize) && (
              <PrizeForm
                campaigns={campaigns}
                onSave={handleSavePrize}
                onCancel={() => setShowForm(false)}
                saving={saving}
              />
            )}

            {loadingPrizes ? (
              <div className="text-sm text-gray-400 py-8 text-center">Carregando...</div>
            ) : prizes.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <div className="text-4xl mb-3">🎁</div>
                <p className="font-medium">Nenhum prêmio cadastrado ainda</p>
                <p className="text-sm mt-1">Clique em &quot;Novo Prêmio&quot; para começar</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {prizes.map((prize) => (
                  <div key={prize.id}>
                    {editingPrize?.id === prize.id ? (
                      <PrizeForm
                        initial={prize}
                        campaigns={campaigns}
                        onSave={handleSavePrize}
                        onCancel={() => setEditingPrize(null)}
                        saving={saving}
                      />
                    ) : (
                      <div className={`bg-white rounded-xl border shadow-sm overflow-hidden ${!prize.is_active ? 'opacity-50' : 'border-gray-200'}`}>
                        {prize.image_url ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={prize.image_url}
                            alt={prize.title}
                            className="w-full h-36 object-cover"
                          />
                        ) : (
                          <div className="w-full h-36 bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center">
                            <span className="text-4xl">🎁</span>
                          </div>
                        )}
                        <div className="p-4">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <h3 className="text-sm font-semibold text-gray-900 leading-tight">{prize.title}</h3>
                            <span className="flex-shrink-0 text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full">
                              {prize.points_cost != null ? `${prize.points_cost} pts` : '🎲 Sorteio'}
                            </span>
                          </div>
                          {prize.description && (
                            <p className="text-xs text-gray-500 mt-1 line-clamp-2">{prize.description}</p>
                          )}
                          <div className="flex gap-2 mt-3">
                            <button
                              onClick={() => { setEditingPrize(prize); setShowForm(false) }}
                              className="flex-1 text-xs font-medium py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 transition text-gray-700"
                            >
                              Editar
                            </button>
                            <button
                              onClick={() => handleToggleActive(prize)}
                              className={`flex-1 text-xs font-medium py-1.5 rounded-lg transition ${
                                prize.is_active
                                  ? 'border border-red-200 text-red-600 hover:bg-red-50'
                                  : 'border border-green-200 text-green-700 hover:bg-green-50'
                              }`}
                            >
                              {prize.is_active ? 'Desativar' : 'Reativar'}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── TAB: FECHAMENTO ───────────────────────────────────────────────── */}
        {tab === 'fechamento' && (
          <div className="space-y-5">
            {/* Summary cards */}
            {Object.keys(pendingByPrize).length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-2">
                {Object.values(pendingByPrize).map((p) => (
                  <div key={p.title} className="bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3">
                    <p className="text-xs font-semibold text-indigo-700 truncate">{p.title}</p>
                    <p className="text-2xl font-black text-indigo-900 mt-0.5">{p.count}</p>
                    <p className="text-xs text-indigo-500">{p.points != null ? `${p.points} pts/unid` : '🎲 Sorteio'}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Actions bar */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
                {(['pending', 'all', 'fulfilled', 'cancelled'] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setFilterStatus(s)}
                    className={`px-3 py-1 rounded-md text-xs font-medium transition ${
                      filterStatus === s ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {s === 'all' ? 'Todos' : STATUS_LABEL[s]}
                    {s === 'pending' && selections.filter(x => x.status === 'pending').length > 0 && (
                      <span className="ml-1.5 bg-yellow-400 text-yellow-900 rounded-full px-1.5 text-xs font-bold">
                        {selections.filter(x => x.status === 'pending').length}
                      </span>
                    )}
                  </button>
                ))}
              </div>
              <button
                onClick={() => exportCsv(selections)}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg transition"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
                Exportar CSV Pendentes
              </button>
            </div>

            {loadingSelections ? (
              <div className="text-sm text-gray-400 py-8 text-center">Carregando seleções...</div>
            ) : filteredSelections.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <div className="text-4xl mb-3">📋</div>
                <p className="font-medium">Nenhuma seleção encontrada</p>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Consultor</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Prêmio</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Pontos</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Campanha</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Data</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredSelections.map((sel) => (
                      <tr key={sel.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-900">{sel.profiles.full_name}</p>
                          <p className="text-xs text-gray-400">{sel.profiles.email}</p>
                          {sel.profiles.whatsapp && (
                            <p className="text-xs text-gray-400">{sel.profiles.whatsapp}</p>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-900">{sel.prizes_catalog.title}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-bold text-indigo-700">
                            {sel.prizes_catalog.points_cost != null ? sel.prizes_catalog.points_cost : '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-600 text-xs">
                          {sel.campaigns?.title ?? '—'}
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                          {new Date(sel.created_at).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_CLASS[sel.status]}`}>
                            {STATUS_LABEL[sel.status]}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {sel.status === 'pending' && (
                            <div className="flex gap-1">
                              <button
                                onClick={() => handleFulfill(sel.id, 'fulfilled')}
                                disabled={!!fulfilling[sel.id]}
                                className="px-2 py-1 text-xs font-semibold bg-green-600 hover:bg-green-700 text-white rounded-md disabled:opacity-50 transition"
                              >
                                {fulfilling[sel.id] ? '...' : 'Entregar'}
                              </button>
                              <button
                                onClick={() => handleFulfill(sel.id, 'cancelled')}
                                disabled={!!fulfilling[sel.id]}
                                className="px-2 py-1 text-xs font-medium border border-red-200 text-red-600 hover:bg-red-50 rounded-md disabled:opacity-50 transition"
                              >
                                Cancelar
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  )
}

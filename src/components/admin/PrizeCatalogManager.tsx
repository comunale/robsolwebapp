'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import AdminHeader from './AdminHeader'
import { uploadPrizeGalleryImage, uploadPrizeImage, uploadPrizeImageHorizontal } from '@/lib/storage/imageStorage'
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
  onSave: (data: typeof EMPTY_FORM) => Promise<void>
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
  const [uploadId] = useState(initial?.id ?? crypto.randomUUID())
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(initial?.image_url ?? null)
  const [imageHorizFile, setImageHorizFile] = useState<File | null>(null)
  const [imageHorizPreview, setImageHorizPreview] = useState<string | null>(initial?.image_horizontal ?? null)
  const [uploading, setUploading] = useState(false)
  const [galleryUploading, setGalleryUploading] = useState(false)
  const [galleryMessage, setGalleryMessage] = useState('')
  const [galleryError, setGalleryError] = useState('')
  const [formError, setFormError] = useState('')
  const [pendingGalleryUploads, setPendingGalleryUploads] = useState<string[]>([])
  const galleryInputRef = useRef<HTMLInputElement>(null)

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

  const deletePrizeStorageFiles = async (urls: string[]) => {
    if (urls.length === 0) return
    const res = await fetch('/api/admin/storage-maintenance/prize-images', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirm: true, files: urls }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.error ?? 'Erro ao remover imagem do storage')
  }

  const handleGalleryFiles = async (files: FileList | File[]) => {
    setGalleryError('')
    setGalleryMessage('')
    const selectedFiles = Array.from(files)
    if (selectedFiles.length === 0) return

    const availableSlots = 30 - form.images.length
    if (availableSlots <= 0) {
      setGalleryError('A galeria ja possui o limite de 30 imagens.')
      return
    }

    const imageFiles = selectedFiles.filter((file) => file.type.startsWith('image/')).slice(0, availableSlots)
    if (imageFiles.length === 0) {
      setGalleryError('Selecione apenas arquivos de imagem.')
      return
    }
    if (selectedFiles.length > availableSlots) {
      setGalleryMessage(`Apenas ${availableSlots} imagem(ns) serao adicionadas para respeitar o limite de 30.`)
    }

    setGalleryUploading(true)
    try {
      const uploadedUrls: string[] = []
      for (const [index, file] of imageFiles.entries()) {
        setGalleryMessage(`Enviando ${index + 1} de ${imageFiles.length}: ${file.name}`)
        console.log(`[Gallery] file ${index + 1}/${imageFiles.length}:`, file.name, file.size + 'B', file.type)

        let fileToUpload: File
        try {
          fileToUpload = await compressImageForUpload(file)
          console.log('[Gallery] compression OK →', fileToUpload.size + 'B')
        } catch (compressErr) {
          console.warn('[Gallery] compression FAILED, uploading original:', compressErr)
          setGalleryMessage(`Compressão falhou para ${file.name} — enviando original...`)
          fileToUpload = file
        }

        console.log('[Gallery] calling uploadPrizeGalleryImage, uploadId:', uploadId)
        const url = await uploadPrizeGalleryImage(fileToUpload, uploadId)
        console.log('[Gallery] upload OK:', url)
        uploadedUrls.push(url)
      }
      setForm((p) => ({ ...p, images: [...p.images, ...uploadedUrls].slice(0, 30) }))
      setPendingGalleryUploads((p) => [...p, ...uploadedUrls])
      console.log('[Gallery] all done, images in form:', form.images.length + uploadedUrls.length)
      setGalleryMessage(`${uploadedUrls.length} imagem(ns) adicionada(s) com sucesso. Clique em Salvar Prêmio para gravar.`)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erro desconhecido ao enviar galeria'
      console.error('[Gallery] FATAL ERROR:', e)
      setGalleryError(`Erro: ${msg}`)
    } finally {
      setGalleryUploading(false)
    }
  }

  const handleRemoveGalleryImage = async (src: string) => {
    if (!confirm('Remover esta imagem da galeria?')) return
    setGalleryUploading(true)
    try {
      await deletePrizeStorageFiles([src])
      setForm((p) => ({ ...p, images: p.images.filter((url) => url !== src) }))
      setPendingGalleryUploads((p) => p.filter((url) => url !== src))
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Erro ao remover imagem')
    } finally {
      setGalleryUploading(false)
    }
  }

  const handleCancel = async () => {
    if (pendingGalleryUploads.length > 0) {
      try {
        await deletePrizeStorageFiles(pendingGalleryUploads)
      } catch {
        // Best effort cleanup; the maintenance purge can still catch abandoned uploads.
      }
    }
    onCancel()
  }

  const handleSave = async () => {
    if (!form.title) return
    setFormError('')
    setUploading(true)
    try {
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
      const payload = { ...form, image_url: imageUrl, image_horizontal: imageHorizUrl }
      console.log('[PrizeForm] saving payload:', { title: payload.title, images: payload.images, campaign_id: payload.campaign_id || null })
      await onSave(payload)
      setPendingGalleryUploads([])
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Erro ao salvar prêmio')
    } finally {
      setUploading(false)
    }
  }

  const isBusy = saving || uploading || galleryUploading

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

      {/* Additional images gallery */}
      <div>
        <label className="block text-xs font-semibold text-gray-700 mb-1">
          Galeria de Imagens <span className="font-normal text-gray-400">(ate 30 imagens)</span>
        </label>
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault()
            void handleGalleryFiles(e.dataTransfer.files)
          }}
          className="flex flex-col items-center justify-center w-full min-h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition p-4 text-center"
        >
          <svg className="w-8 h-8 mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
          </svg>
          <span className="text-sm font-semibold text-gray-700">
            {galleryUploading ? 'Enviando e comprimindo...' : 'Arraste imagens ou clique para enviar'}
          </span>
          <span className="text-xs text-gray-400 mt-1">WebP automatico, 1200px, ate {30 - form.images.length} restantes</span>
          <button
            type="button"
            onClick={() => galleryInputRef.current?.click()}
            disabled={galleryUploading || form.images.length >= 30}
            className="mt-3 px-3 py-1.5 bg-indigo-100 hover:bg-indigo-200 disabled:opacity-50 text-indigo-700 text-xs font-semibold rounded-lg transition"
          >
            Selecionar imagens
          </button>
          <input
            ref={galleryInputRef}
            id={`gallery-upload-${uploadId}`}
            type="file"
            accept="image/*"
            multiple
            disabled={galleryUploading || form.images.length >= 30}
            onChange={(e) => {
              const files = e.target.files
              e.target.value = ''
              if (files) void handleGalleryFiles(files)
            }}
            className="hidden"
          />
        </div>
        {galleryMessage && (
          <div className="flex items-start gap-2 mt-2 px-3 py-2 bg-indigo-50 border border-indigo-200 rounded-lg">
            <svg className="w-4 h-4 text-indigo-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-indigo-700">{galleryMessage}</p>
          </div>
        )}
        {galleryError && (
          <div className="flex items-start gap-2 mt-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg">
            <svg className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-red-700">{galleryError}</p>
          </div>
        )}
        {form.images.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 mt-3">
            {form.images.map((src) => (
              <div key={src} className="relative group">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="" className="w-full aspect-square object-cover rounded-lg border border-gray-200" />
                <button
                  type="button"
                  onClick={() => void handleRemoveGalleryImage(src)}
                  disabled={galleryUploading}
                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition disabled:opacity-50"
                  aria-label="Remover imagem"
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
          <p className="text-xs text-gray-400 mt-2">Nenhuma imagem de galeria adicionada</p>
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
      {formError && (
        <div className="flex items-start gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg">
          <svg className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm text-red-700">{formError}</p>
        </div>
      )}
      <div className="flex gap-2 pt-1">
        <button
          onClick={() => void handleSave()}
          disabled={isBusy || !form.title}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white text-sm font-semibold rounded-lg transition"
        >
          {isBusy ? 'Salvando...' : 'Salvar Prêmio'}
        </button>
        <button
          onClick={() => void handleCancel()}
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
          campaign_id: form.campaign_id || null,
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

      <div className="p-6">
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

            {(showForm || editingPrize) && (
              <PrizeForm
                initial={editingPrize ?? undefined}
                campaigns={campaigns}
                onSave={handleSavePrize}
                onCancel={() => { setShowForm(false); setEditingPrize(null) }}
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
                {prizes.filter((prize) => prize.id !== editingPrize?.id).map((prize) => (
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

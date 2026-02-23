'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { uploadMuralSlideImage } from '@/lib/storage/imageStorage'
import AdminHeader from './AdminHeader'
import LoadingSpinner from '@/components/shared/LoadingSpinner'

interface MuralSlide {
  id: string
  title: string
  subtitle: string | null
  image_url: string | null
  bg_color: string
  text_color: string
  priority: number
  is_active: boolean
  created_at: string
}

const EMPTY_FORM = {
  title: '',
  subtitle: '',
  bg_color: '#6366f1',
  text_color: '#ffffff',
  priority: 0,
  is_active: true,
}

export default function MuralManager() {
  const [slides, setSlides] = useState<MuralSlide[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(null)
  const [error, setError] = useState('')
  const supabase = useMemo(() => createClient(), [])

  const fetchSlides = useCallback(async () => {
    const { data, error: err } = await supabase
      .from('mural_slides')
      .select('*')
      .order('priority', { ascending: true })
      .order('created_at', { ascending: false })
    if (!err && data) setSlides(data as MuralSlide[])
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    void fetchSlides()
  }, [fetchSlides])

  const openCreate = () => {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setImageFile(null)
    setImagePreview(null)
    setCurrentImageUrl(null)
    setError('')
    setShowForm(true)
  }

  const openEdit = (slide: MuralSlide) => {
    setEditingId(slide.id)
    setForm({
      title: slide.title,
      subtitle: slide.subtitle ?? '',
      bg_color: slide.bg_color,
      text_color: slide.text_color,
      priority: slide.priority,
      is_active: slide.is_active,
    })
    setImageFile(null)
    setImagePreview(slide.image_url)
    setCurrentImageUrl(slide.image_url)
    setError('')
    setShowForm(true)
  }

  const cancelForm = () => {
    setShowForm(false)
    setEditingId(null)
    setImageFile(null)
    setImagePreview(null)
    setCurrentImageUrl(null)
    setError('')
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('Selecione um arquivo de imagem válido')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('A imagem deve ter no máximo 5MB')
      return
    }
    setImageFile(file)
    setError('')
    const reader = new FileReader()
    reader.onloadend = () => setImagePreview(reader.result as string)
    reader.readAsDataURL(file)
  }

  const handleSave = async () => {
    if (!form.title.trim()) {
      setError('O título é obrigatório')
      return
    }
    setSaving(true)
    setError('')

    // Upload new image if one was selected
    let resolvedImageUrl = currentImageUrl
    if (imageFile) {
      const tempId = editingId || `new-${Date.now()}`
      resolvedImageUrl = await uploadMuralSlideImage(imageFile, tempId)
    }

    const payload = {
      title: form.title.trim(),
      subtitle: form.subtitle.trim() || null,
      image_url: resolvedImageUrl,
      bg_color: form.bg_color,
      text_color: form.text_color,
      priority: form.priority,
      is_active: form.is_active,
      updated_at: new Date().toISOString(),
    }

    try {
      if (editingId) {
        const { error: err } = await supabase
          .from('mural_slides')
          .update(payload)
          .eq('id', editingId)
        if (err) throw err
      } else {
        const { error: err } = await supabase
          .from('mural_slides')
          .insert({ ...payload })
        if (err) throw err
      }
      await fetchSlides()
      cancelForm()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Falha ao salvar slide')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este slide?')) return
    const { error: err } = await supabase.from('mural_slides').delete().eq('id', id)
    if (!err) setSlides((prev) => prev.filter((s) => s.id !== id))
  }

  const handleToggleActive = async (slide: MuralSlide) => {
    const { error: err } = await supabase
      .from('mural_slides')
      .update({ is_active: !slide.is_active, updated_at: new Date().toISOString() })
      .eq('id', slide.id)
    if (!err) {
      setSlides((prev) =>
        prev.map((s) => (s.id === slide.id ? { ...s, is_active: !s.is_active } : s))
      )
    }
  }

  if (loading) return <LoadingSpinner />

  return (
    <>
      <AdminHeader
        title="Mural de Slides"
        subtitle="Gerencie os slides do carrossel exibido no painel do usuário"
      />

      <div className="p-6 space-y-6">
        {/* Toolbar */}
        <div className="flex justify-between items-center">
          <p className="text-sm text-gray-500">{slides.length} slide(s) cadastrado(s)</p>
          {!showForm && (
            <button
              onClick={openCreate}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
            >
              + Novo Slide
            </button>
          )}
        </div>

        {/* Form */}
        {showForm && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-base font-semibold mb-5">
              {editingId ? 'Editar Slide' : 'Novo Slide'}
            </h3>

            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Title */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Título <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="ex: Robsol VIP — Promoção de Verão"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                />
              </div>

              {/* Subtitle */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Subtítulo</label>
                <input
                  type="text"
                  value={form.subtitle}
                  onChange={(e) => setForm((f) => ({ ...f, subtitle: e.target.value }))}
                  placeholder="ex: Escaneie cupons e ganhe prêmios incríveis!"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                />
              </div>

              {/* Image upload */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Imagem do slide{' '}
                  <span className="text-gray-400 font-normal">(opcional — substitui a cor de fundo)</span>
                </label>
                <div className="flex items-start gap-4">
                  <label className="cursor-pointer flex-shrink-0">
                    <div className="border-2 border-dashed border-gray-300 hover:border-indigo-400 rounded-lg p-4 text-center transition bg-gray-50 hover:bg-indigo-50 w-36">
                      {imagePreview ? (
                        <div className="relative w-28 h-10 mx-auto">
                          <Image src={imagePreview} alt="preview" fill className="object-cover rounded" unoptimized />
                        </div>
                      ) : (
                        <svg className="w-8 h-8 text-gray-300 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      )}
                      <span className="text-xs text-indigo-600 font-medium">
                        {imagePreview ? 'Trocar' : 'Selecionar'}
                      </span>
                    </div>
                    <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                  </label>
                  <div className="text-xs text-gray-500 pt-1 space-y-1">
                    <p className="font-semibold text-gray-700">Tamanho ideal: 1200 × 400 px</p>
                    <p>Proporção: <strong>3:1</strong> (banner panorâmico)</p>
                    <p>Formatos: JPG, PNG, WebP</p>
                    <p>Tamanho máximo: 5MB</p>
                    <p className="text-gray-400">Se não enviar imagem, a cor de fundo abaixo será usada.</p>
                    {imagePreview && (
                      <button
                        type="button"
                        onClick={() => { setImageFile(null); setImagePreview(null); setCurrentImageUrl(null) }}
                        className="text-red-500 hover:text-red-700 font-medium"
                      >
                        Remover imagem
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Bg Color */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cor de fundo</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={form.bg_color}
                    onChange={(e) => setForm((f) => ({ ...f, bg_color: e.target.value }))}
                    className="w-10 h-10 rounded cursor-pointer border border-gray-300"
                  />
                  <input
                    type="text"
                    value={form.bg_color}
                    onChange={(e) => setForm((f) => ({ ...f, bg_color: e.target.value }))}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  Aceita qualquer valor CSS: #hex, rgb(), ou gradiente (ex: linear-gradient(135deg,#667eea,#764ba2))
                </p>
              </div>

              {/* Text Color */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cor do texto</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={form.text_color}
                    onChange={(e) => setForm((f) => ({ ...f, text_color: e.target.value }))}
                    className="w-10 h-10 rounded cursor-pointer border border-gray-300"
                  />
                  <input
                    type="text"
                    value={form.text_color}
                    onChange={(e) => setForm((f) => ({ ...f, text_color: e.target.value }))}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                  />
                </div>
              </div>

              {/* Priority */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Prioridade{' '}
                  <span className="text-gray-400 font-normal">(menor = aparece primeiro)</span>
                </label>
                <input
                  type="number"
                  value={form.priority}
                  onChange={(e) => setForm((f) => ({ ...f, priority: parseInt(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                />
              </div>

              {/* Is Active */}
              <div className="flex items-center">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.is_active}
                    onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
                    className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Ativo (visível para usuários)</span>
                </label>
              </div>
            </div>

            {/* Preview */}
            <div className="mt-5">
              <p className="text-sm font-medium text-gray-700 mb-2">Pré-visualização</p>
              <div
                className="rounded-xl p-6 min-h-[100px] flex flex-col justify-center relative overflow-hidden"
                style={{
                  background: imagePreview ? '#1f2937' : form.bg_color,
                  color: form.text_color,
                }}
              >
                {imagePreview && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={imagePreview}
                    alt="preview"
                    className="absolute inset-0 w-full h-full object-cover opacity-60"
                  />
                )}
                <div className="relative z-10">
                  <p className="font-bold text-lg">{form.title || 'Título do slide'}</p>
                  {form.subtitle && (
                    <p className="text-sm mt-1 opacity-90">{form.subtitle}</p>
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-5">
              <button
                onClick={handleSave}
                disabled={saving}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white px-5 py-2 rounded-lg text-sm font-medium transition"
              >
                {saving ? 'Salvando...' : editingId ? 'Salvar alterações' : 'Criar slide'}
              </button>
              <button
                onClick={cancelForm}
                className="border border-gray-300 text-gray-700 hover:bg-gray-50 px-5 py-2 rounded-lg text-sm font-medium transition"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* Slides list */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {slides.length === 0 ? (
            <p className="text-gray-500 text-center py-12">
              Nenhum slide cadastrado. Clique em &quot;Novo Slide&quot; para começar.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Slide
                  </th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">
                    Cores
                  </th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Prioridade
                  </th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Status
                  </th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {slides.map((slide) => (
                  <tr key={slide.id} className="hover:bg-gray-50 transition">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        {/* Mini preview */}
                        <div
                          className="w-10 h-10 rounded-lg flex-shrink-0 border border-gray-200"
                          style={{ background: slide.bg_color }}
                        />
                        <div>
                          <p className="font-medium text-gray-900">{slide.title}</p>
                          {slide.subtitle && (
                            <p className="text-xs text-gray-400 truncate max-w-xs">{slide.subtitle}</p>
                          )}
                          {slide.image_url && (
                            <p className="text-xs text-indigo-500 truncate max-w-xs">
                              Imagem: {slide.image_url}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 hidden md:table-cell">
                      <div className="flex items-center justify-center gap-2">
                        <div
                          className="w-6 h-6 rounded border border-gray-200"
                          style={{ background: slide.bg_color }}
                          title={`Fundo: ${slide.bg_color}`}
                        />
                        <div
                          className="w-6 h-6 rounded border border-gray-200"
                          style={{ background: slide.text_color }}
                          title={`Texto: ${slide.text_color}`}
                        />
                      </div>
                    </td>
                    <td className="px-4 py-4 text-center text-gray-600">{slide.priority}</td>
                    <td className="px-4 py-4 text-center">
                      <button
                        onClick={() => handleToggleActive(slide)}
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium transition ${
                          slide.is_active
                            ? 'bg-green-100 text-green-800 hover:bg-green-200'
                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                        }`}
                      >
                        {slide.is_active ? 'Ativo' : 'Inativo'}
                      </button>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEdit(slide)}
                          className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleDelete(slide.id)}
                          className="text-red-500 hover:text-red-700 text-sm font-medium"
                        >
                          Excluir
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  )
}

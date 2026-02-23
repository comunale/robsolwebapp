'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
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
  image_url: '',
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
    setError('')
    setShowForm(true)
  }

  const openEdit = (slide: MuralSlide) => {
    setEditingId(slide.id)
    setForm({
      title: slide.title,
      subtitle: slide.subtitle ?? '',
      image_url: slide.image_url ?? '',
      bg_color: slide.bg_color,
      text_color: slide.text_color,
      priority: slide.priority,
      is_active: slide.is_active,
    })
    setError('')
    setShowForm(true)
  }

  const cancelForm = () => {
    setShowForm(false)
    setEditingId(null)
    setError('')
  }

  const handleSave = async () => {
    if (!form.title.trim()) {
      setError('O título é obrigatório')
      return
    }
    setSaving(true)
    setError('')

    const payload = {
      title: form.title.trim(),
      subtitle: form.subtitle.trim() || null,
      image_url: form.image_url.trim() || null,
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

              {/* Image URL */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  URL da imagem{' '}
                  <span className="text-gray-400 font-normal">(opcional — substitui a cor de fundo)</span>
                </label>
                <input
                  type="url"
                  value={form.image_url}
                  onChange={(e) => setForm((f) => ({ ...f, image_url: e.target.value }))}
                  placeholder="https://..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                />
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
                  background: form.image_url ? '#1f2937' : form.bg_color,
                  color: form.text_color,
                }}
              >
                {form.image_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={form.image_url}
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

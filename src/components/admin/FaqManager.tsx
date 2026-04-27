'use client'

import { useState, useEffect, useCallback } from 'react'

interface FaqItem {
  id: string
  question: string
  answer: string
  category: string
  order_index: number
  is_active: boolean
}

const EMPTY_FORM = { question: '', answer: '', category: 'Geral', order_index: 0 }

export default function FaqManager() {
  const [items, setItems]         = useState<FaqItem[]>([])
  const [loading, setLoading]     = useState(true)
  const [showAdd, setShowAdd]     = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm]           = useState({ ...EMPTY_FORM })
  const [saving, setSaving]       = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const fetchItems = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/faq')
      const d   = await res.json()
      setItems(d.items ?? [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchItems() }, [fetchItems])

  const handleSave = async () => {
    if (!form.question.trim() || !form.answer.trim()) {
      alert('Pergunta e resposta são obrigatórias')
      return
    }
    setSaving(true)
    try {
      if (editingId) {
        const res = await fetch(`/api/admin/faq/${editingId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        })
        if (!res.ok) throw new Error((await res.json()).error)
      } else {
        const res = await fetch('/api/admin/faq', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        })
        if (!res.ok) throw new Error((await res.json()).error)
      }
      setForm({ ...EMPTY_FORM })
      setShowAdd(false)
      setEditingId(null)
      await fetchItems()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (item: FaqItem) => {
    setForm({ question: item.question, answer: item.answer, category: item.category, order_index: item.order_index })
    setEditingId(item.id)
    setShowAdd(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir esta pergunta? Esta ação não pode ser desfeita.')) return
    setDeletingId(id)
    try {
      await fetch(`/api/admin/faq/${id}`, { method: 'DELETE' })
      await fetchItems()
    } finally {
      setDeletingId(null)
    }
  }

  const handleToggleActive = async (item: FaqItem) => {
    await fetch(`/api/admin/faq/${item.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !item.is_active }),
    })
    await fetchItems()
  }

  const handleCancel = () => {
    setForm({ ...EMPTY_FORM })
    setShowAdd(false)
    setEditingId(null)
  }

  // Group items by category for display
  const categories = [...new Set(items.map((i) => i.category))]

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {items.length} pergunta{items.length !== 1 ? 's' : ''} cadastrada{items.length !== 1 ? 's' : ''}.
          Itens inativos ficam ocultos para os usuários.
        </p>
        {!showAdd && (
          <button
            onClick={() => { setForm({ ...EMPTY_FORM }); setEditingId(null); setShowAdd(true) }}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Nova Pergunta
          </button>
        )}
      </div>

      {/* Add / Edit form */}
      {showAdd && (
        <div className="bg-white rounded-xl border border-indigo-200 shadow-sm p-5 space-y-4">
          <p className="text-sm font-bold text-indigo-700">{editingId ? '✏️ Editar Pergunta' : '➕ Nova Pergunta'}</p>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Pergunta *</label>
            <input
              type="text"
              value={form.question}
              onChange={(e) => setForm((p) => ({ ...p, question: e.target.value }))}
              placeholder="Ex: Como faço para me cadastrar?"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Resposta *</label>
            <textarea
              rows={4}
              value={form.answer}
              onChange={(e) => setForm((p) => ({ ...p, answer: e.target.value }))}
              placeholder="Resposta clara e objetiva..."
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none resize-y"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Categoria</label>
              <input
                type="text"
                value={form.category}
                onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
                placeholder="Geral, Cupons, Pontos..."
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Ordem</label>
              <input
                type="number"
                value={form.order_index}
                onChange={(e) => setForm((p) => ({ ...p, order_index: parseInt(e.target.value) || 0 }))}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-1">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-sm font-semibold rounded-xl transition"
            >
              {saving ? 'Salvando...' : editingId ? 'Salvar Alterações' : 'Adicionar'}
            </button>
            <button
              onClick={handleCancel}
              className="px-5 py-2 border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm font-medium rounded-xl transition"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Item list */}
      {loading ? (
        <div className="flex justify-center py-8">
          <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p className="text-4xl mb-2">❓</p>
          <p className="font-semibold">Nenhuma pergunta cadastrada</p>
          <p className="text-sm mt-1">Clique em "Nova Pergunta" para começar.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {categories.map((cat) => (
            <div key={cat}>
              <p className="text-xs font-bold uppercase tracking-widest text-indigo-500 mb-2">{cat}</p>
              <div className="space-y-2">
                {items.filter((i) => i.category === cat).map((item) => (
                  <div
                    key={item.id}
                    className={`bg-white rounded-xl border shadow-sm p-4 transition ${
                      item.is_active ? 'border-gray-200' : 'border-gray-100 opacity-50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 leading-snug">{item.question}</p>
                        <p className="text-xs text-gray-500 mt-1 line-clamp-2">{item.answer}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full font-medium">{item.category}</span>
                          <span className="text-xs text-gray-300">ordem {item.order_index}</span>
                          {!item.is_active && <span className="text-xs bg-gray-100 text-gray-400 px-2 py-0.5 rounded-full">oculto</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {/* Toggle active */}
                        <button
                          onClick={() => handleToggleActive(item)}
                          title={item.is_active ? 'Ocultar' : 'Mostrar'}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                            {item.is_active
                              ? <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              : <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                            }
                          </svg>
                        </button>
                        {/* Edit */}
                        <button
                          onClick={() => handleEdit(item)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Z" />
                          </svg>
                        </button>
                        {/* Delete */}
                        <button
                          onClick={() => handleDelete(item.id)}
                          disabled={deletingId === item.id}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition disabled:opacity-50"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

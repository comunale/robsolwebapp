'use client'

import { useState, useEffect } from 'react'
import CabecalhoUsuario from './CabecalhoUsuario'
import BarraNavegacao from './BarraNavegacao'

interface FaqItem {
  id: string
  question: string
  answer: string
  category: string
  order_index: number
}

function AccordionItem({ item }: { item: FaqItem }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50 transition"
      >
        <span className="text-sm font-semibold text-gray-900 pr-4 leading-snug">{item.question}</span>
        <svg
          className={`w-5 h-5 text-gray-400 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="px-5 pb-5 pt-1 border-t border-gray-50">
          <p className="text-sm text-gray-600 leading-relaxed">{item.answer}</p>
        </div>
      )}
    </div>
  )
}

export default function AjudaFaq() {
  const [items, setItems]   = useState<FaqItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/user/faq')
      .then((r) => r.json())
      .then((d) => setItems(d.items ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const categories = [...new Set(items.map((i) => i.category))]

  return (
    <>
      <CabecalhoUsuario />
      <main className="max-w-lg md:max-w-2xl mx-auto px-4 md:px-8 py-6 pb-28 md:pb-10">

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-xl font-bold text-gray-900">Central de Ajuda</h1>
          <p className="text-sm text-gray-500 mt-0.5">Dúvidas frequentes sobre a plataforma</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-4xl mb-3">❓</p>
            <p className="font-semibold">Nenhuma pergunta disponível ainda</p>
            <p className="text-sm mt-1">Em breve o administrador adicionará as dúvidas frequentes.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {categories.map((cat) => (
              <section key={cat}>
                <p className="text-xs font-bold uppercase tracking-widest text-indigo-500 mb-3 px-1">{cat}</p>
                <div className="space-y-2">
                  {items.filter((i) => i.category === cat).map((item) => (
                    <AccordionItem key={item.id} item={item} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}

        {/* Contact hint */}
        <div className="mt-8 rounded-2xl p-4 bg-indigo-50 border border-indigo-100 text-center">
          <p className="text-sm font-semibold text-indigo-800 mb-1">Não encontrou o que procurava?</p>
          <p className="text-xs text-indigo-600">Entre em contato com o suporte pelo WhatsApp ou e-mail da campanha.</p>
        </div>
      </main>
      <BarraNavegacao />
    </>
  )
}

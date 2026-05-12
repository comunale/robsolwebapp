'use client'

import { useState, useEffect } from 'react'
import CabecalhoUsuario from './CabecalhoUsuario'
import BarraNavegacao from './BarraNavegacao'
import { useBrand } from '@/components/shared/BrandProvider'

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
  const brand = useBrand()
  const whatsappDigits = brand.support_whatsapp?.replace(/\D/g, '')

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

        {/* Contact CTA */}
        <div className="mt-8 rounded-2xl p-5 bg-indigo-50 border border-indigo-100 text-center">
          <p className="text-sm font-semibold text-indigo-800 mb-1">Não encontrou o que procurava?</p>
          {whatsappDigits ? (
            <a
              href={`https://wa.me/${whatsappDigits}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white font-semibold text-sm px-5 py-2.5 rounded-xl transition shadow-sm"
            >
              <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              Falar com Consultor
            </a>
          ) : (
            <p className="text-xs text-indigo-600 mt-1">Entre em contato com o suporte pelo WhatsApp ou e-mail da campanha.</p>
          )}
        </div>
      </main>
      <BarraNavegacao />
    </>
  )
}

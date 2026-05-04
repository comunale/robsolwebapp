'use client'

import { useState } from 'react'

export interface FaqItem {
  id: string
  question: string
  answer: string
  category: string
  order_index: number
}

function AccordionItem({ item }: { item: FaqItem }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="rounded-xl border border-gray-100 bg-white shadow-sm overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-start justify-between px-5 py-4 text-left hover:bg-gray-50 transition gap-3"
        aria-expanded={open}
      >
        <span className="text-sm font-semibold text-gray-900 leading-snug pr-1">{item.question}</span>
        <svg
          className={`w-5 h-5 flex-shrink-0 mt-0.5 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          style={{ color: open ? 'var(--brand-primary)' : '#9ca3af' }}
          fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="px-5 pb-5 pt-1 border-t border-gray-50">
          <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{item.answer}</p>
        </div>
      )}
    </div>
  )
}

interface Props {
  items: FaqItem[]
}

export default function FaqAccordionPublic({ items }: Props) {
  if (items.length === 0) return null

  const categories = [...new Set(items.map((i) => i.category))]

  return (
    <div className="mt-8 pt-6 border-t border-gray-100">
      <h2 className="text-lg font-bold text-gray-900 mb-5">Perguntas Frequentes</h2>

      <div className="space-y-6">
        {categories.map((cat) => (
          <section key={cat}>
            <p
              className="text-xs font-bold uppercase tracking-widest mb-3 px-1"
              style={{ color: 'var(--brand-primary)' }}
            >
              {cat}
            </p>
            <div className="space-y-2">
              {items
                .filter((i) => i.category === cat)
                .map((item) => (
                  <AccordionItem key={item.id} item={item} />
                ))}
            </div>
          </section>
        ))}
      </div>

      {/* Support hint */}
      <div
        className="mt-8 rounded-2xl p-4 text-center border"
        style={{
          background: 'color-mix(in srgb, var(--brand-primary) 8%, white)',
          borderColor: 'color-mix(in srgb, var(--brand-primary) 20%, white)',
        }}
      >
        <p
          className="text-sm font-semibold mb-1"
          style={{ color: 'color-mix(in srgb, var(--brand-primary) 80%, black)' }}
        >
          Não encontrou o que procurava?
        </p>
        <p
          className="text-xs"
          style={{ color: 'color-mix(in srgb, var(--brand-primary) 60%, black)' }}
        >
          Entre em contato com o suporte pelo WhatsApp ou e-mail da campanha.
        </p>
      </div>
    </div>
  )
}

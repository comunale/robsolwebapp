'use client'

import type { Campaign } from '@/types/campaign'

interface DestaquesCampanhasProps {
  campaigns: Campaign[]
}

export default function DestaquesCampanhas({ campaigns }: DestaquesCampanhasProps) {
  if (campaigns.length === 0) return null

  return (
    <section className="mb-6">
      <h2 className="text-sm font-semibold text-gray-700 mb-3 px-1">Campanhas Ativas</h2>
      <div className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-hide" style={{ scrollbarWidth: 'none' }}>
        {campaigns.map((campaign) => (
          <div
            key={campaign.id}
            className="snap-start flex-shrink-0 w-64 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl p-4 text-white shadow-md"
          >
            {campaign.banner_url && (
              <div className="w-full h-24 rounded-lg overflow-hidden mb-3 bg-white/10">
                <img src={campaign.banner_url} alt={campaign.title} className="w-full h-full object-cover" />
              </div>
            )}
            <h3 className="font-bold text-sm mb-1 truncate">{campaign.title}</h3>
            {campaign.description && (
              <p className="text-white/80 text-xs mb-2 line-clamp-2">{campaign.description}</p>
            )}
            <div className="flex items-center justify-between text-xs">
              <span className="bg-white/20 px-2 py-0.5 rounded-full">
                {campaign.settings?.points_per_coupon || 10} pts/cupom
              </span>
              <span className="text-white/70">
                ate {new Date(campaign.end_date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
              </span>
            </div>
            {campaign.settings?.goals && campaign.settings.goals.length > 0 && (
              <div className="mt-2 text-xs text-white/70">
                {campaign.settings.goals.length} meta(s) disponivel(is)
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}

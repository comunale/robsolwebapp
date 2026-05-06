import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import CabecalhoUsuario from '@/components/user/CabecalhoUsuario'
import BarraNavegacao from '@/components/user/BarraNavegacao'

interface PublishedWinnerRow {
  id: string
  number: number
  drawn_at: string | null
  published_at: string | null
  profiles?: {
    full_name: string | null
    stores?: { name: string | null } | null
  } | null
  campaigns?: {
    id: string
    title: string | null
    description: string | null
  } | null
}

interface RaffleGroup {
  campaignId: string
  campaignTitle: string
  prize: string
  drawnAt: string | null
  winners: {
    id: string
    name: string
    store: string
    number: number
  }[]
}

function groupWinners(rows: PublishedWinnerRow[]): RaffleGroup[] {
  const grouped = new Map<string, RaffleGroup>()

  for (const row of rows) {
    const campaignId = row.campaigns?.id ?? row.id
    const campaignTitle = row.campaigns?.title || 'Sorteio Robsol VIP'

    if (!grouped.has(campaignId)) {
      grouped.set(campaignId, {
        campaignId,
        campaignTitle,
        prize: row.campaigns?.description || 'Prêmio da campanha',
        drawnAt: row.drawn_at,
        winners: [],
      })
    }

    grouped.get(campaignId)?.winners.push({
      id: row.id,
      name: row.profiles?.full_name || 'Ganhador VIP',
      store: row.profiles?.stores?.name || 'Loja não informada',
      number: row.number,
    })
  }

  return Array.from(grouped.values())
}

export default async function SorteiosPage() {
  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect('/login?redirectTo=/sorteios')
  }

  const { data, error } = await supabase
    .from('lucky_numbers')
    .select('id, number, drawn_at, published_at, profiles!lucky_numbers_user_id_fkey(full_name, stores(name)), campaigns(id, title, description)')
    .eq('is_winner', true)
    .eq('is_public', true)
    .order('drawn_at', { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  const raffles = groupWinners((data ?? []) as unknown as PublishedWinnerRow[])

  return (
    <div className="min-h-screen bg-gray-50 pb-24 md:pb-0">
      <CabecalhoUsuario />
      <main className="p-4 md:p-8">
        <div className="max-w-5xl mx-auto">
          <div
            className="rounded-2xl p-6 md:p-8 mb-6 text-white overflow-hidden relative"
            style={{ background: 'linear-gradient(135deg,var(--brand-bg-from),var(--brand-primary),var(--brand-bg-to))' }}
          >
            <div className="relative z-10">
              <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--brand-accent)' }}>
                Robsol VIP
              </p>
              <h1 className="text-2xl md:text-3xl font-black mb-2">Resultados dos Sorteios</h1>
              <p className="text-sm text-white/70 max-w-2xl">
                Confira os sorteios já publicados e os vendedores premiados.
              </p>
            </div>
          </div>

          {raffles.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
              <div
                className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center"
                style={{ background: 'color-mix(in srgb, var(--brand-accent) 18%, white)' }}
              >
                <svg className="w-7 h-7" style={{ color: 'var(--brand-accent)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8v13m0-13V6a2 2 0 112 2h-2Zm0 0V5.5A2.5 2.5 0 109.5 8H12Zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                </svg>
              </div>
              <h2 className="text-lg font-bold text-gray-900">Nenhum resultado publicado ainda</h2>
              <p className="text-sm text-gray-500 mt-1">Quando o admin publicar os ganhadores, eles aparecerão aqui.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {raffles.map((raffle) => (
                <article key={raffle.campaignId} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                  <div className="p-5 md:p-6 border-b border-gray-100">
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: 'var(--brand-primary)' }}>
                          Sorteio publicado
                        </p>
                        <h2 className="text-xl font-black text-gray-900">{raffle.campaignTitle}</h2>
                        <p className="text-sm text-gray-500 mt-1">{raffle.prize}</p>
                      </div>
                      {raffle.drawnAt && (
                        <span className="text-xs font-semibold text-gray-500 bg-gray-100 rounded-full px-3 py-1 w-fit">
                          {new Date(raffle.drawnAt).toLocaleDateString('pt-BR')}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="divide-y divide-gray-100">
                    {raffle.winners.map((winner) => (
                      <div key={winner.id} className="p-4 md:px-6 flex items-center justify-between gap-4">
                        <div className="min-w-0">
                          <p className="font-bold text-gray-900 truncate">{winner.name}</p>
                          <p className="text-sm text-gray-500 truncate">{winner.store}</p>
                        </div>
                        <span
                          className="flex-shrink-0 rounded-full px-3 py-1 text-sm font-black"
                          style={{ background: 'color-mix(in srgb, var(--brand-accent) 18%, white)', color: 'var(--brand-bg-from)' }}
                        >
                          #{winner.number}
                        </span>
                      </div>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </main>
      <BarraNavegacao />
    </div>
  )
}

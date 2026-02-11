'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/hooks/useAuth'
import { createClient } from '@/lib/supabase/client'
import CabecalhoUsuario from './CabecalhoUsuario'
import BarraNavegacao from './BarraNavegacao'
import LoadingSpinner from '@/components/shared/LoadingSpinner'
import type { Campaign } from '@/types/campaign'
import type { LuckyNumber } from '@/types/goal'

export default function NumerosdasSorte() {
  const { user, loading: authLoading } = useAuth()
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [selectedCampaign, setSelectedCampaign] = useState<string>('')
  const [numbers, setNumbers] = useState<LuckyNumber[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    if (user) fetchCampaigns()
  }, [user])

  useEffect(() => {
    if (selectedCampaign) fetchNumbers()
  }, [selectedCampaign])

  const fetchCampaigns = async () => {
    const { data } = await supabase
      .from('campaigns')
      .select('*')
      .eq('is_active', true)
      .order('title')
    if (data) {
      setCampaigns(data as Campaign[])
      if (data.length > 0) setSelectedCampaign(data[0].id)
    }
    setLoading(false)
  }

  const fetchNumbers = async () => {
    try {
      const res = await fetch(`/api/lucky-numbers?campaign_id=${selectedCampaign}`)
      const data = await res.json()
      if (data.lucky_numbers) setNumbers(data.lucky_numbers)
    } catch (err) {
      console.error(err)
    }
  }

  if (authLoading || loading) return <LoadingSpinner />
  if (!user) return null

  const winners = numbers.filter(n => n.is_winner)

  return (
    <>
      <CabecalhoUsuario />
      <main className="max-w-lg mx-auto px-4 py-4 pb-24">
        <h1 className="text-xl font-bold text-gray-900 mb-4">Numeros da Sorte</h1>

        <select
          value={selectedCampaign}
          onChange={(e) => setSelectedCampaign(e.target.value)}
          className="w-full mb-4 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-white text-sm"
        >
          {campaigns.map((c) => (
            <option key={c.id} value={c.id}>{c.title}</option>
          ))}
        </select>

        {numbers.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-4xl mb-3">🍀</div>
            <p className="text-gray-500 text-sm">Nenhum numero da sorte ainda.</p>
            <p className="text-gray-400 text-xs mt-1">Complete metas para ganhar numeros!</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-4 gap-2 mb-6">
              {numbers.map((n) => (
                <div
                  key={n.id}
                  className={`aspect-square rounded-xl flex items-center justify-center text-lg font-bold border-2 transition ${
                    n.is_winner
                      ? 'bg-gradient-to-br from-amber-100 to-yellow-200 border-amber-400 text-amber-800 shadow-md'
                      : 'bg-white border-gray-200 text-gray-700'
                  }`}
                >
                  {n.number}
                  {n.is_winner && <span className="text-xs absolute">🏆</span>}
                </div>
              ))}
            </div>

            {winners.length > 0 && (
              <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 rounded-xl p-4">
                <h3 className="font-bold text-amber-800 text-sm mb-2">Numeros Premiados</h3>
                <div className="flex flex-wrap gap-2">
                  {winners.map((w) => (
                    <span key={w.id} className="bg-amber-200 text-amber-900 px-3 py-1 rounded-full text-sm font-bold">
                      #{w.number}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <p className="text-center text-xs text-gray-400 mt-4">
              Total: {numbers.length} numero(s) | Premiados: {winners.length}
            </p>
          </>
        )}
      </main>
      <BarraNavegacao />
    </>
  )
}

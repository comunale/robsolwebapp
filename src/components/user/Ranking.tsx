'use client'

import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '@/lib/hooks/useAuth'
import { createClient } from '@/lib/supabase/client'
import CabecalhoUsuario from './CabecalhoUsuario'
import BarraNavegacao from './BarraNavegacao'
import LoadingSpinner from '@/components/shared/LoadingSpinner'
import type { Campaign } from '@/types/campaign'

interface LeaderboardEntry {
  user_id: string
  full_name: string
  store_name: string | null
  campaign_points: number
  approved_coupons: number
  lucky_numbers_count: number
  rank_in_campaign: number
}

export default function Ranking() {
  const { user, profile, loading: authLoading } = useAuth()
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [selectedCampaign, setSelectedCampaign] = useState<string>('')
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    if (!user) return
    let active = true
    const fetchCampaigns = async () => {
      const { data } = await supabase
        .from('campaigns')
        .select('*')
        .eq('is_active', true)
        .order('title')
      if (!active) return
      if (data) {
        setCampaigns(data as Campaign[])
        if (data.length > 0) setSelectedCampaign(data[0].id)
      }
      setLoading(false)
    }

    void fetchCampaigns()
    return () => {
      active = false
    }
  }, [user, supabase])

  useEffect(() => {
    if (!selectedCampaign) return
    let active = true
    const fetchLeaderboard = async () => {
      try {
        const res = await fetch(`/api/leaderboard?campaign_id=${selectedCampaign}`)
        const data = await res.json()
        if (active && data.leaderboard) setLeaderboard(data.leaderboard)
      } catch (err) {
        console.error(err)
      }
    }

    void fetchLeaderboard()
    return () => {
      active = false
    }
  }, [selectedCampaign])

  const rankColors = ['text-amber-500', 'text-gray-400', 'text-amber-700']
  const rankBg = ['bg-amber-50 border-amber-200', 'bg-gray-50 border-gray-200', 'bg-orange-50 border-orange-200']

  if (authLoading || loading) return <LoadingSpinner />
  if (!user) return null

  return (
    <>
      <CabecalhoUsuario />
      <main className="max-w-lg mx-auto px-4 py-4 pb-24">
        <h1 className="text-xl font-bold text-gray-900 mb-4">Ranking</h1>

        {/* Campaign Filter */}
        <select
          value={selectedCampaign}
          onChange={(e) => setSelectedCampaign(e.target.value)}
          className="w-full mb-4 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-white text-sm"
        >
          {campaigns.map((c) => (
            <option key={c.id} value={c.id}>{c.title}</option>
          ))}
        </select>

        {/* Leaderboard */}
        <div className="space-y-2">
          {leaderboard.map((entry, i) => {
            const isMe = entry.user_id === profile?.id
            const isTop3 = i < 3
            return (
              <div
                key={`${entry.user_id}-${i}`}
                className={`flex items-center gap-3 p-3 rounded-xl border transition ${
                  isMe ? 'bg-indigo-50 border-indigo-300 ring-2 ring-indigo-200' :
                  isTop3 ? rankBg[i] : 'bg-white border-gray-100'
                }`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                  isTop3 ? rankColors[i] : 'text-gray-400'
                }`}>
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium truncate ${isMe ? 'text-indigo-700' : 'text-gray-900'}`}>
                    {entry.full_name} {isMe && '(Voce)'}
                  </p>
                  {entry.store_name && (
                    <p className="text-[10px] text-gray-500">{entry.store_name}</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-indigo-600">{entry.campaign_points} pts</p>
                  <p className="text-[10px] text-gray-500">{entry.approved_coupons} cupons</p>
                </div>
              </div>
            )
          })}
          {leaderboard.length === 0 && (
            <div className="text-center py-12 text-gray-500 text-sm">
              Nenhum participante ainda nesta campanha.
            </div>
          )}
        </div>
      </main>
      <BarraNavegacao />
    </>
  )
}

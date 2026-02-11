'use client'

import { useState, useEffect } from 'react'
import type { Campaign } from '@/types/campaign'
import type { GoalProgress } from '@/types/goal'

interface ProgressoMetasProps {
  campaigns: Campaign[]
}

export default function ProgressoMetas({ campaigns }: ProgressoMetasProps) {
  const [progress, setProgress] = useState<Record<string, GoalProgress[]>>({})

  useEffect(() => {
    const campaignsWithGoals = campaigns.filter(c => c.settings?.goals?.length)
    campaignsWithGoals.forEach(async (campaign) => {
      try {
        const res = await fetch(`/api/goals/progress?campaign_id=${campaign.id}`)
        const data = await res.json()
        if (data.progress) {
          setProgress(prev => ({ ...prev, [campaign.id]: data.progress }))
        }
      } catch (err) {
        console.error(err)
      }
    })
  }, [campaigns])

  const campaignsWithGoals = campaigns.filter(c => c.settings?.goals?.length)
  if (campaignsWithGoals.length === 0) return null

  return (
    <section className="mb-6">
      <h2 className="text-sm font-semibold text-gray-700 mb-3 px-1">Progresso das Metas</h2>
      <div className="space-y-3">
        {campaignsWithGoals.map((campaign) => {
          const goalProgress = progress[campaign.id] || []
          return (
            <div key={campaign.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">{campaign.title}</h3>
              {goalProgress.length === 0 ? (
                <p className="text-xs text-gray-400">Carregando metas...</p>
              ) : (
                <div className="space-y-3">
                  {goalProgress.map((gp) => (
                    <div key={gp.goal.id}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-gray-700">{gp.goal.label}</span>
                        <span className="text-xs text-gray-500">
                          {gp.current_count}/{gp.target}
                          {gp.is_completed && (
                            <span className="ml-1.5 text-green-600 font-bold">Meta atingida!</span>
                          )}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div
                          className={`h-2.5 rounded-full transition-all duration-500 ${
                            gp.is_completed ? 'bg-green-500' : 'bg-indigo-500'
                          }`}
                          style={{ width: `${gp.percentage}%` }}
                        />
                      </div>
                      <div className="flex gap-2 mt-1">
                        {gp.goal.bonus_points > 0 && (
                          <span className="text-[10px] text-gray-500">+{gp.goal.bonus_points} pts</span>
                        )}
                        {gp.goal.lucky_numbers > 0 && (
                          <span className="text-[10px] text-gray-500">+{gp.goal.lucky_numbers} numero(s) da sorte</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}

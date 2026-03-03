'use client'

import { useState, useEffect, useRef } from 'react'
import type { Campaign } from '@/types/campaign'
import type { GoalProgress } from '@/types/goal'

interface ProgressoMetasProps {
  campaigns: Campaign[]
}

export default function ProgressoMetas({ campaigns }: ProgressoMetasProps) {
  const [progress, setProgress] = useState<Record<string, GoalProgress[]>>({})
  const celebratedGoalsRef = useRef(new Set<string>())

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

  // ── Confetti trigger: fires once per completed goal (per session) ─────────
  useEffect(() => {
    const allGoals = Object.values(progress).flat()
    const newlyCompleted = allGoals.filter(
      (gp) => gp.is_completed && !celebratedGoalsRef.current.has(gp.goal.id)
    )
    if (newlyCompleted.length === 0) return

    newlyCompleted.forEach((gp) => celebratedGoalsRef.current.add(gp.goal.id))

    void import('canvas-confetti').then(({ default: confetti }) => {
      void confetti({
        particleCount: 140,
        spread: 80,
        origin: { y: 0.55 },
        colors: ['#d4af37', '#f5c842', '#6366f1', '#8b5cf6', '#ec4899', '#ffffff'],
        gravity: 0.9,
        scalar: 1.1,
      })
    })
  }, [progress])

  const campaignsWithGoals = campaigns.filter(c => c.settings?.goals?.length)
  if (campaignsWithGoals.length === 0) return null

  return (
    <section className="mb-6">
      <h2 className="text-sm font-semibold text-gray-700 mb-3 px-1">Progresso das Metas</h2>
      <div className="space-y-3">
        {campaignsWithGoals.map((campaign) => {
          const goalProgress = progress[campaign.id] || []
          const hasAnyCompleted = goalProgress.some((gp) => gp.is_completed)
          return (
            <div
              key={campaign.id}
              className={`rounded-xl p-4 transition-all duration-500 ${
                hasAnyCompleted
                  ? 'bg-gradient-to-br from-yellow-50 to-amber-50 border-2 border-yellow-400'
                  : 'bg-white border border-gray-100 shadow-sm'
              }`}
              style={hasAnyCompleted ? {
                boxShadow: '0 0 0 1px rgba(212,175,55,0.25), 0 4px 20px rgba(212,175,55,0.18)',
              } : undefined}
            >
              <div className="flex items-center gap-2 mb-3">
                {hasAnyCompleted && (
                  <svg className="w-4 h-4 text-yellow-500 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                  </svg>
                )}
                <h3 className={`text-sm font-semibold ${hasAnyCompleted ? 'text-yellow-800' : 'text-gray-900'}`}>
                  {campaign.title}
                </h3>
              </div>

              {goalProgress.length === 0 ? (
                <p className="text-xs text-gray-400">Carregando metas...</p>
              ) : (
                <div className="space-y-3">
                  {goalProgress.map((gp) => (
                    <div key={gp.goal.id}>
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-xs font-medium ${gp.is_completed ? 'text-yellow-800' : 'text-gray-700'}`}>
                          {gp.goal.label}
                        </span>
                        <span className={`text-xs font-semibold ${gp.is_completed ? 'text-yellow-700' : 'text-gray-500'}`}>
                          {gp.current_count}/{gp.target}
                          {gp.is_completed && (
                            <span className="ml-1.5 text-yellow-600"> Meta atingida!</span>
                          )}
                        </span>
                      </div>

                      {/* Progress bar: gold when completed, indigo otherwise */}
                      <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                        <div
                          className={`h-2.5 rounded-full transition-all duration-700 ${
                            gp.is_completed
                              ? 'bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-500'
                              : 'bg-indigo-500'
                          }`}
                          style={{
                            width: `${gp.percentage}%`,
                            boxShadow: gp.is_completed ? '0 0 6px rgba(212,175,55,0.5)' : undefined,
                          }}
                        />
                      </div>

                      <div className="flex gap-2 mt-1">
                        {gp.goal.bonus_points > 0 && (
                          <span className={`text-[10px] ${gp.is_completed ? 'text-yellow-600 font-semibold' : 'text-gray-500'}`}>
                            +{gp.goal.bonus_points} pts
                          </span>
                        )}
                        {gp.goal.lucky_numbers > 0 && (
                          <span className={`text-[10px] ${gp.is_completed ? 'text-yellow-600 font-semibold' : 'text-gray-500'}`}>
                            +{gp.goal.lucky_numbers} numero(s) da sorte
                          </span>
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

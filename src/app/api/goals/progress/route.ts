import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { CampaignSettings, GoalConfig } from '@/types/goal'

// GET /api/goals/progress?campaign_id=...
export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const campaignId = searchParams.get('campaign_id')

    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!campaignId) {
      return NextResponse.json(
        { error: 'campaign_id is required' },
        { status: 400 }
      )
    }

    // Get campaign settings
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('settings')
      .eq('id', campaignId)
      .single()

    if (campaignError) throw campaignError

    const settings = campaign?.settings as CampaignSettings | null
    if (!settings?.goals?.length) {
      return NextResponse.json({ progress: [] })
    }

    // Get user's goal completions for this campaign
    const { data: completions } = await supabase
      .from('goal_completions')
      .select('*')
      .eq('user_id', session.user.id)
      .eq('campaign_id', campaignId)

    // For each goal, calculate current progress
    const progress = await Promise.all(
      settings.goals.map(async (goal: GoalConfig) => {
        // Calculate period boundaries
        const now = new Date()
        let periodStart: string
        let periodEnd: string

        if (goal.period === 'weekly') {
          const day = now.getDay()
          const monday = new Date(now)
          monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1))
          monday.setHours(0, 0, 0, 0)
          periodStart = monday.toISOString().split('T')[0]
          const sunday = new Date(monday)
          sunday.setDate(monday.getDate() + 6)
          periodEnd = sunday.toISOString().split('T')[0]
        } else {
          const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
          periodStart = firstDay.toISOString().split('T')[0]
          const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0)
          periodEnd = lastDay.toISOString().split('T')[0]
        }

        // Count approved coupons in period
        const { count } = await supabase
          .from('coupons')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', session.user.id)
          .eq('campaign_id', campaignId)
          .eq('status', 'approved')
          .gte('created_at', periodStart)
          .lt('created_at', periodEnd + 'T23:59:59.999Z')

        const currentCount = count || 0
        const completion = completions?.find(
          (c) => c.goal_id === goal.id && c.period_start === periodStart
        )

        return {
          goal,
          current_count: currentCount,
          target: goal.target,
          percentage: Math.min(100, Math.round((currentCount / goal.target) * 100)),
          is_completed: !!completion,
          completion: completion || undefined,
        }
      })
    )

    return NextResponse.json({ progress })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch goal progress' },
      { status: 500 }
    )
  }
}

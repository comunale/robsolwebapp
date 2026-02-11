import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// POST /api/draws - Execute a draw (admin only)
export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single()

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin only' }, { status: 403 })
    }

    const body = await request.json()
    const { campaign_id, draw_count = 1 } = body

    if (!campaign_id) {
      return NextResponse.json(
        { error: 'campaign_id is required' },
        { status: 400 }
      )
    }

    // Get eligible (non-winner) lucky numbers for this campaign
    const { data: eligible, error: fetchError } = await supabase
      .from('lucky_numbers')
      .select('*')
      .eq('campaign_id', campaign_id)
      .eq('is_winner', false)

    if (fetchError) throw fetchError

    if (!eligible || eligible.length === 0) {
      return NextResponse.json(
        { error: 'No eligible lucky numbers in the pool' },
        { status: 400 }
      )
    }

    const count = Math.min(draw_count, eligible.length)
    const winners: typeof eligible = []

    // Fisher-Yates shuffle and pick first N
    const shuffled = [...eligible]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }

    for (let i = 0; i < count; i++) {
      const winner = shuffled[i]
      winners.push(winner)

      // Mark as winner
      await supabase
        .from('lucky_numbers')
        .update({
          is_winner: true,
          drawn_at: new Date().toISOString(),
        })
        .eq('id', winner.id)

      // Notify the winner
      await supabase.from('notifications').insert({
        user_id: winner.user_id,
        type: 'draw_winner',
        title: 'Voce foi sorteado!',
        body: `Seu numero da sorte ${winner.number} foi sorteado! Parabens!`,
        data: { campaign_id, lucky_number_id: winner.id, number: winner.number },
      })
    }

    return NextResponse.json({
      message: `${count} winner(s) drawn successfully`,
      winners: winners.map((w) => ({
        id: w.id,
        user_id: w.user_id,
        number: w.number,
      })),
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to execute draw' },
      { status: 500 }
    )
  }
}

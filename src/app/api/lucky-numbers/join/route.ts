import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

// POST /api/lucky-numbers/join
// Body: { campaign_id }
// User-triggered raffle entry for raffle_only campaigns.
// Idempotent: returns existing number if user already joined.
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const { campaign_id } = await request.json()
    if (!campaign_id) return NextResponse.json({ error: 'campaign_id é obrigatório' }, { status: 400 })

    const admin = createAdminClient()
    const userId = session.user.id

    const { data: campaign } = await admin
      .from('campaigns')
      .select('id, type, is_active')
      .eq('id', campaign_id)
      .single()

    if (!campaign?.is_active) {
      return NextResponse.json({ error: 'Campanha não encontrada ou inativa' }, { status: 404 })
    }
    if (campaign.type !== 'raffle_only') {
      return NextResponse.json({ error: 'Esta campanha não é do tipo sorteio' }, { status: 400 })
    }

    // Idempotent: return existing entry if already joined
    const { data: existing } = await admin
      .from('lucky_numbers')
      .select('id, number')
      .eq('user_id', userId)
      .eq('campaign_id', campaign_id)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ lucky_number: existing, already_joined: true })
    }

    // Get next sequential number
    const { count } = await admin
      .from('lucky_numbers')
      .select('id', { count: 'exact', head: true })
      .eq('campaign_id', campaign_id)

    const nextNumber = (count ?? 0) + 1

    const { data: luckyNumber, error: insertErr } = await admin
      .from('lucky_numbers')
      .insert({
        user_id: userId,
        campaign_id,
        number: nextNumber,
        goal_completion_id: null,
        is_winner: false,
        is_public: false,
      })
      .select('id, number')
      .single()

    if (insertErr) throw insertErr

    return NextResponse.json({ lucky_number: luckyNumber }, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Erro' }, { status: 500 })
  }
}

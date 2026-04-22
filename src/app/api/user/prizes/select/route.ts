import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

// POST /api/user/prizes/select
// Body: { prize_id, campaign_id? }
// Validates balance, reserves points, inserts selection.
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const { prize_id, campaign_id } = await request.json()
    if (!prize_id) return NextResponse.json({ error: 'prize_id é obrigatório' }, { status: 400 })

    const admin = createAdminClient()
    const userId = session.user.id

    // Load prize
    const { data: prize, error: prizeErr } = await admin
      .from('prizes_catalog')
      .select('id, points_cost, is_active')
      .eq('id', prize_id)
      .single()

    if (prizeErr || !prize) return NextResponse.json({ error: 'Prêmio não encontrado' }, { status: 404 })
    if (!prize.is_active) return NextResponse.json({ error: 'Prêmio indisponível' }, { status: 409 })

    // Load profile for balance check
    const { data: profile } = await admin
      .from('profiles')
      .select('total_points, allocated_points')
      .eq('id', userId)
      .single()

    const spendable = (profile?.total_points ?? 0) - (profile?.allocated_points ?? 0)
    if (spendable < prize.points_cost) {
      return NextResponse.json({
        error: `Pontos insuficientes. Você tem ${spendable} pts disponíveis, o prêmio custa ${prize.points_cost} pts.`,
      }, { status: 422 })
    }

    // Insert selection
    const { data: selection, error: insertErr } = await admin
      .from('user_prize_selections')
      .insert({ user_id: userId, prize_id, campaign_id: campaign_id ?? null, status: 'pending' })
      .select()
      .single()

    if (insertErr) throw insertErr

    // Reserve points atomically
    await admin.rpc('increment_allocated_points', { uid: userId, amount: prize.points_cost })

    return NextResponse.json({ selection }, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Erro' }, { status: 500 })
  }
}

// DELETE /api/user/prizes/select
// Body: { selection_id } — cancels a pending selection and releases allocated points
export async function DELETE(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const { selection_id } = await request.json()
    if (!selection_id) return NextResponse.json({ error: 'selection_id é obrigatório' }, { status: 400 })

    const admin = createAdminClient()
    const userId = session.user.id

    const { data: sel } = await admin
      .from('user_prize_selections')
      .select('id, status, user_id, prizes_catalog!prize_id(points_cost)')
      .eq('id', selection_id)
      .eq('user_id', userId)
      .single()

    if (!sel) return NextResponse.json({ error: 'Seleção não encontrada' }, { status: 404 })
    if (sel.status !== 'pending') return NextResponse.json({ error: 'Seleção já processada' }, { status: 409 })

    await admin.from('user_prize_selections').update({ status: 'cancelled' }).eq('id', selection_id)

    const prize = (sel.prizes_catalog as unknown) as { points_cost: number } | null
    if (prize?.points_cost) {
      await admin.rpc('decrement_allocated_points', { uid: userId, amount: prize.points_cost })
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Erro' }, { status: 500 })
  }
}

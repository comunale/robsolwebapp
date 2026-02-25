import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/**
 * POST /api/lucky-numbers/sync
 * Admin-only. For a given campaign, generates lucky numbers for users who have
 * approved coupons but missing lucky number entries.
 *
 * Rule: each approved coupon = 1 lucky number.
 * If a user already has N lucky numbers and has M > N approved coupons,
 * the difference (M - N) new entries are created.
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single()

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Acesso negado - apenas admin' }, { status: 403 })
    }

    const body = await request.json()
    const { campaign_id } = body as { campaign_id: string }

    if (!campaign_id) {
      return NextResponse.json({ error: 'campaign_id e obrigatorio' }, { status: 400 })
    }

    // ── 1. Count approved coupons per user for this campaign ──────────────
    const { data: approvedCoupons, error: couponsErr } = await supabase
      .from('coupons')
      .select('user_id')
      .eq('campaign_id', campaign_id)
      .eq('status', 'approved')

    if (couponsErr) throw couponsErr

    if (!approvedCoupons || approvedCoupons.length === 0) {
      return NextResponse.json({ message: 'Nenhum cupom aprovado nesta campanha', created: 0 })
    }

    // Count coupons per user
    const couponCountByUser = new Map<string, number>()
    for (const { user_id } of approvedCoupons) {
      couponCountByUser.set(user_id, (couponCountByUser.get(user_id) ?? 0) + 1)
    }

    // ── 2. Count existing lucky numbers per user for this campaign ─────────
    const { data: existingNumbers, error: numbersErr } = await supabase
      .from('lucky_numbers')
      .select('user_id, number')
      .eq('campaign_id', campaign_id)

    if (numbersErr) throw numbersErr

    const luckyCountByUser = new Map<string, number>()
    let maxNumber = 0
    for (const { user_id, number } of existingNumbers ?? []) {
      luckyCountByUser.set(user_id, (luckyCountByUser.get(user_id) ?? 0) + 1)
      if (number > maxNumber) maxNumber = number
    }

    // ── 3. Build inserts for the gap ──────────────────────────────────────
    const inserts: { user_id: string; campaign_id: string; number: number; is_winner: boolean }[] = []

    for (const [userId, couponCount] of couponCountByUser) {
      const alreadyHas = luckyCountByUser.get(userId) ?? 0
      const needed = couponCount - alreadyHas
      for (let i = 0; i < needed; i++) {
        maxNumber++
        inserts.push({ user_id: userId, campaign_id, number: maxNumber, is_winner: false })
      }
    }

    if (inserts.length === 0) {
      return NextResponse.json({ message: 'Todos os numeros ja estao sincronizados', created: 0 })
    }

    const { error: insertErr } = await supabase.from('lucky_numbers').insert(inserts)
    if (insertErr) throw insertErr

    return NextResponse.json({
      message: `${inserts.length} numero(s) da sorte gerado(s)`,
      created: inserts.length,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Falha ao sincronizar numeros da sorte'
    console.error('[lucky-numbers/sync] error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

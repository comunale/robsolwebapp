import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// POST /api/lucky-numbers/select-prize
// Body: { lucky_number_id, prize_id }
// Allows a draw winner to choose their prize. Idempotent if same prize re-selected.
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const { lucky_number_id, prize_id } = await request.json() as {
      lucky_number_id?: string
      prize_id?: string
    }

    if (!lucky_number_id || !prize_id) {
      return NextResponse.json({ error: 'lucky_number_id e prize_id são obrigatórios' }, { status: 400 })
    }

    // Verify ownership and winner status
    const { data: luckyNumber, error: lnError } = await supabase
      .from('lucky_numbers')
      .select('id, user_id, campaign_id, is_winner, selected_prize_id')
      .eq('id', lucky_number_id)
      .eq('user_id', session.user.id)
      .single()

    if (lnError || !luckyNumber) {
      return NextResponse.json({ error: 'Número da sorte não encontrado' }, { status: 404 })
    }
    if (!luckyNumber.is_winner) {
      return NextResponse.json({ error: 'Apenas ganhadores podem selecionar prêmios' }, { status: 403 })
    }
    if (luckyNumber.selected_prize_id && luckyNumber.selected_prize_id !== prize_id) {
      return NextResponse.json({ error: 'Prêmio já selecionado anteriormente' }, { status: 409 })
    }
    if (luckyNumber.selected_prize_id === prize_id) {
      return NextResponse.json({ message: 'Prêmio já selecionado', prize_id })
    }

    // Verify prize belongs to this campaign (check both legacy direct FK and join table)
    const [directRes, joinRes] = await Promise.all([
      supabase
        .from('prizes_catalog')
        .select('id')
        .eq('id', prize_id)
        .eq('campaign_id', luckyNumber.campaign_id)
        .maybeSingle(),
      supabase
        .from('campaign_prizes')
        .select('id')
        .eq('prize_id', prize_id)
        .eq('campaign_id', luckyNumber.campaign_id)
        .maybeSingle(),
    ])

    if (!directRes.data && !joinRes.data) {
      return NextResponse.json({ error: 'Prêmio não pertence a esta campanha' }, { status: 400 })
    }

    const { error: updateError } = await supabase
      .from('lucky_numbers')
      .update({ selected_prize_id: prize_id })
      .eq('id', lucky_number_id)

    if (updateError) throw updateError

    return NextResponse.json({ message: 'Prêmio selecionado com sucesso', prize_id })
  } catch (e) {
    console.error('[select-prize] error:', e)
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Erro' }, { status: 500 })
  }
}

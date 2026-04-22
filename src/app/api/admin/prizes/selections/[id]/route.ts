import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return { error: NextResponse.json({ error: 'Não autorizado' }, { status: 401 }) }
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', session.user.id).single()
  if (profile?.role !== 'admin') return { error: NextResponse.json({ error: 'Acesso negado' }, { status: 403 }) }
  return { error: null }
}

// PATCH /api/admin/prizes/selections/[id] — fulfill or cancel a selection
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error: authError } = await requireAdmin()
  if (authError) return authError

  const { id } = await params
  const { status } = await request.json()

  if (!['fulfilled', 'cancelled'].includes(status)) {
    return NextResponse.json({ error: 'status inválido' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Fetch the selection to get user_id and prize points_cost
  const { data: selection, error: fetchError } = await admin
    .from('user_prize_selections')
    .select('id, status, user_id, prizes_catalog!prize_id(points_cost)')
    .eq('id', id)
    .single()

  if (fetchError || !selection) {
    return NextResponse.json({ error: 'Seleção não encontrada' }, { status: 404 })
  }

  if (selection.status !== 'pending') {
    return NextResponse.json({ error: 'Seleção já processada' }, { status: 409 })
  }

  // Update selection status
  const { error: updateError } = await admin
    .from('user_prize_selections')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

  // Release allocated_points when cancelled or fulfilled
  const prize = (selection.prizes_catalog as unknown) as { points_cost: number } | null
  const cost = prize?.points_cost ?? 0
  if (cost > 0) {
    await admin.rpc('decrement_allocated_points', { uid: selection.user_id, amount: cost })
  }

  return NextResponse.json({ ok: true })
}

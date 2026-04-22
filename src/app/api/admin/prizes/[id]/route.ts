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

// PATCH /api/admin/prizes/[id] — update a prize
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error: authError } = await requireAdmin()
  if (authError) return authError

  const { id } = await params
  const body = await request.json()

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('prizes_catalog')
    .update({ ...body, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ prize: data })
}

// DELETE /api/admin/prizes/[id] — soft-delete by setting is_active = false
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error: authError } = await requireAdmin()
  if (authError) return authError

  const { id } = await params
  const admin = createAdminClient()

  // Check if there are pending selections before deactivating
  const { count } = await admin
    .from('user_prize_selections')
    .select('id', { count: 'exact', head: true })
    .eq('prize_id', id)
    .eq('status', 'pending')

  if ((count ?? 0) > 0) {
    return NextResponse.json(
      { error: `Não é possível remover: ${count} seleção(ões) pendente(s) para este prêmio.` },
      { status: 409 },
    )
  }

  const { error } = await admin
    .from('prizes_catalog')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

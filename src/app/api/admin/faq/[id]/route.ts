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

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error: authError } = await requireAdmin()
  if (authError) return authError

  const { id } = await params
  const admin = createAdminClient()
  const body = await request.json()

  const allowed: Record<string, unknown> = {}
  if (body.question    !== undefined) allowed.question    = String(body.question).trim()
  if (body.answer      !== undefined) allowed.answer      = String(body.answer).trim()
  if (body.category    !== undefined) allowed.category    = String(body.category).trim() || 'Geral'
  if (body.order_index !== undefined) allowed.order_index = Number(body.order_index)
  if (body.is_active   !== undefined) allowed.is_active   = Boolean(body.is_active)

  const { data, error } = await admin
    .from('faq_items')
    .update(allowed)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ item: data })
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error: authError } = await requireAdmin()
  if (authError) return authError

  const { id } = await params
  const admin = createAdminClient()
  const { error } = await admin.from('faq_items').delete().eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

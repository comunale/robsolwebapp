import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// PATCH /api/users/[id] - Admin updates a user profile
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { id } = await params

    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })
    }

    const { data: adminProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single()

    if (adminProfile?.role !== 'admin') {
      return NextResponse.json({ error: 'Acesso negado - apenas admin' }, { status: 403 })
    }

    const body = await request.json() as {
      full_name?: string
      email?: string
      whatsapp?: string
      store_id?: string | null
      role?: string
    }

    // Whitelist updatable fields
    const update: Record<string, unknown> = {}
    if (body.full_name !== undefined) update.full_name = body.full_name
    if (body.email !== undefined) update.email = body.email
    if (body.whatsapp !== undefined) update.whatsapp = body.whatsapp
    if (body.store_id !== undefined) update.store_id = body.store_id || null
    if (body.role !== undefined) {
      const allowed = ['admin', 'moderator', 'user']
      if (!allowed.includes(body.role)) {
        return NextResponse.json({ error: 'Role inválido' }, { status: 400 })
      }
      update.role = body.role
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: 'Nenhum campo para atualizar' }, { status: 400 })
    }

    const { data: profile, error } = await supabase
      .from('profiles')
      .update(update)
      .eq('id', id)
      .select('*, stores(name)')
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
      }
      throw error
    }

    return NextResponse.json({ profile })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Falha ao atualizar usuário'
    console.error('[PATCH /api/users/[id]] error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

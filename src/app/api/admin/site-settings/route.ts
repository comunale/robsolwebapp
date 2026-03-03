import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return { supabase, error: NextResponse.json({ error: 'Não autorizado' }, { status: 401 }) }
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', session.user.id).single()
  if (profile?.role !== 'admin') return { supabase, error: NextResponse.json({ error: 'Acesso negado' }, { status: 403 }) }
  return { supabase, error: null }
}

// GET /api/admin/site-settings — returns all rows with key, label, value
export async function GET() {
  const { supabase, error } = await requireAdmin()
  if (error) return error

  const { data, error: dbError } = await supabase
    .from('site_settings')
    .select('key, label, value')
    .order('key')

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })
  return NextResponse.json({ settings: data })
}

// POST /api/admin/site-settings — upsert { key, value }
export async function POST(request: Request) {
  const { supabase, error } = await requireAdmin()
  if (error) return error

  const body: { key: string; value: string } = await request.json()
  if (!body.key) return NextResponse.json({ error: 'key é obrigatório' }, { status: 400 })

  const { error: dbError } = await supabase
    .from('site_settings')
    .update({ value: body.value ?? '', updated_at: new Date().toISOString() })
    .eq('key', body.key)

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

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

// GET /api/admin/site-settings — returns all rows with key, label, value
export async function GET() {
  const { error: authError } = await requireAdmin()
  if (authError) return authError

  // Use session client for reads (public SELECT policy allows this)
  const supabase = await createClient()
  const { data, error: dbError } = await supabase
    .from('site_settings')
    .select('key, label, value')
    .order('key')

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })
  return NextResponse.json({ settings: data })
}

// POST /api/admin/site-settings — upsert { key, value }
export async function POST(request: Request) {
  const { error: authError } = await requireAdmin()
  if (authError) return authError

  const body: { key: string; value: string } = await request.json()
  if (!body.key) return NextResponse.json({ error: 'key é obrigatório' }, { status: 400 })

  // Use service-role client for writes (bypasses RLS)
  const admin = createAdminClient()
  const { error: dbError } = await admin
    .from('site_settings')
    .upsert(
      { key: body.key, label: body.key, value: body.value ?? '', updated_at: new Date().toISOString() },
      { onConflict: 'key' },
    )

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

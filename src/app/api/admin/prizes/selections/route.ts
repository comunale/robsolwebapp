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

// GET /api/admin/prizes/selections — all selections with user + prize info
export async function GET() {
  const { error: authError } = await requireAdmin()
  if (authError) return authError

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('user_prize_selections')
    .select(`
      id,
      status,
      created_at,
      updated_at,
      campaign_id,
      profiles!user_id ( id, full_name, email, whatsapp, total_points, allocated_points ),
      prizes_catalog!prize_id ( id, title, points_cost, image_url ),
      campaigns!campaign_id ( title )
    `)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ selections: data })
}

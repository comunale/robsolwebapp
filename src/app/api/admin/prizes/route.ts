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

// GET /api/admin/prizes — list all prizes (admin sees all including inactive)
export async function GET() {
  const { error: authError } = await requireAdmin()
  if (authError) return authError

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('prizes_catalog')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ prizes: data })
}

// POST /api/admin/prizes — create a new prize
export async function POST(request: Request) {
  const { error: authError } = await requireAdmin()
  if (authError) return authError

  const body = await request.json()
  const { title, points_cost, image_url, image_horizontal, description, is_active, pdf_url, images } = body

  if (!title) {
    return NextResponse.json({ error: 'title é obrigatório' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('prizes_catalog')
    .insert({
      title,
      points_cost: points_cost != null && points_cost !== '' ? Number(points_cost) : null,
      image_url: image_url || null,
      image_horizontal: image_horizontal || null,
      description,
      is_active: is_active ?? true,
      pdf_url: pdf_url || null,
      images: Array.isArray(images) ? images : [],
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ prize: data }, { status: 201 })
}

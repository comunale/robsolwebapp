import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

// GET /api/campaigns/[id]/prizes
// Returns prizes for the campaign (via campaign_prizes OR legacy prizes_catalog.campaign_id),
// plus the authenticated user's spendable balance and pending prize selections.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const admin = createAdminClient()
  const userId = session.user.id

  const [cpRes, legacyRes, profileRes, selectionsRes] = await Promise.all([
    // New: via campaign_prizes join table
    admin
      .from('campaign_prizes')
      .select('prizes_catalog(id, title, points_cost, image_url, image_horizontal, images, pdf_url, description)')
      .eq('campaign_id', id),
    // Legacy: prizes that have campaign_id set directly
    admin
      .from('prizes_catalog')
      .select('id, title, points_cost, image_url, image_horizontal, images, pdf_url, description')
      .eq('campaign_id', id)
      .eq('is_active', true),
    admin.from('profiles').select('total_points, allocated_points').eq('id', userId).single(),
    admin.from('user_prize_selections').select('id, prize_id, status').eq('user_id', userId).eq('status', 'pending'),
  ])

  // Merge and deduplicate prizes from both sources
  type RawPrize = {
    id: string; title: string; points_cost: number | null
    image_url: string | null; image_horizontal: string | null
    images: string[] | null; pdf_url: string | null; description: string | null
  }
  const cpPrizes = (cpRes.data ?? [])
    .map((r) => r.prizes_catalog as unknown as RawPrize | null)
    .filter((p): p is RawPrize => p !== null)
  const legacyPrizes = (legacyRes.data ?? []) as RawPrize[]

  const seen = new Set<string>()
  const prizes = [...cpPrizes, ...legacyPrizes].filter((p) => {
    if (seen.has(p.id)) return false
    seen.add(p.id)
    return true
  })

  const profile = profileRes.data
  const spendable = (profile?.total_points ?? 0) - (profile?.allocated_points ?? 0)

  return NextResponse.json({
    prizes,
    spendablePoints: spendable,
    totalPoints: profile?.total_points ?? 0,
    pendingSelections: selectionsRes.data ?? [],
  })
}

// PUT /api/campaigns/[id]/prizes  (admin only)
// Body: { prize_ids: string[] }
// Replaces all campaign_prizes entries for the campaign.
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', session.user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })

  const { prize_ids } = (await request.json()) as { prize_ids: string[] }

  const admin = createAdminClient()
  await admin.from('campaign_prizes').delete().eq('campaign_id', id)

  if (prize_ids.length > 0) {
    const rows = prize_ids.map((prize_id) => ({ campaign_id: id, prize_id }))
    const { error } = await admin.from('campaign_prizes').insert(rows)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

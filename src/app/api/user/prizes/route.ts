import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

// GET /api/user/prizes
// Returns active prizes visible to the authenticated user:
//   - Global prizes (campaign_id IS NULL)
//   - Prizes linked to a campaign the user is participating in
// Also returns user's current pending selection (if any) and spendable balance.
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const admin = createAdminClient()
    const userId = session.user.id

    // Fetch user profile for points
    const { data: profile } = await admin
      .from('profiles')
      .select('total_points, allocated_points')
      .eq('id', userId)
      .single()

    // Fetch user's active campaign participations
    const { data: participations } = await admin
      .from('campaign_participants')
      .select('campaign_id')
      .eq('user_id', userId)

    const campaignIds = (participations ?? []).map((p) => p.campaign_id)

    // Fetch eligible prizes: global OR in one of the user's campaigns
    const { data: prizes, error } = await admin
      .from('prizes_catalog')
      .select('id, title, points_cost, image_url, description, campaign_id')
      .eq('is_active', true)
      .or(`campaign_id.is.null${campaignIds.length > 0 ? `,campaign_id.in.(${campaignIds.join(',')})` : ''}`)
      .order('points_cost', { ascending: true })

    if (error) throw error

    // Fetch user's pending selection
    const { data: pendingSelections } = await admin
      .from('user_prize_selections')
      .select('id, prize_id, status, created_at, prizes_catalog!prize_id(title, points_cost)')
      .eq('user_id', userId)
      .eq('status', 'pending')

    const spendable = (profile?.total_points ?? 0) - (profile?.allocated_points ?? 0)

    return NextResponse.json({
      prizes: prizes ?? [],
      pendingSelections: pendingSelections ?? [],
      totalPoints: profile?.total_points ?? 0,
      allocatedPoints: profile?.allocated_points ?? 0,
      spendablePoints: spendable,
    })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Erro' }, { status: 500 })
  }
}

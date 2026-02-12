import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET /api/leaderboard?campaign_id=...&store_id=...
export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const campaignId = searchParams.get('campaign_id')
    const storeId = searchParams.get('store_id')

    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })
    }

    let query = supabase
      .from('leaderboard')
      .select('*')
      .order('campaign_points', { ascending: false })

    if (campaignId) {
      query = query.eq('campaign_id', campaignId)
    }

    if (storeId) {
      query = query.eq('store_id', storeId)
    }

    const { data: leaderboard, error } = await query

    if (error) throw error

    return NextResponse.json({ leaderboard })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Falha ao buscar ranking' },
      { status: 500 }
    )
  }
}

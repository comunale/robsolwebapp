import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET /api/lucky-numbers?campaign_id=...
export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const campaignId = searchParams.get('campaign_id')

    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single()

    let query = supabase
      .from('lucky_numbers')
      .select('*')
      .order('number', { ascending: true })

    // Non-admin users only see their own numbers
    if (profile?.role !== 'admin') {
      query = query.eq('user_id', session.user.id)
    }

    if (campaignId) {
      query = query.eq('campaign_id', campaignId)
    }

    const { data: luckyNumbers, error } = await query

    if (error) throw error

    return NextResponse.json({ lucky_numbers: luckyNumbers })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch lucky numbers' },
      { status: 500 }
    )
  }
}

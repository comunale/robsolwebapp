import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET /api/coupons - Get coupons (filtered by role)
export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const campaignId = searchParams.get('campaign_id')

    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single()

    let query = supabase
      .from('coupons')
      .select('*, profiles(full_name, email), campaigns(title, keywords)')
      .order('created_at', { ascending: false })

    // If user (not admin), only show their own coupons
    if (profile?.role !== 'admin') {
      query = query.eq('user_id', session.user.id)
    }

    if (status) {
      query = query.eq('status', status)
    }

    if (campaignId) {
      query = query.eq('campaign_id', campaignId)
    }

    const { data: coupons, error } = await query

    if (error) throw error

    return NextResponse.json({ coupons })
  } catch (error: any) {
    console.error('Error fetching coupons:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch coupons' },
      { status: 500 }
    )
  }
}

// POST /api/coupons - Create a new coupon
export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    const { data: coupon, error } = await supabase
      .from('coupons')
      .insert({
        user_id: session.user.id,
        campaign_id: body.campaign_id,
        image_url: body.image_url,
        extracted_data: body.extracted_data || null,
        status: 'pending',
        points_awarded: 0,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ coupon }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating coupon:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create coupon' },
      { status: 500 }
    )
  }
}

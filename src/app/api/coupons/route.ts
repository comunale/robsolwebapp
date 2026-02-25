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
      return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })
    }

    // Check role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single()

    let query = supabase
      .from('coupons')
      .select('*, profiles!coupons_user_id_fkey(full_name, email), campaigns(title, keywords)')
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
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Falha ao buscar cupons'
    console.error('Error fetching coupons:', error)
    return NextResponse.json(
      { error: message },
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
      console.warn('[coupons POST] Unauthorized — no session')
      return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { campaign_id, image_url, extracted_data } = body

    console.log('[coupons POST] ▶ user:', session.user.id)
    console.log('[coupons POST] campaign:', campaign_id)
    console.log('[coupons POST] image_url:', image_url)
    console.log('[coupons POST] submission_type:', extracted_data?.submission_type)
    console.log('[coupons POST] receipt_number:', extracted_data?.receipt_number ?? 'none')

    // Anti-fraud: block duplicate receipt numbers within the same campaign
    if (extracted_data?.receipt_number) {
      console.log('[coupons POST] Checking for duplicate receipt number...')
      const { data: duplicate } = await supabase
        .from('coupons')
        .select('id')
        .eq('campaign_id', campaign_id)
        .filter('extracted_data->>receipt_number', 'eq', extracted_data.receipt_number)
        .maybeSingle()

      if (duplicate) {
        console.warn('[coupons POST] Duplicate receipt detected, existing coupon id:', duplicate.id)
        return NextResponse.json(
          { error: 'Este cupom fiscal já foi enviado nesta campanha.' },
          { status: 409 }
        )
      }
      console.log('[coupons POST] No duplicate found — proceeding')
    }

    console.log('[coupons POST] Inserting coupon into DB...')
    const { data: coupon, error } = await supabase
      .from('coupons')
      .insert({
        user_id: session.user.id,
        campaign_id,
        image_url,
        extracted_data: extracted_data || null,
        status: 'pending',
        points_awarded: 0,
      })
      .select()
      .single()

    if (error) {
      console.error('[coupons POST] DB insert error:', error.message, error.code)
      throw error
    }

    console.log('[coupons POST] ✔ Coupon saved, id:', coupon.id, '| status: pending')
    return NextResponse.json({ coupon }, { status: 201 })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Falha ao criar cupom'
    console.error('[coupons POST] ✖ Unhandled error:', error)
    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}

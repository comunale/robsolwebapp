import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET /api/coupons/[id]
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { id } = await params

    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: coupon, error } = await supabase
      .from('coupons')
      .select('*, profiles(full_name, email), campaigns(title, keywords)')
      .eq('id', id)
      .single()

    if (error) throw error

    return NextResponse.json({ coupon })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch coupon' },
      { status: 500 }
    )
  }
}

// PATCH /api/coupons/[id] - Review a coupon (admin only)
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { id } = await params

    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single()

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin only' }, { status: 403 })
    }

    const body = await request.json()
    const { status, points_awarded } = body

    if (!status || !['approved', 'rejected'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be "approved" or "rejected"' },
        { status: 400 }
      )
    }

    // Get the coupon first to know the user
    const { data: existingCoupon, error: fetchError } = await supabase
      .from('coupons')
      .select('user_id, status')
      .eq('id', id)
      .single()

    if (fetchError) throw fetchError

    if (existingCoupon.status !== 'pending') {
      return NextResponse.json(
        { error: 'This coupon has already been reviewed' },
        { status: 400 }
      )
    }

    const finalPoints = status === 'approved' ? (points_awarded || 10) : 0

    // Update the coupon
    const { data: coupon, error: updateError } = await supabase
      .from('coupons')
      .update({
        status,
        points_awarded: finalPoints,
        reviewed_at: new Date().toISOString(),
        reviewed_by: session.user.id,
      })
      .eq('id', id)
      .select()
      .single()

    if (updateError) throw updateError

    // Points are awarded automatically by the database trigger (update_user_points)
    // when the coupon status changes to 'approved'. No manual update needed here.

    return NextResponse.json({ coupon })
  } catch (error: any) {
    console.error('Error reviewing coupon:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to review coupon' },
      { status: 500 }
    )
  }
}

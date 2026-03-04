import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

// GET /api/landing/ranking — public, no auth required
// Uses service-role client to bypass profiles RLS and read public ranking data.
export async function GET() {
  try {
    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from('profiles')
      .select('full_name, total_points')
      .eq('role', 'user')
      .order('total_points', { ascending: false })
      .limit(5)

    if (error) throw error

    return NextResponse.json({ ranking: data ?? [] }, {
      headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' },
    })
  } catch {
    return NextResponse.json({ ranking: [] })
  }
}

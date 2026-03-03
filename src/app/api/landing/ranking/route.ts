import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET /api/landing/ranking — public, no auth required
// Returns top-5 users by total_points for the landing page
export async function GET() {
  try {
    const supabase = await createClient()

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

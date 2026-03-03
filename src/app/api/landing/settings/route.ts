import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET /api/landing/settings — public, no auth required
// Returns site_settings as { key: value } map for the landing page footer
export async function GET() {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('site_settings')
      .select('key, value')

    if (error) throw error

    const settings: Record<string, string> = {}
    for (const row of data ?? []) {
      settings[row.key] = row.value
    }

    return NextResponse.json({ settings }, {
      headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' },
    })
  } catch {
    return NextResponse.json({ settings: {} })
  }
}

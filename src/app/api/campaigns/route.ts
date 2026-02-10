import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { CreateCampaignInput } from '@/types/campaign'

// GET /api/campaigns - Get all campaigns
export async function GET(request: Request) {
  try {
    const supabase = await createClient()

    // Check if user is authenticated
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get all campaigns ordered by created_at descending
    const { data: campaigns, error } = await supabase
      .from('campaigns')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json({ campaigns })
  } catch (error: any) {
    console.error('Error fetching campaigns:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch campaigns' },
      { status: 500 }
    )
  }
}

// POST /api/campaigns - Create a new campaign
export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    // Check if user is authenticated
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

    const body: CreateCampaignInput = await request.json()

    // Validate required fields
    if (!body.title || !body.start_date || !body.end_date) {
      return NextResponse.json(
        { error: 'Missing required fields: title, start_date, end_date' },
        { status: 400 }
      )
    }

    // Insert campaign
    const { data: campaign, error } = await supabase
      .from('campaigns')
      .insert({
        title: body.title,
        description: body.description,
        start_date: body.start_date,
        end_date: body.end_date,
        is_active: body.is_active ?? true,
        banner_url: body.banner_url,
        keywords: body.keywords || [],
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ campaign }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating campaign:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create campaign' },
      { status: 500 }
    )
  }
}

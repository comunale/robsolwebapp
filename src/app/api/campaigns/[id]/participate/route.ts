import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET /api/campaigns/[id]/participate - Check if current user is participating
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { id } = await params

    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })
    }

    const { data } = await supabase
      .from('campaign_participants')
      .select('id, joined_at')
      .eq('user_id', session.user.id)
      .eq('campaign_id', id)
      .maybeSingle()

    return NextResponse.json({ participating: !!data, joined_at: data?.joined_at ?? null })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Falha ao verificar participacao'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// POST /api/campaigns/[id]/participate - Join a campaign
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { id } = await params

    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })
    }

    // Check campaign exists and is active
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('id, title, is_active, end_date')
      .eq('id', id)
      .single()

    if (campaignError || !campaign) {
      return NextResponse.json({ error: 'Campanha nao encontrada' }, { status: 404 })
    }

    if (!campaign.is_active || new Date(campaign.end_date) < new Date()) {
      return NextResponse.json({ error: 'Campanha nao esta ativa' }, { status: 400 })
    }

    // Upsert to handle duplicate joins gracefully
    const { data, error } = await supabase
      .from('campaign_participants')
      .upsert(
        { user_id: session.user.id, campaign_id: id },
        { onConflict: 'user_id,campaign_id', ignoreDuplicates: true }
      )
      .select('id, joined_at')
      .maybeSingle()

    if (error) throw error

    return NextResponse.json({
      message: `Voce agora esta participando de "${campaign.title}"`,
      joined_at: data?.joined_at ?? null,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Falha ao participar da campanha'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

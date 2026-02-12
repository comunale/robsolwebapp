import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { UpdateCampaignInput } from '@/types/campaign'

// GET /api/campaigns/[id] - Get a single campaign
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { id } = await params

    // Check if user is authenticated
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: campaign, error } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Campanha nao encontrada' }, { status: 404 })
      }
      throw error
    }

    return NextResponse.json({ campaign })
  } catch (error: any) {
    console.error('Error fetching campaign:', error)
    return NextResponse.json(
      { error: error.message || 'Falha ao buscar campanha' },
      { status: 500 }
    )
  }
}

// PATCH /api/campaigns/[id] - Update a campaign
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { id } = await params

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

    const body: UpdateCampaignInput = await request.json()

    // Update campaign
    const { data: campaign, error } = await supabase
      .from('campaigns')
      .update({
        ...body,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Campanha nao encontrada' }, { status: 404 })
      }
      throw error
    }

    return NextResponse.json({ campaign })
  } catch (error: any) {
    console.error('Error updating campaign:', error)
    return NextResponse.json(
      { error: error.message || 'Falha ao atualizar campanha' },
      { status: 500 }
    )
  }
}

// DELETE /api/campaigns/[id] - Delete a campaign
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { id } = await params

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

    const { error } = await supabase.from('campaigns').delete().eq('id', id)

    if (error) throw error

    return NextResponse.json({ message: 'Campanha excluida com sucesso' })
  } catch (error: any) {
    console.error('Error deleting campaign:', error)
    return NextResponse.json(
      { error: error.message || 'Falha ao excluir campanha' },
      { status: 500 }
    )
  }
}

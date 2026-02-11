import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { UpdateStoreInput } from '@/types/store'

// GET /api/stores/[id]
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

    const { data: store, error } = await supabase
      .from('stores')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error

    return NextResponse.json({ store })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch store' },
      { status: 500 }
    )
  }
}

// PATCH /api/stores/[id] - Update a store (admin only)
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

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single()

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin only' }, { status: 403 })
    }

    const body: UpdateStoreInput = await request.json()

    const { data: store, error } = await supabase
      .from('stores')
      .update(body)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ store })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to update store' },
      { status: 500 }
    )
  }
}

// DELETE /api/stores/[id] - Delete a store (admin only)
export async function DELETE(
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

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single()

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin only' }, { status: 403 })
    }

    const { error } = await supabase.from('stores').delete().eq('id', id)

    if (error) throw error

    return NextResponse.json({ message: 'Store deleted successfully' })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to delete store' },
      { status: 500 }
    )
  }
}

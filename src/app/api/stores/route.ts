import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { CreateStoreInput } from '@/types/store'

// GET /api/stores - List all stores
export async function GET() {
  try {
    const supabase = await createClient()

    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: stores, error } = await supabase
      .from('stores')
      .select('*')
      .order('name', { ascending: true })

    if (error) throw error

    return NextResponse.json({ stores })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Falha ao buscar lojas' },
      { status: 500 }
    )
  }
}

// POST /api/stores - Create a new store (admin only)
export async function POST(request: Request) {
  try {
    const supabase = await createClient()

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

    const body: CreateStoreInput = await request.json()

    if (!body.name || !body.cnpj) {
      return NextResponse.json(
        { error: 'Campos obrigatorios ausentes: nome, cnpj' },
        { status: 400 }
      )
    }

    const { data: store, error } = await supabase
      .from('stores')
      .insert({
        name: body.name,
        cnpj: body.cnpj,
        location: body.location || null,
        logo_url: body.logo_url || null,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ store }, { status: 201 })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Falha ao criar loja' },
      { status: 500 }
    )
  }
}

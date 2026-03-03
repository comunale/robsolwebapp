import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

interface StoreRow {
  name: string
  cnpj: string
  location?: string
}

// POST /api/stores/import - Bulk upsert stores (admin only)
export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single()

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Acesso negado - apenas admin' }, { status: 403 })
    }

    const body: { stores: StoreRow[] } = await request.json()

    if (!Array.isArray(body.stores) || body.stores.length === 0) {
      return NextResponse.json({ error: 'Nenhuma loja fornecida' }, { status: 400 })
    }

    const rows = body.stores.map((s) => ({
      name: String(s.name ?? '').trim(),
      cnpj: String(s.cnpj ?? '').trim(),
      location: s.location ? String(s.location).trim() : null,
    }))

    const invalid = rows.filter((r) => !r.name || !r.cnpj)
    if (invalid.length > 0) {
      return NextResponse.json(
        { error: `${invalid.length} linha(s) sem nome ou CNPJ` },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('stores')
      .upsert(rows, { onConflict: 'cnpj', ignoreDuplicates: false })
      .select('id')

    if (error) throw error

    return NextResponse.json({ imported: data?.length ?? rows.length })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Falha ao importar lojas'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET /api/store-performance - Admin only
export async function GET() {
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

    const { data: performance, error } = await supabase
      .from('store_performance')
      .select('*')
      .order('total_points', { ascending: false })

    if (error) throw error

    return NextResponse.json({ performance })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Falha ao buscar desempenho das lojas'
    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}

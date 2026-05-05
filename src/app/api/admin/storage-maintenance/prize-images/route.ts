import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  PRIZE_IMAGES_BUCKET,
  removeStoragePaths,
  scanOrphanedPrizeImages,
} from '@/lib/storage/adminStorageCleanup'
import { NextResponse } from 'next/server'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return { error: NextResponse.json({ error: 'Nao autorizado' }, { status: 401 }) }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .single()

  if (profile?.role !== 'admin') return { error: NextResponse.json({ error: 'Acesso negado' }, { status: 403 }) }
  return { error: null }
}

export async function GET() {
  const { error: authError } = await requireAdmin()
  if (authError) return authError

  try {
    const admin = createAdminClient()
    const scan = await scanOrphanedPrizeImages(admin)
    return NextResponse.json(scan)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Falha ao verificar arquivos'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  const { error: authError } = await requireAdmin()
  if (authError) return authError

  try {
    const body = await request.json().catch(() => ({}))
    if (body.confirm !== true) {
      return NextResponse.json({ error: 'Confirmacao obrigatoria' }, { status: 400 })
    }

    const admin = createAdminClient()
    const scan = await scanOrphanedPrizeImages(admin)
    const deletedFiles = await removeStoragePaths(admin, PRIZE_IMAGES_BUCKET, scan.orphanedFiles)

    return NextResponse.json({
      ...scan,
      deletedFiles,
      orphanedCount: 0,
      orphanedFiles: [],
      totalFiles: Math.max(0, scan.totalFiles - deletedFiles),
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Falha ao limpar arquivos'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

const BUCKET = 'brand-assets'
const ALLOWED_LOGO_KEYS = [
  'logo_admin_url',
  'logo_login_url',
  'logo_header_url',
  'logo_favicon_url',
  'logo_landing_url',
]

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return { error: NextResponse.json({ error: 'Não autorizado' }, { status: 401 }) }
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', session.user.id).single()
  if (profile?.role !== 'admin') return { error: NextResponse.json({ error: 'Acesso negado' }, { status: 403 }) }
  return { error: null }
}

/**
 * POST /api/admin/brand/upload
 * Body: FormData with fields:
 *   - file: File (image)
 *   - key:  string (one of ALLOWED_LOGO_KEYS)
 */
export async function POST(request: Request) {
  const { error: authError } = await requireAdmin()
  if (authError) return authError

  // Use service-role client for all storage + DB writes (bypasses RLS)
  const admin = createAdminClient()

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  const key  = formData.get('key')  as string | null

  if (!file || !key) {
    return NextResponse.json({ error: 'file e key são obrigatórios' }, { status: 400 })
  }

  if (!ALLOWED_LOGO_KEYS.includes(key)) {
    return NextResponse.json({ error: 'key inválida' }, { status: 400 })
  }

  if (!file.type.startsWith('image/')) {
    return NextResponse.json({ error: 'Somente imagens são permitidas' }, { status: 400 })
  }

  if (file.size > 2 * 1024 * 1024) {
    return NextResponse.json({ error: 'Arquivo muito grande (máx 2 MB)' }, { status: 400 })
  }

  // Ensure bucket exists — service role can create buckets
  const { data: buckets } = await admin.storage.listBuckets()
  if (!buckets?.find((b) => b.name === BUCKET)) {
    await admin.storage.createBucket(BUCKET, { public: true })
  }

  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'png'
  const path = `logos/${key.replace('_url', '')}-${Date.now()}.${ext}`
  const buffer = Buffer.from(await file.arrayBuffer())

  const { data: uploadData, error: uploadError } = await admin.storage
    .from(BUCKET)
    .upload(path, buffer, { contentType: file.type, upsert: true })

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 })
  }

  const { data: urlData } = admin.storage.from(BUCKET).getPublicUrl(uploadData.path)
  const publicUrl = urlData.publicUrl

  // Upsert so missing rows are created automatically
  const { error: dbError } = await admin
    .from('site_settings')
    .upsert(
      { key, value: publicUrl, updated_at: new Date().toISOString() },
      { onConflict: 'key' },
    )

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 })
  }

  return NextResponse.json({ url: publicUrl })
}

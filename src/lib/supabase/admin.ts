import { createClient } from '@supabase/supabase-js'

/**
 * Admin Supabase client using the service role key.
 * Bypasses RLS entirely — use ONLY in server-side admin API routes
 * after verifying the caller is an admin at the application level.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY is not set. Add it to .env.local from your Supabase project Settings → API.',
    )
  }

  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

import { createClient } from '@/lib/supabase/server'
import SupportPage from '@/components/shared/SupportPage'

export const metadata = { title: 'Política de Privacidade | Robsol VIP' }

async function getContent(): Promise<string> {
  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from('site_settings')
      .select('value')
      .eq('key', 'privacy_markdown')
      .single()
    return data?.value ?? ''
  } catch {
    return ''
  }
}

export default async function PrivacidadePage() {
  const content = await getContent()
  return <SupportPage title="Política de Privacidade" content={content} backHref="/" />
}

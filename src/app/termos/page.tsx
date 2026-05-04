import { createClient } from '@/lib/supabase/server'
import SupportPage from '@/components/shared/SupportPage'

export const metadata = { title: 'Termos de Uso | Robsol VIP' }

async function getContent(): Promise<string> {
  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from('site_settings')
      .select('value')
      .eq('key', 'terms_markdown')
      .single()
    return data?.value ?? ''
  } catch {
    return ''
  }
}

export default async function TermosPage() {
  const content = await getContent()
  return <SupportPage title="Termos de Uso" content={content} backHref="/" />
}

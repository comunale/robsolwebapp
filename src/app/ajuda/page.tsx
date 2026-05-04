import { createClient } from '@/lib/supabase/server'
import SupportPage from '@/components/shared/SupportPage'

export const metadata = { title: 'Central de Ajuda | Robsol VIP' }

async function getContent(): Promise<string> {
  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from('site_settings')
      .select('value')
      .eq('key', 'help_center_markdown')
      .single()
    return data?.value ?? ''
  } catch {
    return ''
  }
}

export default async function AjudaPage() {
  const content = await getContent()
  return <SupportPage title="Central de Ajuda" content={content} backHref="/" />
}

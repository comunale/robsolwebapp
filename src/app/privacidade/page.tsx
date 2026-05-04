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

// Mandatory disclosure always rendered at the bottom of the privacy page,
// regardless of what the admin writes in the markdown field.
function LegalDisclosure() {
  return (
    <div className="mt-8 pt-6 border-t border-gray-100">
      <div className="rounded-xl bg-amber-50 border border-amber-100 px-5 py-4">
        <p className="text-xs font-bold uppercase tracking-widest text-amber-700 mb-1.5">
          Aviso Legal
        </p>
        <p className="text-sm text-amber-900 leading-relaxed">
          Os dados são armazenados pela Robsol e podem ser utilizados para fins de marketing
          e comunicações da marca.
        </p>
      </div>
    </div>
  )
}

export default async function PrivacidadePage() {
  const content = await getContent()
  return (
    <SupportPage title="Política de Privacidade" content={content} backHref="/">
      <LegalDisclosure />
    </SupportPage>
  )
}

import { createAdminClient } from '@/lib/supabase/admin'
import SupportPage from '@/components/shared/SupportPage'
import FaqAccordionPublic, { type FaqItem } from '@/components/shared/FaqAccordionPublic'

export const metadata = { title: 'Central de Ajuda | Robsol VIP' }

async function getPageData(): Promise<{ content: string; faqItems: FaqItem[] }> {
  try {
    const admin = createAdminClient()

    const [settingsResult, faqResult] = await Promise.all([
      admin
        .from('site_settings')
        .select('value')
        .eq('key', 'help_center_markdown')
        .single(),
      admin
        .from('faq_items')
        .select('id, question, answer, category, order_index')
        .eq('is_active', true)
        .order('category', { ascending: true })
        .order('order_index', { ascending: true })
        .order('created_at', { ascending: true }),
    ])

    return {
      content: settingsResult.data?.value ?? '',
      faqItems: (faqResult.data ?? []) as FaqItem[],
    }
  } catch {
    return { content: '', faqItems: [] }
  }
}

export default async function AjudaPage() {
  const { content, faqItems } = await getPageData()

  return (
    <SupportPage title="Central de Ajuda" content={content} backHref="/">
      <FaqAccordionPublic items={faqItems} />
    </SupportPage>
  )
}

import type { MetadataRoute } from 'next'
import { createClient } from '@/lib/supabase/server'

export const revalidate = 60

async function getPwaIconUrl(): Promise<string> {
  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from('site_settings')
      .select('value')
      .eq('key', 'pwa_icon_url')
      .maybeSingle()

    return data?.value || '/logo.png'
  } catch {
    return '/logo.png'
  }
}

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const iconUrl = await getPwaIconUrl()

  return {
    id: '/dashboard',
    name: 'Robsol VIP',
    short_name: 'Robsol VIP',
    description: 'Plataforma de fidelidade para vendedores Robsol VIP.',
    start_url: '/dashboard',
    scope: '/',
    lang: 'pt-BR',
    dir: 'ltr',
    display: 'standalone',
    display_override: ['standalone', 'minimal-ui'],
    orientation: 'portrait',
    background_color: '#0f0c29',
    theme_color: '#0f0c29',
    categories: ['business', 'productivity'],
    prefer_related_applications: false,
    icons: [
      {
        src: iconUrl,
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: iconUrl,
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
    shortcuts: [
      {
        name: 'Escanear Cupom',
        short_name: 'Escanear',
        description: 'Envie um cupom fiscal para validacao',
        url: '/dashboard/scan',
        icons: [{ src: iconUrl, sizes: '96x96', type: 'image/png' }],
      },
      {
        name: 'Meus Cupons',
        short_name: 'Cupons',
        description: 'Ver historico de cupons enviados',
        url: '/dashboard/meus-cupons',
        icons: [{ src: iconUrl, sizes: '96x96', type: 'image/png' }],
      },
    ],
  }
}

import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Robsol VIP',
    short_name: 'Robsol VIP',
    description: 'Plataforma de fidelidade — escaneie cupons e ganhe prêmios exclusivos',
    start_url: '/dashboard',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#0f0c29',
    theme_color: '#0f0c29',
    categories: ['business', 'productivity'],
    icons: [
      {
        src: '/logo.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/logo.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
    shortcuts: [
      {
        name: 'Escanear Cupom',
        short_name: 'Escanear',
        description: 'Envie um cupom fiscal para validação',
        url: '/dashboard/scan',
        icons: [{ src: '/logo.png', sizes: '96x96' }],
      },
      {
        name: 'Meus Cupons',
        short_name: 'Cupons',
        description: 'Ver histórico de cupons enviados',
        url: '/dashboard/meus-cupons',
        icons: [{ src: '/logo.png', sizes: '96x96' }],
      },
    ],
  }
}

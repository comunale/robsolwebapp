import type { Metadata, Viewport } from "next"
import { Montserrat } from "next/font/google"
import "./globals.css"
import { createClient } from "@/lib/supabase/server"
import { buildCssVarsString, BRAND_DEFAULTS, type BrandSettings } from "@/lib/brand-config"
import { BrandProvider } from "@/components/shared/BrandProvider"
import PwaInstallPrompt from "@/components/shared/PwaInstallPrompt"

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  display: "swap",
})


export const viewport: Viewport = {
  themeColor: '#0f0c29',
}

export async function generateMetadata(): Promise<Metadata> {
  const brand = await getBrandSettings()
  const pwaIconUrl = brand.pwa_icon_url || '/logo.png'

  return {
    applicationName: 'Robsol VIP',
    title: "Robsol VIP",
    description: "Gerencie campanhas, escaneie cupons e ganhe recompensas",
    manifest: '/manifest.webmanifest',
    metadataBase: new URL('https://appbeneficios.robsol.com.br'),
    icons: {
      icon: [
        { url: '/favicon.ico', sizes: 'any' },
        { url: '/favicon-32.png', sizes: '32x32', type: 'image/png' },
      ],
      apple: [
        { url: pwaIconUrl, sizes: '512x512', type: 'image/png' },
      ],
    },
    appleWebApp: {
      capable: true,
      statusBarStyle: 'black-translucent',
      title: 'Robsol VIP',
    },
    formatDetection: {
      telephone: false,
    },
    openGraph: {
      title: 'Robsol VIP',
      description: 'Gerencie campanhas, escaneie cupons e ganhe recompensas',
      siteName: 'Robsol VIP',
      locale: 'pt_BR',
      type: 'website',
    },
  }
}

/** Fetch brand settings server-side — falls back to defaults on any error. */
async function getBrandSettings(): Promise<BrandSettings> {
  try {
    const supabase = await createClient()
    const { data } = await supabase.from('site_settings').select('key, value')
    const settings = { ...BRAND_DEFAULTS } as BrandSettings
    for (const row of data ?? []) {
      if (row.key in BRAND_DEFAULTS) {
        (settings as Record<string, string>)[row.key] = row.value
      }
    }
    return settings
  } catch {
    // DB not set up yet or migration pending — safe default theme
    return { ...BRAND_DEFAULTS } as BrandSettings
  }
}

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const brand = await getBrandSettings()
  const cssVars = buildCssVarsString(brand)

  return (
    <html lang="pt-BR" className={montserrat.variable}>
      <head>
        {/* Brand CSS variables injected before paint — prevents FOUC */}
        <style dangerouslySetInnerHTML={{ __html: `:root { ${cssVars} }` }} />
      </head>
      <body className="font-sans antialiased">
        <BrandProvider settings={brand}>
          {children}
          <PwaInstallPrompt />
        </BrandProvider>
      </body>
    </html>
  )
}

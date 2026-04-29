import type { Metadata } from "next"
import { Montserrat, Geist_Mono } from "next/font/google"
import "./globals.css"
import { createClient } from "@/lib/supabase/server"
import { buildCssVarsString, BRAND_DEFAULTS, type BrandSettings } from "@/lib/brand-config"
import { BrandProvider } from "@/components/shared/BrandProvider"

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  display: "swap",
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
})

export const metadata: Metadata = {
  title: "Robsol VIP",
  description: "Gerencie campanhas, escaneie cupons e ganhe recompensas",
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon-32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: '/logo.png',
  },
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
    <html lang="pt-BR">
      <head>
        {/* Brand CSS variables injected before paint — prevents FOUC */}
        <style dangerouslySetInnerHTML={{ __html: `:root { ${cssVars} }` }} />
      </head>
      <body className={`${montserrat.variable} ${geistMono.variable} antialiased`}>
        <BrandProvider settings={brand}>
          {children}
        </BrandProvider>
      </body>
    </html>
  )
}

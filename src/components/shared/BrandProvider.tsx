'use client'

import { createContext, useContext } from 'react'
import { BRAND_DEFAULTS, type BrandSettings } from '@/lib/brand-config'

const BrandContext = createContext<BrandSettings>({ ...BRAND_DEFAULTS } as BrandSettings)

/** Wrap at root layout to provide brand settings to all client components. */
export function BrandProvider({
  children,
  settings,
}: {
  children: React.ReactNode
  settings: BrandSettings
}) {
  return <BrandContext.Provider value={settings}>{children}</BrandContext.Provider>
}

/**
 * Returns current brand settings with smart fallbacks.
 * Logo URLs: empty string means the component should use /public fallbacks.
 */
export function useBrand(): BrandSettings {
  return useContext(BrandContext)
}

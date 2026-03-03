// ─────────────────────────────────────────────────────────────────────────────
// Brand Config — shared between server and client (no server-only imports)
// ─────────────────────────────────────────────────────────────────────────────

/** Canonical defaults used as fallback when DB has no value */
export const BRAND_DEFAULTS = {
  // Color palette
  color_primary:   '#6366f1',   // indigo-500
  color_secondary: '#8b5cf6',   // violet-500
  color_accent:    '#d4af37',   // gold VIP
  color_titles:    '#ffffff',   // white titles (on dark bg)
  color_bg_from:   '#0f0c29',   // very dark indigo
  color_bg_to:     '#4c1d95',   // deep violet
  // Logo URLs — empty means fall back to /public files
  logo_admin_url:  '',
  logo_login_url:  '',
  logo_header_url: '',
  logo_favicon_url: '',
} as const

export type BrandSettings = { [K in keyof typeof BRAND_DEFAULTS]: string }

/** Returns value or the default if empty/undefined */
export function brandVal<K extends keyof typeof BRAND_DEFAULTS>(
  settings: Partial<BrandSettings>,
  key: K,
): string {
  return settings[key] || BRAND_DEFAULTS[key]
}

/**
 * Builds a CSS custom-properties string to be injected into :root {}
 * Safe to call on server or client.
 */
export function buildCssVarsString(s: Partial<BrandSettings>): string {
  const accent = brandVal(s, 'color_accent')
  return [
    `--brand-primary: ${brandVal(s, 'color_primary')}`,
    `--brand-secondary: ${brandVal(s, 'color_secondary')}`,
    `--brand-accent: ${accent}`,
    // Lighter accent for hover/gradient pairs (color-mix is broadly supported since 2023)
    `--brand-accent-light: color-mix(in srgb, ${accent} 65%, white)`,
    `--brand-titles: ${brandVal(s, 'color_titles')}`,
    `--brand-bg-from: ${brandVal(s, 'color_bg_from')}`,
    `--brand-bg-to: ${brandVal(s, 'color_bg_to')}`,
  ].join('; ')
}

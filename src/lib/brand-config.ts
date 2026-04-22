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
  logo_admin_url:   '',
  logo_login_url:   '',
  logo_header_url:  '',
  logo_favicon_url: '',
  logo_landing_url: '',
  // ── Landing Page CMS copy (fallbacks = current hardcoded defaults) ──────────
  home_hero_title:    'Onde suas vendas se tornam [gold]conquistas[/gold]',
  home_hero_subtitle: 'Participe das campanhas, escaneie seus cupons e acumule pontos para conquistar prêmios exclusivos.',
  home_hero_cta:      'Começar Agora — é grátis',
  home_step_01_title: 'Cadastre-se',
  home_step_01_desc:  'Crie sua conta em menos de 1 minuto e acesse o painel VIP. Fique por dentro das promoções e prêmios exclusivos.',
  home_step_02_title: 'Escolha sua Campanha',
  home_step_02_desc:  'Navegue pelas campanhas ativas e inscreva-se. Acompanhe o regulamento e as pontuações em tempo real.',
  home_step_03_title: 'Escaneie e Ganhe',
  home_step_03_desc:  'Tire foto do cupom fiscal — nossa IA valida e credita seus pontos na hora.',
  home_feat_01_title: 'Validação Instantânea por IA',
  home_feat_01_desc:  'Nossa inteligência artificial analisa e aprova seus cupons em segundos.',
  home_feat_02_title: 'Ranking em Tempo Real',
  home_feat_02_desc:  'Acompanhe sua posição no ranking global e dispute os prêmios do topo.',
  home_feat_03_title: 'Metas e Conquistas',
  home_feat_03_desc:  'Complete metas por campanha e desbloqueie bônus e números da sorte.',
  home_feat_04_title: 'Notificações ao Vivo',
  home_feat_04_desc:  'Receba alertas instantâneos quando seus cupons forem aprovados ou recompensas liberadas.',
  home_footer_desc:   'A plataforma de fidelidade que transforma cada compra em uma conquista.',
  // ── Campaign settings ───────────────────────────────────────────────────────
  campaign_end_date:  '',
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
 * Blends a hex colour toward white by `amount` (0 = original, 1 = white).
 * Used to compute --brand-accent-light without relying on CSS color-mix(),
 * which Firefox can mishandle inside linear-gradient() stops.
 */
export function lightenHex(hex: string, amount: number): string {
  const raw = hex.replace('#', '')
  if (!/^[0-9a-fA-F]{6}$/.test(raw)) return hex
  const r = parseInt(raw.slice(0, 2), 16)
  const g = parseInt(raw.slice(2, 4), 16)
  const b = parseInt(raw.slice(4, 6), 16)
  const lr = Math.round(r + (255 - r) * amount).toString(16).padStart(2, '0')
  const lg = Math.round(g + (255 - g) * amount).toString(16).padStart(2, '0')
  const lb = Math.round(b + (255 - b) * amount).toString(16).padStart(2, '0')
  return `#${lr}${lg}${lb}`
}

/**
 * Builds a CSS custom-properties string to be injected into :root {}
 * All values are resolved to concrete hex — no color-mix() — so they
 * render correctly in Firefox, Safari, and all modern browsers.
 */
export function buildCssVarsString(s: Partial<BrandSettings>): string {
  const accent = brandVal(s, 'color_accent')
  // 35% toward white ≈ "color-mix(in srgb, accent 65%, white)"
  const accentLight = lightenHex(accent, 0.35)
  return [
    `--brand-primary: ${brandVal(s, 'color_primary')}`,
    `--brand-secondary: ${brandVal(s, 'color_secondary')}`,
    `--brand-accent: ${accent}`,
    `--brand-accent-light: ${accentLight}`,
    `--brand-titles: ${brandVal(s, 'color_titles')}`,
    `--brand-bg-from: ${brandVal(s, 'color_bg_from')}`,
    `--brand-bg-to: ${brandVal(s, 'color_bg_to')}`,
  ].join('; ')
}

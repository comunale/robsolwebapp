-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 14 — Brand Theme Settings
-- Adds color palette and logo URL keys to site_settings
-- ─────────────────────────────────────────────────────────────────────────────

-- Storage bucket for brand assets
-- NOTE: Create the 'brand-assets' bucket manually in Supabase Dashboard:
--   Storage → New bucket → name: brand-assets → Public: ON
--   Or it will be auto-created by the upload API on first use.

-- ── Color palette keys ────────────────────────────────────────────────────────
insert into site_settings (key, label, value) values
  ('color_primary',    'Cor Primária (botões, links, indigo)',        '#6366f1'),
  ('color_secondary',  'Cor Secundária (destaques, roxo)',            '#8b5cf6'),
  ('color_accent',     'Cor de Destaque VIP (dourado)',               '#d4af37'),
  ('color_titles',     'Cor dos Títulos (texto principal)',           '#ffffff'),
  ('color_bg_from',    'Gradiente de Fundo — Cor Inicial (escuro)',  '#0f0c29'),
  ('color_bg_to',      'Gradiente de Fundo — Cor Final (roxo)',      '#4c1d95')
on conflict (key) do nothing;

-- ── Logo URL keys ─────────────────────────────────────────────────────────────
insert into site_settings (key, label, value) values
  ('logo_admin_url',   'Logo Admin (180×48px recomendado)',           ''),
  ('logo_login_url',   'Logo Login / Landing (200×200px recomendado)',''),
  ('logo_header_url',  'Logo Header Mobile (120×32px recomendado)',   ''),
  ('logo_favicon_url', 'Favicon (32×32px .ico ou .png)',              '')
on conflict (key) do nothing;

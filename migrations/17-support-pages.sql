-- ============================================================
-- Migration 17: Support Pages — Seed CMS Keys
-- ============================================================
-- site_settings is a key-value store (key TEXT, label TEXT, value TEXT).
-- This migration adds the three markdown content keys used by the
-- public /ajuda, /termos, and /privacidade routes.
-- ON CONFLICT DO NOTHING makes it safe to re-run.

INSERT INTO site_settings (key, label, value)
VALUES
  ('help_center_markdown', 'Central de Ajuda (Markdown)',         ''),
  ('terms_markdown',       'Termos de Uso (Markdown)',            ''),
  ('privacy_markdown',     'Política de Privacidade (Markdown)',  '')
ON CONFLICT (key) DO NOTHING;

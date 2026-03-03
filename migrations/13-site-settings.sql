-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 13 — Site Settings
-- Key-value store for admin-managed footer/support links
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists site_settings (
  key        text primary key,
  label      text not null,
  value      text not null default '',
  updated_at timestamptz not null default now()
);

alter table site_settings enable row level security;

-- Public read (landing page footer fetches these without auth)
create policy "Public read site_settings"
  on site_settings for select
  using (true);

-- Only admins can insert / update / delete
create policy "Admin manage site_settings"
  on site_settings for all
  using (
    exists (
      select 1 from profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- Seed default support links (safe to re-run — conflict is ignored)
insert into site_settings (key, label, value) values
  ('support_whatsapp', 'Número WhatsApp (só dígitos, ex: 5511999999999)', ''),
  ('support_terms',    'URL dos Termos de Uso', '#'),
  ('support_privacy',  'URL da Política de Privacidade', '#'),
  ('support_help',     'URL da Central de Ajuda', '#'),
  ('support_contact',  'URL de Contato', '#')
on conflict (key) do nothing;

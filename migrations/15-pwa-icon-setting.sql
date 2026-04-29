-- Migration 15 - PWA icon setting
-- Adds a configurable application icon used by the web app manifest and iOS installs.

insert into site_settings (key, label, value) values
  ('pwa_icon_url', 'Icone do Aplicativo PWA (512x512px PNG)', '')
on conflict (key) do nothing;

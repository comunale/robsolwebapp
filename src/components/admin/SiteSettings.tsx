'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import AdminHeader from './AdminHeader'
import LoadingSpinner from '@/components/shared/LoadingSpinner'
import { BRAND_DEFAULTS } from '@/lib/brand-config'
import FaqManager from './FaqManager'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
interface Setting { key: string; label: string; value: string }

type Tab = 'suporte' | 'logos' | 'cores' | 'conteudo' | 'faq'

// ─────────────────────────────────────────────────────────────────────────────
// Logo config
// ─────────────────────────────────────────────────────────────────────────────
const LOGO_META: Record<string, {
  size: string; fallback: string; aspect: string
  widthKey?: string; defaultWidth?: number; maxWidth?: number
}> = {
  logo_landing_url: { size: '400 × 100 px', fallback: '/logo.png',        aspect: 'aspect-[4/1]',  widthKey: 'logo_landing_width', defaultWidth: 120, maxWidth: 300 },
  logo_admin_url:   { size: '180 × 48 px',  fallback: '/logo-admin.png',  aspect: 'aspect-[15/4]', widthKey: 'logo_admin_width',   defaultWidth: 140, maxWidth: 200 },
  logo_login_url:   { size: '200 × 200 px', fallback: '/logo.png',        aspect: 'aspect-square', widthKey: 'logo_login_width',   defaultWidth: 80,  maxWidth: 200 },
  logo_header_url:  { size: '120 × 32 px',  fallback: '/logo-header.png', aspect: 'aspect-[15/4]', widthKey: 'logo_header_width',  defaultWidth: 100, maxWidth: 160 },
  logo_favicon_url: { size: '32 × 32 px',   fallback: '/favicon.ico',     aspect: 'aspect-square' },
}

// ─────────────────────────────────────────────────────────────────────────────
// Color config
// ─────────────────────────────────────────────────────────────────────────────
const COLOR_META: Record<string, { label: string; desc: string; cssVar: string }> = {
  color_primary:   { label: 'Primária',          desc: 'Botões, links e destaques principais', cssVar: '--brand-primary' },
  color_secondary: { label: 'Secundária',         desc: 'Efeitos de hover e gradientes suaves', cssVar: '--brand-secondary' },
  color_accent:    { label: 'Destaque VIP',       desc: 'Dourado — CTAs, badges e rankings',   cssVar: '--brand-accent' },
  color_titles:    { label: 'Títulos',            desc: 'Cor principal dos títulos e headlines',cssVar: '--brand-titles' },
  color_bg_from:   { label: 'Gradiente — Início', desc: 'Cor mais escura do fundo',            cssVar: '--brand-bg-from' },
  color_bg_to:     { label: 'Gradiente — Fim',    desc: 'Cor mais clara/vibrante do fundo',    cssVar: '--brand-bg-to' },
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function isValidHex(v: string) { return /^#[0-9A-Fa-f]{6}$/.test(v) }

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function SaveButton({ saving, saved, onClick }: { saving: boolean; saved: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      disabled={saving}
      className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-semibold transition min-w-[80px] ${
        saved
          ? 'bg-green-100 text-green-700'
          : 'bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white'
      }`}
    >
      {saving ? '...' : saved ? '✓ Salvo' : 'Salvar'}
    </button>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// CMS sub-components
// ─────────────────────────────────────────────────────────────────────────────

function ContentSection({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(true)
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 transition"
      >
        <div className="flex items-center gap-2">
          <span>{icon}</span>
          <span className="text-sm font-semibold text-gray-800">{title}</span>
        </div>
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && <div className="px-5 pb-5 pt-1 space-y-4 border-t border-gray-100">{children}</div>}
    </div>
  )
}

function ToggleField({
  dbKey, label, desc, value, onToggle, saving, saved,
}: {
  dbKey: string; label: string; desc?: string; value: string
  onToggle: () => void; saving: boolean; saved: boolean
}) {
  const isOn = (value ?? 'true') !== 'false'
  return (
    <div className="flex items-center justify-between gap-3 py-1">
      <div className="min-w-0">
        <p className="text-xs font-semibold text-gray-700">{label}</p>
        {desc && <p className="text-xs text-gray-400 mt-0.5">{desc}</p>}
        <p className="text-xs text-gray-300 font-mono mt-0.5">{dbKey}</p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {saving && <span className="text-xs text-gray-400">...</span>}
        {saved && !saving && <span className="text-xs text-green-600 font-semibold">✓ Salvo</span>}
        <button
          onClick={onToggle}
          disabled={saving}
          role="switch"
          aria-checked={isOn}
          className={`relative w-11 h-6 rounded-full transition-colors disabled:opacity-50 ${isOn ? 'bg-indigo-600' : 'bg-gray-200'}`}
        >
          <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${isOn ? 'translate-x-5' : ''}`} />
        </button>
      </div>
    </div>
  )
}

function CmsField({
  dbKey, label, placeholder, value, onChange, saving, saved, onSave, multiline,
}: {
  dbKey: string; label: string; placeholder: string; value: string
  onChange: (v: string) => void; saving: boolean; saved: boolean
  onSave: () => void; multiline: boolean
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-700 mb-1">{label}</label>
      <div className="flex gap-2 items-start">
        {multiline ? (
          <textarea
            rows={2}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none resize-y"
          />
        ) : (
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
          />
        )}
        <SaveButton saving={saving} saved={saved} onClick={onSave} />
      </div>
      <p className="text-xs text-gray-300 font-mono mt-0.5">{dbKey}</p>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────
export default function SiteSettings() {
  const [settings, setSettings] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('cores') // prioritise colors as requested
  const [saving, setSaving] = useState<Record<string, boolean>>({})
  const [saved, setSaved]   = useState<Record<string, boolean>>({})
  const [uploading, setUploading] = useState<Record<string, boolean>>({})
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({})

  useEffect(() => {
    fetch('/api/admin/site-settings')
      .then((r) => r.json())
      .then((d: { settings: Setting[] }) => {
        const map: Record<string, string> = {}
        for (const s of d.settings ?? []) map[s.key] = s.value
        setSettings(map)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  // ── Live CSS preview: update CSS vars as user changes colour pickers ──────
  useEffect(() => {
    if (typeof document === 'undefined') return
    const root = document.documentElement
    for (const [key, meta] of Object.entries(COLOR_META)) {
      const val = settings[key]
      if (val && isValidHex(val)) {
        root.style.setProperty(meta.cssVar, val)
      }
    }
  }, [settings])

  const setValue = (key: string, value: string) => {
    setSettings((p) => ({ ...p, [key]: value }))
    setSaved((p) => ({ ...p, [key]: false }))
  }

  const handleSave = async (key: string) => {
    setSaving((p) => ({ ...p, [key]: true }))
    try {
      const res = await fetch('/api/admin/site-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value: settings[key] ?? '' }),
      })
      if (!res.ok) throw new Error('Falha ao salvar')
      setSaved((p) => ({ ...p, [key]: true }))
      setTimeout(() => setSaved((p) => ({ ...p, [key]: false })), 2500)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao salvar')
    } finally {
      setSaving((p) => ({ ...p, [key]: false }))
    }
  }

  const handleToggle = async (key: string) => {
    const isOn = (settings[key] ?? 'true') !== 'false'
    const newVal = isOn ? 'false' : 'true'
    setValue(key, newVal)
    setSaving((p) => ({ ...p, [key]: true }))
    try {
      const res = await fetch('/api/admin/site-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value: newVal }),
      })
      if (!res.ok) throw new Error('Falha ao salvar')
      setSaved((p) => ({ ...p, [key]: true }))
      setTimeout(() => setSaved((p) => ({ ...p, [key]: false })), 2500)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao salvar')
    } finally {
      setSaving((p) => ({ ...p, [key]: false }))
    }
  }

  const handleLogoUpload = async (key: string, file: File) => {
    setUploading((p) => ({ ...p, [key]: true }))
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('key', key)
      const res = await fetch('/api/admin/brand/upload', { method: 'POST', body: formData })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Falha no upload')
      setValue(key, data.url)
      setSaved((p) => ({ ...p, [key]: true }))
      setTimeout(() => setSaved((p) => ({ ...p, [key]: false })), 2500)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro no upload')
    } finally {
      setUploading((p) => ({ ...p, [key]: false }))
    }
  }

  if (loading) return <LoadingSpinner />

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'cores',    label: 'Paleta de Cores',    icon: '🎨' },
    { id: 'logos',    label: 'Identidade Visual',  icon: '🖼️' },
    { id: 'conteudo', label: 'Conteúdo da Home',   icon: '✏️' },
    { id: 'faq',      label: 'FAQ / Ajuda',         icon: '❓' },
    { id: 'suporte',  label: 'Links de Suporte',   icon: '🔗' },
  ]

  return (
    <>
      <AdminHeader
        title="Configurações do Site"
        subtitle="Gerencie a identidade visual, logos e links do Robsol VIP"
      />

      <div className="p-6 max-w-4xl">
        {/* Tab bar */}
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6 w-fit">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
                tab === t.id
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <span>{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── TAB: CORES ─────────────────────────────────────────────────────── */}
        {tab === 'cores' && (
          <div className="space-y-4">
            <p className="text-sm text-gray-500 mb-4">
              As alterações são refletidas em tempo real na pré-visualização abaixo e no site em até 1 minuto.
            </p>

            {/* Live preview strip */}
            <div
              className="rounded-2xl p-5 mb-6 border border-white/10 relative overflow-hidden"
              style={{
                background: `linear-gradient(135deg, ${settings.color_bg_from || BRAND_DEFAULTS.color_bg_from}, ${settings.color_bg_to || BRAND_DEFAULTS.color_bg_to})`,
              }}
            >
              <p className="text-xs font-bold uppercase tracking-widest mb-3 opacity-60" style={{ color: settings.color_titles || BRAND_DEFAULTS.color_titles }}>
                Pré-visualização do Tema
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  className="px-5 py-2.5 rounded-xl text-sm font-bold"
                  style={{ background: `linear-gradient(135deg, ${settings.color_accent || BRAND_DEFAULTS.color_accent}, ${settings.color_secondary || BRAND_DEFAULTS.color_secondary})`, color: settings.color_bg_from || BRAND_DEFAULTS.color_bg_from }}
                >
                  CTA Destaque
                </button>
                <button
                  className="px-5 py-2.5 rounded-xl text-sm font-bold border border-white/20"
                  style={{ background: settings.color_primary || BRAND_DEFAULTS.color_primary, color: '#fff' }}
                >
                  Botão Primário
                </button>
                <span
                  className="text-2xl font-black"
                  style={{ color: settings.color_titles || BRAND_DEFAULTS.color_titles }}
                >
                  Título VIP
                </span>
                <span
                  className="text-sm font-bold px-3 py-1 rounded-full border border-current"
                  style={{ color: settings.color_accent || BRAND_DEFAULTS.color_accent }}
                >
                  Badge Dourado
                </span>
              </div>
            </div>

            {/* Color pickers */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {Object.entries(COLOR_META).map(([key, meta]) => {
                const currentVal = settings[key] || (BRAND_DEFAULTS as Record<string, string>)[key] || '#000000'
                return (
                  <div key={key} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                    <div className="flex items-start gap-3 mb-3">
                      {/* Color swatch preview */}
                      <div
                        className="w-10 h-10 rounded-lg flex-shrink-0 shadow-inner border border-gray-200"
                        style={{ background: currentVal }}
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-800">{meta.label}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{meta.desc}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Native color picker */}
                      <input
                        type="color"
                        value={isValidHex(currentVal) ? currentVal : '#000000'}
                        onChange={(e) => setValue(key, e.target.value)}
                        className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer p-0.5"
                        title="Selecionar cor"
                      />
                      {/* Hex text input */}
                      <input
                        type="text"
                        value={settings[key] ?? (BRAND_DEFAULTS as Record<string, string>)[key] ?? ''}
                        onChange={(e) => setValue(key, e.target.value)}
                        placeholder="#000000"
                        maxLength={7}
                        className={`flex-1 px-3 py-2 text-sm font-mono border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none ${
                          isValidHex(settings[key] ?? '') ? 'border-gray-200' : 'border-red-300 bg-red-50'
                        }`}
                      />
                      <SaveButton
                        saving={!!saving[key]}
                        saved={!!saved[key]}
                        onClick={() => handleSave(key)}
                      />
                    </div>
                    <p className="text-xs text-gray-400 font-mono mt-1.5">{meta.cssVar}</p>
                  </div>
                )
              })}
            </div>

            {/* Reset hint */}
            <p className="text-xs text-gray-400 bg-gray-50 rounded-lg px-4 py-3">
              Para restaurar as cores padrão, limpe o campo e salve com o valor hex original
              (Primária: <code className="font-mono">#6366f1</code> · Destaque: <code className="font-mono">#d4af37</code>).
            </p>
          </div>
        )}

        {/* ── TAB: LOGOS ─────────────────────────────────────────────────────── */}
        {tab === 'logos' && (
          <div className="space-y-5">
            <p className="text-sm text-gray-500 mb-2">
              Faça upload das imagens. Se o campo estiver vazio, o sistema usa os arquivos em <code className="font-mono text-xs bg-gray-100 px-1 rounded">/public</code>.
            </p>

            {Object.keys(LOGO_META).map((key) => {
              const meta = LOGO_META[key]
              const currentUrl = settings[key] || ''
              const previewSrc = currentUrl || meta.fallback

              return (
                <div key={key} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                  {/* Row: info + preview + upload */}
                  <div className="flex flex-col sm:flex-row items-start gap-4">
                    {/* Preview box */}
                    <div
                      className={`relative flex-shrink-0 w-32 ${meta.aspect} rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 overflow-hidden flex items-center justify-center`}
                    >
                      <Image
                        src={previewSrc}
                        alt={key}
                        fill
                        className="object-contain p-2"
                        onError={(e) => { (e.currentTarget as HTMLImageElement).style.opacity = '0' }}
                        unoptimized={previewSrc.startsWith('http')}
                      />
                    </div>

                    {/* Info + controls */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 mb-0.5">
                        {settings[`${key.replace('_url', '')}_label`] ??
                          key.replace('logo_', '').replace('_url', '').replace(/_/g, ' ').toUpperCase()}
                      </p>
                      <p className="text-xs text-gray-400 mb-1">Tamanho recomendado: <strong>{meta.size}</strong></p>
                      <p className="text-xs font-mono text-gray-400 mb-3">{key}</p>

                      {/* URL input (manual) */}
                      <div className="flex gap-2 mb-2">
                        <input
                          type="url"
                          value={settings[key] ?? ''}
                          onChange={(e) => setValue(key, e.target.value)}
                          placeholder="https://... ou deixe vazio para usar /public"
                          className="flex-1 px-3 py-2 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                        <SaveButton
                          saving={!!saving[key]}
                          saved={!!saved[key]}
                          onClick={() => handleSave(key)}
                        />
                      </div>

                      {/* Upload button */}
                      <button
                        onClick={() => fileRefs.current[key]?.click()}
                        disabled={!!uploading[key]}
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border border-indigo-200 text-indigo-700 hover:bg-indigo-50 transition disabled:opacity-50"
                      >
                        {uploading[key] ? (
                          <>
                            <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                            Enviando...
                          </>
                        ) : (
                          <>
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
                            </svg>
                            Upload de Arquivo
                          </>
                        )}
                      </button>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        ref={(el) => { fileRefs.current[key] = el }}
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          e.target.value = ''
                          if (file) handleLogoUpload(key, file)
                        }}
                      />
                      <p className="text-xs text-gray-400 mt-1.5">PNG, SVG, WebP · máx 2 MB</p>

                      {/* Width control — only for rendered logos, not favicon */}
                      {meta.widthKey ? (
                        <div className="mt-3 pt-3 border-t border-gray-100">
                          <label className="block text-xs font-semibold text-gray-700 mb-2">
                            Largura Exibida (px) — máx {meta.maxWidth}px
                          </label>
                          <div className="flex items-center gap-2">
                            <input
                              type="range"
                              min={20}
                              max={meta.maxWidth}
                              value={parseInt(settings[meta.widthKey] || String(meta.defaultWidth), 10) || meta.defaultWidth}
                              onChange={(e) => setValue(meta.widthKey!, e.target.value)}
                              className="flex-1 h-1.5 accent-indigo-600 cursor-pointer"
                            />
                            <input
                              type="number"
                              min={20}
                              max={meta.maxWidth}
                              value={settings[meta.widthKey] ?? String(meta.defaultWidth)}
                              onChange={(e) => setValue(meta.widthKey!, e.target.value)}
                              placeholder={String(meta.defaultWidth)}
                              className="w-16 px-2 py-1.5 text-sm font-mono border border-gray-200 rounded-lg text-center focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                            <span className="text-xs text-gray-400 flex-shrink-0">px</span>
                            <SaveButton
                              saving={!!saving[meta.widthKey]}
                              saved={!!saved[meta.widthKey]}
                              onClick={() => handleSave(meta.widthKey!)}
                            />
                          </div>
                          <p className="text-xs text-gray-300 font-mono mt-0.5">{meta.widthKey}</p>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              )
            })}

            <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-700">
              <p className="font-semibold mb-1">Como os logos são aplicados</p>
              <ul className="list-disc list-inside space-y-1 text-blue-600 text-xs">
                <li><strong>Landing Page (400×100)</strong> — Hero e rodapé da página pública</li>
                <li><strong>Admin (180×48)</strong> — Sidebar do painel administrativo</li>
                <li><strong>Login (200×200)</strong> — Tela de autenticação</li>
                <li><strong>Header Mobile (120×32)</strong> — Cabeçalho do app do usuário</li>
                <li><strong>Favicon (32×32)</strong> — Ícone na aba do navegador</li>
              </ul>
            </div>
          </div>
        )}

        {/* ── TAB: CONTEÚDO DA HOME ──────────────────────────────────────────── */}
        {tab === 'conteudo' && (
          <div className="space-y-6">
            <p className="text-sm text-gray-500">
              Edite os textos da Landing Page. Se vazio, o sistema usa o texto padrão.{' '}
              No título do hero, use <code className="font-mono text-xs bg-gray-100 px-1 rounded">[gold]palavra[/gold]</code> para destacar em dourado.
            </p>

            {/* ── Section: Hero ── */}
            <ContentSection title="Hero — Banner Principal" icon="🚀">
              {[
                { key: 'home_hero_title',    label: 'Título Principal',   placeholder: (BRAND_DEFAULTS as Record<string,string>).home_hero_title,    multiline: false },
                { key: 'home_hero_subtitle', label: 'Subtítulo',          placeholder: (BRAND_DEFAULTS as Record<string,string>).home_hero_subtitle,  multiline: true  },
                { key: 'home_hero_cta',      label: 'Texto do Botão CTA', placeholder: (BRAND_DEFAULTS as Record<string,string>).home_hero_cta,       multiline: false },
                { key: 'campaign_end_date',  label: 'Data de Encerramento (YYYY-MM-DD)', placeholder: '2025-12-31', multiline: false },
              ].map(({ key, label, placeholder, multiline }) => (
                <CmsField key={key} dbKey={key} label={label} placeholder={placeholder}
                  value={settings[key] ?? ''} onChange={(v) => setValue(key, v)}
                  saving={!!saving[key]} saved={!!saved[key]} onSave={() => handleSave(key)}
                  multiline={multiline} />
              ))}
            </ContentSection>

            {/* ── Section: Steps ── */}
            <ContentSection title="Como Funciona — 5 Passos" icon="📋">
              {([
                { n: '01', tk: 'home_step_01_title', dk: 'home_step_01_desc' },
                { n: '02', tk: 'home_step_02_title', dk: 'home_step_02_desc' },
                { n: '03', tk: 'home_step_03_title', dk: 'home_step_03_desc' },
                { n: '04', tk: 'home_step_04_title', dk: 'home_step_04_desc' },
                { n: '05', tk: 'home_step_05_title', dk: 'home_step_05_desc' },
              ] as const).map(({ n, tk, dk }) => (
                <div key={n} className="space-y-2 pb-4 border-b border-gray-100 last:border-0">
                  <p className="text-xs font-bold text-indigo-500 uppercase tracking-widest">Passo {n}</p>
                  <CmsField dbKey={tk} label="Título" placeholder={(BRAND_DEFAULTS as Record<string,string>)[tk]}
                    value={settings[tk] ?? ''} onChange={(v) => setValue(tk, v)}
                    saving={!!saving[tk]} saved={!!saved[tk]} onSave={() => handleSave(tk)}
                    multiline={false} />
                  <CmsField dbKey={dk} label="Descrição" placeholder={(BRAND_DEFAULTS as Record<string,string>)[dk]}
                    value={settings[dk] ?? ''} onChange={(v) => setValue(dk, v)}
                    saving={!!saving[dk]} saved={!!saved[dk]} onSave={() => handleSave(dk)}
                    multiline={true} />
                </div>
              ))}
            </ContentSection>

            {/* ── Section: Features ── */}
            <ContentSection title="Funcionalidades — 4 Destaques" icon="⚡">
              {([
                { n: '01', tk: 'home_feat_01_title', dk: 'home_feat_01_desc' },
                { n: '02', tk: 'home_feat_02_title', dk: 'home_feat_02_desc' },
                { n: '03', tk: 'home_feat_03_title', dk: 'home_feat_03_desc' },
                { n: '04', tk: 'home_feat_04_title', dk: 'home_feat_04_desc' },
              ] as const).map(({ n, tk, dk }) => (
                <div key={n} className="space-y-2 pb-4 border-b border-gray-100 last:border-0">
                  <p className="text-xs font-bold text-indigo-500 uppercase tracking-widest">Funcionalidade {n}</p>
                  <CmsField dbKey={tk} label="Título" placeholder={(BRAND_DEFAULTS as Record<string,string>)[tk]}
                    value={settings[tk] ?? ''} onChange={(v) => setValue(tk, v)}
                    saving={!!saving[tk]} saved={!!saved[tk]} onSave={() => handleSave(tk)}
                    multiline={false} />
                  <CmsField dbKey={dk} label="Descrição" placeholder={(BRAND_DEFAULTS as Record<string,string>)[dk]}
                    value={settings[dk] ?? ''} onChange={(v) => setValue(dk, v)}
                    saving={!!saving[dk]} saved={!!saved[dk]} onSave={() => handleSave(dk)}
                    multiline={true} />
                </div>
              ))}
            </ContentSection>

            {/* ── Section: Social Proof ── */}
            <ContentSection title="Prova Social & Badge" icon="🏆">
              <p className="text-xs text-gray-400 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                Fase atual: preencha manualmente com dados reais ou fictícios.
                Futuramente esses campos serão preenchidos automaticamente a partir dos prêmios entregues.
              </p>

              {/* Floating badge */}
              <div className="space-y-3 pb-4 border-b border-gray-100">
                <p className="text-xs font-bold text-indigo-500 uppercase tracking-widest">Badge Flutuante (Hero)</p>
                <ToggleField
                  dbKey="badge_show" label="Exibir badge no Hero"
                  desc="Mostra o card flutuante do último prêmio entregue"
                  value={settings.badge_show ?? 'true'}
                  onToggle={() => handleToggle('badge_show')}
                  saving={!!saving.badge_show} saved={!!saved.badge_show}
                />
                {[
                  { key: 'badge_label',  label: 'Rótulo',        placeholder: (BRAND_DEFAULTS as Record<string,string>).badge_label },
                  { key: 'badge_prize',  label: 'Nome do Prêmio', placeholder: (BRAND_DEFAULTS as Record<string,string>).badge_prize  },
                  { key: 'badge_winner', label: 'Nome do Ganhador', placeholder: (BRAND_DEFAULTS as Record<string,string>).badge_winner },
                  { key: 'badge_date',   label: 'Data (ex: Fev 2025)', placeholder: (BRAND_DEFAULTS as Record<string,string>).badge_date },
                ].map(({ key, label, placeholder }) => (
                  <CmsField key={key} dbKey={key} label={label} placeholder={placeholder}
                    value={settings[key] ?? ''} onChange={(v) => setValue(key, v)}
                    saving={!!saving[key]} saved={!!saved[key]} onSave={() => handleSave(key)}
                    multiline={false} />
                ))}
              </div>

              {/* Past prizes gallery */}
              {([
                { n: '01', imgKey: 'prize_01_image_url', keys: ['prize_01_title', 'prize_01_subtitle', 'prize_01_winner', 'prize_01_date'] },
                { n: '02', imgKey: 'prize_02_image_url', keys: ['prize_02_title', 'prize_02_subtitle', 'prize_02_winner', 'prize_02_date'] },
                { n: '03', imgKey: 'prize_03_image_url', keys: ['prize_03_title', 'prize_03_subtitle', 'prize_03_winner', 'prize_03_date'] },
                { n: '04', imgKey: 'prize_04_image_url', keys: ['prize_04_title', 'prize_04_subtitle', 'prize_04_winner', 'prize_04_date'] },
              ] as const).map(({ n, imgKey, keys }) => (
                <div key={n} className="space-y-2 pb-4 border-b border-gray-100 last:border-0">
                  <p className="text-xs font-bold text-indigo-500 uppercase tracking-widest">Prêmio Sorteado {n}</p>

                  {/* Image upload */}
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-gray-700">Imagem</p>
                    <div className="flex items-start gap-3">
                      <div className="w-20 h-14 rounded-xl border-2 border-dashed border-gray-200 flex-shrink-0 overflow-hidden flex items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-50">
                        {settings[imgKey] ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={settings[imgKey]} alt="" className="w-full h-full object-cover"
                            onError={(e) => { (e.currentTarget as HTMLImageElement).style.opacity = '0' }} />
                        ) : (
                          <span className="text-xl">🏆</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0 space-y-1.5">
                        <div className="flex gap-2">
                          <input
                            type="url"
                            value={settings[imgKey] ?? ''}
                            onChange={(e) => setValue(imgKey, e.target.value)}
                            placeholder="https://... ou faça upload"
                            className="flex-1 px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                          />
                          <SaveButton saving={!!saving[imgKey]} saved={!!saved[imgKey]} onClick={() => handleSave(imgKey)} />
                        </div>
                        <button
                          onClick={() => fileRefs.current[imgKey]?.click()}
                          disabled={!!uploading[imgKey]}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-indigo-200 text-indigo-700 hover:bg-indigo-50 transition disabled:opacity-50"
                        >
                          {uploading[imgKey] ? (
                            <>
                              <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                              </svg>
                              Enviando...
                            </>
                          ) : (
                            <>
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
                              </svg>
                              Upload
                            </>
                          )}
                        </button>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          ref={(el) => { fileRefs.current[imgKey] = el }}
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            e.target.value = ''
                            if (file) handleLogoUpload(imgKey, file)
                          }}
                        />
                        <p className="text-xs text-gray-300 font-mono">{imgKey}</p>
                      </div>
                    </div>
                  </div>

                  {([
                    { key: keys[0], label: 'Título',          multiline: false },
                    { key: keys[1], label: 'Subtítulo',       multiline: false },
                    { key: keys[2], label: 'Ganhador',        multiline: false },
                    { key: keys[3], label: 'Data de entrega', multiline: false },
                  ] as const).map(({ key, label, multiline }) => (
                    <CmsField key={key} dbKey={key} label={label}
                      placeholder={(BRAND_DEFAULTS as Record<string,string>)[key]}
                      value={settings[key] ?? ''} onChange={(v) => setValue(key, v)}
                      saving={!!saving[key]} saved={!!saved[key]} onSave={() => handleSave(key)}
                      multiline={multiline} />
                  ))}
                </div>
              ))}
            </ContentSection>

            {/* ── Section: Footer ── */}
            <ContentSection title="Rodapé" icon="🏷️">
              <CmsField dbKey="home_footer_desc" label="Tagline da Marca"
                placeholder={(BRAND_DEFAULTS as Record<string,string>).home_footer_desc}
                value={settings.home_footer_desc ?? ''} onChange={(v) => setValue('home_footer_desc', v)}
                saving={!!saving.home_footer_desc} saved={!!saved.home_footer_desc}
                onSave={() => handleSave('home_footer_desc')}
                multiline={false} />
            </ContentSection>
          </div>
        )}

        {/* ── TAB: FAQ ───────────────────────────────────────────────────────── */}
        {tab === 'faq' && (
          <div>
            <p className="text-sm text-gray-500 mb-5">
              Gerencie as perguntas frequentes exibidas na página de Ajuda do WebApp.
              Itens inativos ficam ocultos para os usuários sem serem excluídos.
            </p>
            <FaqManager />
          </div>
        )}

        {/* ── TAB: SUPORTE ───────────────────────────────────────────────────── */}
        {tab === 'suporte' && (
          <div className="space-y-6">

            {/* ── Links de Suporte ── */}
            <div>
              <h3 className="text-sm font-semibold text-gray-800 mb-1">Links de Suporte</h3>
              <p className="text-xs text-gray-400 mb-3">
                Aparecem na coluna &quot;Suporte&quot; do rodapé da Landing Page.
              </p>
              <div className="space-y-3">
                {[
                  { key: 'support_whatsapp', label: 'Número WhatsApp (só dígitos)', placeholder: '5511999999999', hint: 'Usado como wa.me/número' },
                  { key: 'support_terms',    label: 'URL dos Termos de Uso',        placeholder: 'https://...', hint: '' },
                  { key: 'support_privacy',  label: 'URL da Política de Privacidade', placeholder: 'https://...', hint: '' },
                  { key: 'support_help',     label: 'URL da Central de Ajuda',      placeholder: 'https://...', hint: '' },
                  { key: 'support_contact',  label: 'URL de Contato',               placeholder: '#', hint: '' },
                ].map(({ key, label, placeholder, hint }) => (
                  <div key={key} className="bg-white rounded-xl border border-gray-200 shadow-sm px-5 py-4 flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <label className="block text-sm font-medium text-gray-800 mb-1">{label}</label>
                      <input
                        type="text"
                        value={settings[key] ?? ''}
                        onChange={(e) => setValue(key, e.target.value)}
                        placeholder={placeholder}
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                      />
                      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
                      <p className="text-xs text-gray-300 mt-0.5 font-mono">{key}</p>
                    </div>
                    <SaveButton
                      saving={!!saving[key]}
                      saved={!!saved[key]}
                      onClick={() => handleSave(key)}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* ── Links Sociais ── */}
            <div>
              <h3 className="text-sm font-semibold text-gray-800 mb-1">Links Sociais</h3>
              <p className="text-xs text-gray-400 mb-3">
                Ícones aparecem no rodapé da Landing Page. Deixe em branco para ocultar o ícone.
              </p>
              <div className="space-y-3">
                {[
                  { key: 'social_instagram', label: 'Instagram', placeholder: 'https://instagram.com/suapagina', icon: '📷' },
                  { key: 'social_facebook',  label: 'Facebook',  placeholder: 'https://facebook.com/suapagina',  icon: '👤' },
                  { key: 'social_linkedin',  label: 'LinkedIn',  placeholder: 'https://linkedin.com/company/...', icon: '💼' },
                  { key: 'social_whatsapp',  label: 'WhatsApp (link completo)', placeholder: 'https://wa.me/5511999999999', icon: '💬' },
                ].map(({ key, label, placeholder, icon }) => (
                  <div key={key} className="bg-white rounded-xl border border-gray-200 shadow-sm px-5 py-4 flex items-center gap-4">
                    <span className="text-xl flex-shrink-0">{icon}</span>
                    <div className="flex-1 min-w-0">
                      <label className="block text-sm font-medium text-gray-800 mb-1">{label}</label>
                      <input
                        type="url"
                        value={settings[key] ?? ''}
                        onChange={(e) => setValue(key, e.target.value)}
                        placeholder={placeholder}
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                      />
                      <p className="text-xs text-gray-300 mt-0.5 font-mono">{key}</p>
                    </div>
                    <SaveButton
                      saving={!!saving[key]}
                      saved={!!saved[key]}
                      onClick={() => handleSave(key)}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

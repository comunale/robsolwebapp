'use client'

import { useState, useEffect } from 'react'
import AdminHeader from './AdminHeader'
import LoadingSpinner from '@/components/shared/LoadingSpinner'

interface Setting {
  key: string
  label: string
  value: string
}

export default function SiteSettings() {
  const [settings, setSettings] = useState<Setting[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<Record<string, boolean>>({})
  const [saved, setSaved] = useState<Record<string, boolean>>({})

  useEffect(() => {
    fetch('/api/admin/site-settings')
      .then((r) => r.json())
      .then((d) => setSettings(d.settings ?? []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const handleChange = (key: string, value: string) => {
    setSettings((prev) => prev.map((s) => s.key === key ? { ...s, value } : s))
    setSaved((prev) => ({ ...prev, [key]: false }))
  }

  const handleSave = async (key: string, value: string) => {
    setSaving((prev) => ({ ...prev, [key]: true }))
    try {
      const res = await fetch('/api/admin/site-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value }),
      })
      if (!res.ok) throw new Error('Falha ao salvar')
      setSaved((prev) => ({ ...prev, [key]: true }))
      setTimeout(() => setSaved((prev) => ({ ...prev, [key]: false })), 2500)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao salvar')
    } finally {
      setSaving((prev) => ({ ...prev, [key]: false }))
    }
  }

  if (loading) return <LoadingSpinner />

  // Group by prefix
  const groups: Record<string, Setting[]> = {}
  for (const s of settings) {
    const prefix = s.key.split('_')[0]
    groups[prefix] = [...(groups[prefix] ?? []), s]
  }

  const groupLabels: Record<string, string> = {
    support: 'Links de Suporte (Rodapé do Site)',
  }

  return (
    <>
      <AdminHeader
        title="Configurações do Site"
        subtitle="Gerencie os links e informações exibidos no rodapé da landing page"
      />
      <div className="p-6 max-w-3xl">
        {Object.entries(groups).map(([prefix, rows]) => (
          <div key={prefix} className="mb-8">
            <h2 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-4">
              {groupLabels[prefix] ?? prefix}
            </h2>
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm divide-y divide-gray-100">
              {rows.map((setting) => (
                <div key={setting.key} className="px-5 py-4 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <label className="block text-sm font-medium text-gray-800 mb-1">
                      {setting.label}
                    </label>
                    <input
                      type="text"
                      value={setting.value}
                      onChange={(e) => handleChange(setting.key, e.target.value)}
                      placeholder={setting.key === 'support_whatsapp' ? '5511999999999' : 'https://...'}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-gray-700 placeholder-gray-300"
                    />
                    <p className="text-xs text-gray-400 mt-1 font-mono">{setting.key}</p>
                  </div>
                  <button
                    onClick={() => handleSave(setting.key, setting.value)}
                    disabled={saving[setting.key]}
                    className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition ${
                      saved[setting.key]
                        ? 'bg-green-100 text-green-700'
                        : 'bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white'
                    }`}
                  >
                    {saving[setting.key] ? 'Salvando...' : saved[setting.key] ? '✓ Salvo' : 'Salvar'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}

        <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-700">
          <p className="font-semibold mb-1">Como funciona</p>
          <ul className="list-disc list-inside space-y-1 text-blue-600">
            <li>As alterações são refletidas no rodapé do site em até 2 minutos (cache CDN).</li>
            <li>Para o WhatsApp, insira apenas os dígitos com código do país (ex: <code className="font-mono bg-blue-100 px-1 rounded">5511999999999</code>).</li>
            <li>Para URLs, use o caminho completo começando com <code className="font-mono bg-blue-100 px-1 rounded">https://</code> ou <code className="font-mono bg-blue-100 px-1 rounded">#</code> para desativar o link.</li>
          </ul>
        </div>
      </div>
    </>
  )
}

'use client'

import { useState, useEffect, useRef } from 'react'
import AdminHeader from './AdminHeader'
import LoadingSpinner from '@/components/shared/LoadingSpinner'
import type { Store } from '@/types/store'

interface ImportResult {
  imported: number
  errors: string[]
}

export default function StoreManagement() {
  const [stores, setStores] = useState<Store[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingStore, setEditingStore] = useState<Store | null>(null)
  const [formData, setFormData] = useState({ name: '', cnpj: '', location: '' })
  const [saving, setSaving] = useState(false)

  // Import state
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)

  useEffect(() => {
    fetchStores()
  }, [])

  const fetchStores = async () => {
    try {
      const res = await fetch('/api/stores')
      const data = await res.json()
      if (data.stores) setStores(data.stores)
    } catch (err) {
      console.error('Falha ao buscar lojas:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSaving(true)
    try {
      const url = editingStore ? `/api/stores/${editingStore.id}` : '/api/stores'
      const method = editingStore ? 'PATCH' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      if (!res.ok) throw new Error('Falha ao salvar loja')
      await fetchStores()
      resetForm()
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Falha ao salvar loja')
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (store: Store) => {
    setEditingStore(store)
    setFormData({ name: store.name, cnpj: store.cnpj, location: store.location || '' })
    setShowForm(true)
  }

  const handleToggleActive = async (store: Store) => {
    try {
      await fetch(`/api/stores/${store.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !store.is_active }),
      })
      await fetchStores()
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Falha ao atualizar status da loja')
    }
  }

  const handleDelete = async (storeId: string) => {
    if (!confirm('Tem certeza que deseja excluir esta loja?')) return
    try {
      await fetch(`/api/stores/${storeId}`, { method: 'DELETE' })
      await fetchStores()
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Falha ao excluir loja')
    }
  }

  const resetForm = () => {
    setShowForm(false)
    setEditingStore(null)
    setFormData({ name: '', cnpj: '', location: '' })
  }

  // ── Template download ──────────────────────────────────────────────────────
  const handleDownloadTemplate = () => {
    const csv = 'nome,cnpj,localizacao\nLoja Exemplo,00.000.000/0001-00,Sao Paulo SP\n'
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'template_lojas.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  // ── File import handler ───────────────────────────────────────────────────
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''

    setImporting(true)
    setImportResult(null)

    try {
      const ext = file.name.split('.').pop()?.toLowerCase()
      let rows: { name: string; cnpj: string; location?: string }[] = []
      const errors: string[] = []

      if (ext === 'csv') {
        const text = await file.text()
        const Papa = (await import('papaparse')).default
        const parsed = Papa.parse<Record<string, string>>(text, {
          header: true,
          skipEmptyLines: true,
        })
        parsed.data.forEach((row, i) => {
          const name = (row['nome'] ?? row['name'] ?? '').trim()
          const cnpj = (row['cnpj'] ?? '').trim()
          const location = (row['localizacao'] ?? row['location'] ?? '').trim()
          if (!name || !cnpj) {
            errors.push(`Linha ${i + 2}: nome ou CNPJ ausente`)
          } else {
            rows.push({ name, cnpj, location: location || undefined })
          }
        })
      } else if (ext === 'xlsx' || ext === 'xls') {
        const XLSX = await import('xlsx')
        const buffer = await file.arrayBuffer()
        const wb = XLSX.read(buffer, { type: 'array' })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const data = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' })
        data.forEach((row, i) => {
          const name = String(row['nome'] ?? row['name'] ?? '').trim()
          const cnpj = String(row['cnpj'] ?? '').trim()
          const location = String(row['localizacao'] ?? row['location'] ?? '').trim()
          if (!name || !cnpj) {
            errors.push(`Linha ${i + 2}: nome ou CNPJ ausente`)
          } else {
            rows.push({ name, cnpj, location: location || undefined })
          }
        })
      } else {
        errors.push('Formato nao suportado. Use CSV ou XLSX.')
      }

      if (rows.length > 0) {
        const res = await fetch('/api/stores/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ stores: rows }),
        })
        const data = await res.json()
        if (!res.ok) {
          errors.push(data.error ?? 'Falha ao importar')
          setImportResult({ imported: 0, errors })
        } else {
          setImportResult({ imported: data.imported ?? rows.length, errors })
          await fetchStores()
        }
      } else {
        setImportResult({ imported: 0, errors })
      }
    } catch (err: unknown) {
      setImportResult({
        imported: 0,
        errors: [err instanceof Error ? err.message : 'Falha ao processar arquivo'],
      })
    } finally {
      setImporting(false)
    }
  }

  if (loading) return <LoadingSpinner />

  return (
    <>
      <AdminHeader title="Gestao de Lojas" subtitle={`${stores.length} loja(s) cadastrada(s)`}>
        <div className="flex items-center gap-2">
          {/* Download template */}
          <button
            onClick={handleDownloadTemplate}
            className="flex items-center gap-1.5 border border-gray-300 hover:bg-gray-50 text-gray-700 px-3 py-2 rounded-lg text-sm font-medium transition"
            title="Baixar modelo CSV"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            Modelo CSV
          </button>

          {/* Import button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
            className="flex items-center gap-1.5 border border-indigo-300 hover:bg-indigo-50 text-indigo-700 px-3 py-2 rounded-lg text-sm font-medium transition disabled:opacity-50"
          >
            {importing ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Importando...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
                </svg>
                Importar Lojas
              </>
            )}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            className="hidden"
            onChange={handleFileChange}
          />

          <button
            onClick={() => { resetForm(); setShowForm(true) }}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
          >
            + Adicionar Loja
          </button>
        </div>
      </AdminHeader>

      <div className="p-6">
        {/* Import result banner */}
        {importResult && (
          <div className={`mb-4 p-4 rounded-lg border text-sm ${
            importResult.errors.length === 0
              ? 'bg-green-50 border-green-200 text-green-800'
              : importResult.imported > 0
                ? 'bg-yellow-50 border-yellow-200 text-yellow-800'
                : 'bg-red-50 border-red-200 text-red-800'
          }`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                {importResult.imported > 0 && (
                  <p className="font-medium">{importResult.imported} loja(s) importada(s) com sucesso.</p>
                )}
                {importResult.errors.length > 0 && (
                  <ul className="mt-1 list-disc list-inside space-y-0.5">
                    {importResult.errors.map((e, i) => <li key={i}>{e}</li>)}
                  </ul>
                )}
              </div>
              <button onClick={() => setImportResult(null)} className="text-current opacity-60 hover:opacity-100 flex-shrink-0">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Modal do formulario */}
        {showForm && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <h3 className="text-lg font-semibold mb-4">
              {editingStore ? 'Editar Loja' : 'Nova Loja'}
            </h3>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                  placeholder="Nome da loja"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">CNPJ</label>
                <input
                  type="text"
                  required
                  value={formData.cnpj}
                  onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                  placeholder="00.000.000/0000-00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Localizacao</label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                  placeholder="Cidade, Estado"
                />
              </div>
              <div className="md:col-span-3 flex gap-3">
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white px-6 py-2 rounded-lg text-sm font-medium transition"
                >
                  {saving ? 'Salvando...' : editingStore ? 'Atualizar' : 'Criar'}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-2 rounded-lg text-sm font-medium transition"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Lista de lojas */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nome</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">CNPJ</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Localizacao</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acoes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {stores.map((store) => (
                <tr key={store.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{store.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{store.cnpj}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{store.location || '-'}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      store.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {store.is_active ? 'Ativa' : 'Inativa'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <button onClick={() => handleEdit(store)} className="text-indigo-600 hover:text-indigo-800 text-sm font-medium">Editar</button>
                    <button onClick={() => handleToggleActive(store)} className="text-yellow-600 hover:text-yellow-800 text-sm font-medium">
                      {store.is_active ? 'Desativar' : 'Ativar'}
                    </button>
                    <button onClick={() => handleDelete(store.id)} className="text-red-600 hover:text-red-800 text-sm font-medium">Excluir</button>
                  </td>
                </tr>
              ))}
              {stores.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    Nenhuma loja cadastrada. Clique em &quot;+ Adicionar Loja&quot; para comecar.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}

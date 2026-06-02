'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import AdminHeader from './AdminHeader'
import LoadingSpinner from '@/components/shared/LoadingSpinner'
import type { Store } from '@/types/store'

const PAGE_SIZE = 50

interface ImportResult {
  imported: number
  errors: string[]
}

export default function StoreManagement() {
  const [stores, setStores] = useState<Store[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingStore, setEditingStore] = useState<Store | null>(null)
  const [formData, setFormData] = useState({ name: '', cnpj: '', location: '', razao_social: '' })
  const [saving, setSaving] = useState(false)

  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [currentPage, setCurrentPage] = useState(1)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)

  useEffect(() => { fetchStores() }, [])

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

  const filteredStores = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return stores.filter((store) => {
      if (statusFilter === 'active' && !store.is_active) return false
      if (statusFilter === 'inactive' && store.is_active) return false
      if (!q) return true
      const cnpjClean = store.cnpj.replace(/\D/g, '')
      return (
        store.name.toLowerCase().includes(q) ||
        (store.razao_social?.toLowerCase().includes(q) ?? false) ||
        cnpjClean.includes(q.replace(/\D/g, '')) ||
        (store.location?.toLowerCase().includes(q) ?? false)
      )
    })
  }, [stores, searchQuery, statusFilter])

  const totalPages = Math.max(1, Math.ceil(filteredStores.length / PAGE_SIZE))
  const safePage = Math.min(currentPage, totalPages)
  const pagedStores = filteredStores.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  useEffect(() => { setCurrentPage(1) }, [searchQuery, statusFilter])

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
    setFormData({
      name: store.name,
      cnpj: store.cnpj,
      location: store.location || '',
      razao_social: store.razao_social || '',
    })
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
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
      alert(err instanceof Error ? err.message : 'Falha ao atualizar status')
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
    setFormData({ name: '', cnpj: '', location: '', razao_social: '' })
  }

  const handleDownloadTemplate = () => {
    const csv = 'nome,cnpj,localizacao\nLoja Exemplo,00.000.000/0001-00,SP\n'
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'template_lojas.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    setImporting(true)
    setImportResult(null)
    try {
      const ext = file.name.split('.').pop()?.toLowerCase()
      const rows: { name: string; cnpj: string; location?: string }[] = []
      const errors: string[] = []
      if (ext === 'csv') {
        const text = await file.text()
        const Papa = (await import('papaparse')).default
        const parsed = Papa.parse<Record<string, string>>(text, { header: true, skipEmptyLines: true })
        parsed.data.forEach((row, i) => {
          const name = (row['nome'] ?? row['name'] ?? '').trim()
          const cnpj = (row['cnpj'] ?? '').trim()
          const location = (row['localizacao'] ?? row['location'] ?? '').trim()
          if (!name || !cnpj) errors.push(`Linha ${i + 2}: nome ou CNPJ ausente`)
          else rows.push({ name, cnpj, location: location || undefined })
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
          if (!name || !cnpj) errors.push(`Linha ${i + 2}: nome ou CNPJ ausente`)
          else rows.push({ name, cnpj, location: location || undefined })
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
      setImportResult({ imported: 0, errors: [err instanceof Error ? err.message : 'Falha ao processar arquivo'] })
    } finally {
      setImporting(false)
    }
  }

  if (loading) return <LoadingSpinner />

  const statusCounts = {
    all: stores.length,
    active: stores.filter(s => s.is_active).length,
    inactive: stores.filter(s => !s.is_active).length,
  }

  return (
    <>
      <AdminHeader title="Gestao de Lojas" subtitle={`${stores.length} loja(s) cadastrada(s)`}>
        <div className="flex items-center gap-2">
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
          <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleFileChange} />
          <button
            onClick={() => { resetForm(); setShowForm(true) }}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
          >
            + Adicionar Loja
          </button>
        </div>
      </AdminHeader>

      <div className="p-6 space-y-4">
        {/* Import result banner */}
        {importResult && (
          <div className={`p-4 rounded-lg border text-sm ${
            importResult.errors.length === 0
              ? 'bg-green-50 border-green-200 text-green-800'
              : importResult.imported > 0
                ? 'bg-yellow-50 border-yellow-200 text-yellow-800'
                : 'bg-red-50 border-red-200 text-red-800'
          }`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                {importResult.imported > 0 && <p className="font-medium">{importResult.imported} loja(s) importada(s) com sucesso.</p>}
                {importResult.errors.length > 0 && (
                  <ul className="mt-1 list-disc list-inside space-y-0.5">
                    {importResult.errors.map((err, i) => <li key={i}>{err}</li>)}
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

        {/* Form */}
        {showForm && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold mb-4">{editingStore ? 'Editar Loja' : 'Nova Loja'}</h3>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome Fantasia <span className="text-red-500">*</span>
                </label>
                <input
                  type="text" required value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm"
                  placeholder="Nome da loja"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Razão Social</label>
                <input
                  type="text" value={formData.razao_social}
                  onChange={(e) => setFormData({ ...formData, razao_social: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm"
                  placeholder="Razão social da empresa"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  CNPJ <span className="text-red-500">*</span>
                </label>
                <input
                  type="text" required value={formData.cnpj}
                  onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm font-mono"
                  placeholder="00000000000000"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">UF</label>
                <input
                  type="text" value={formData.location} maxLength={2}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm"
                  placeholder="SP"
                />
              </div>
              <div className="md:col-span-2 flex gap-3 pt-1">
                <button
                  type="submit" disabled={saving}
                  className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white px-6 py-2 rounded-lg text-sm font-medium transition"
                >
                  {saving ? 'Salvando...' : editingStore ? 'Atualizar' : 'Criar'}
                </button>
                <button
                  type="button" onClick={resetForm}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-2 rounded-lg text-sm font-medium transition"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Search + status filters */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="relative w-full sm:max-w-sm">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
            </svg>
            <input
              type="text" value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar nome, razão social, CNPJ ou UF..."
              className="w-full pl-9 pr-8 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                aria-label="Limpar busca"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
          <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg text-sm flex-shrink-0">
            {(['all', 'active', 'inactive'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setStatusFilter(f)}
                className={`px-3 py-1.5 rounded-md font-medium transition whitespace-nowrap ${
                  statusFilter === f ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {f === 'all'
                  ? `Todas (${statusCounts.all})`
                  : f === 'active'
                    ? `Ativas (${statusCounts.active})`
                    : `Inativas (${statusCounts.inactive})`}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-4 py-2.5 border-b border-gray-100 text-xs text-gray-400">
            {filteredStores.length === stores.length
              ? `${stores.length} lojas`
              : `${filteredStores.length} de ${stores.length} lojas`}
            {totalPages > 1 && ` · página ${safePage} de ${totalPages}`}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Nome Fantasia</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Razão Social</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">CNPJ</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">UF</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wide">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pagedStores.map((store) => (
                  <tr key={store.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{store.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 max-w-[200px]">
                      <span className="block truncate" title={store.razao_social ?? undefined}>
                        {store.razao_social || <span className="text-gray-300">—</span>}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 font-mono">{store.cnpj}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{store.location || <span className="text-gray-300">—</span>}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                        store.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {store.is_active ? 'Ativa' : 'Inativa'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <button onClick={() => handleEdit(store)} className="text-indigo-600 hover:text-indigo-800 text-sm font-medium">
                          Editar
                        </button>
                        <button
                          onClick={() => handleToggleActive(store)}
                          className={`text-sm font-medium ${store.is_active ? 'text-yellow-600 hover:text-yellow-800' : 'text-green-600 hover:text-green-800'}`}
                        >
                          {store.is_active ? 'Desativar' : 'Ativar'}
                        </button>
                        <button onClick={() => handleDelete(store.id)} className="text-red-500 hover:text-red-700 text-sm font-medium">
                          Excluir
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {pagedStores.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-gray-400 text-sm">
                      {searchQuery || statusFilter !== 'all'
                        ? 'Nenhuma loja encontrada para este filtro.'
                        : 'Nenhuma loja cadastrada. Clique em "+ Adicionar Loja" para começar.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
              <span className="text-xs text-gray-400">
                {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filteredStores.length)} de {filteredStores.length}
              </span>
              <div className="flex items-center gap-1">
                <button onClick={() => setCurrentPage(1)} disabled={safePage === 1} className="w-7 h-7 flex items-center justify-center rounded text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed text-sm">«</button>
                <button onClick={() => setCurrentPage(p => p - 1)} disabled={safePage === 1} className="w-7 h-7 flex items-center justify-center rounded text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed text-sm">‹</button>
                <span className="px-3 text-xs text-gray-600 font-medium">{safePage} / {totalPages}</span>
                <button onClick={() => setCurrentPage(p => p + 1)} disabled={safePage === totalPages} className="w-7 h-7 flex items-center justify-center rounded text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed text-sm">›</button>
                <button onClick={() => setCurrentPage(totalPages)} disabled={safePage === totalPages} className="w-7 h-7 flex items-center justify-center rounded text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed text-sm">»</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

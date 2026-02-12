'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/hooks/useAuth'
import AdminHeader from './AdminHeader'
import LoadingSpinner from '@/components/shared/LoadingSpinner'
import type { Store } from '@/types/store'

export default function StoreManagement() {
  const { user, profile, loading: authLoading } = useAuth()
  const [stores, setStores] = useState<Store[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingStore, setEditingStore] = useState<Store | null>(null)
  const [formData, setFormData] = useState({ name: '', cnpj: '', location: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (user && profile?.role === 'admin') fetchStores()
  }, [user, profile])

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

  const handleSubmit = async (e: React.FormEvent) => {
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

  if (authLoading || loading) return <LoadingSpinner />
  if (!user || profile?.role !== 'admin') return null

  return (
    <>
      <AdminHeader title="Gestao de Lojas" subtitle={`${stores.length} loja(s) cadastrada(s)`}>
        <button
          onClick={() => { resetForm(); setShowForm(true) }}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
        >
          + Adicionar Loja
        </button>
      </AdminHeader>

      <div className="p-6">
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

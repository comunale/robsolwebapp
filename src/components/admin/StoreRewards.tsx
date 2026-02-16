'use client'

import { useState, useEffect } from 'react'
import AdminHeader from './AdminHeader'
import LoadingSpinner from '@/components/shared/LoadingSpinner'

interface StorePerformanceRow {
  store_id: string
  store_name: string
  cnpj: string
  location: string | null
  salesperson_count: number
  total_coupons: number
  approved_coupons: number
  total_points: number
  goals_completed: number
  current_week_approved: number
  previous_week_approved: number
}

export default function StoreRewards() {
  const [performance, setPerformance] = useState<StorePerformanceRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPerformance()
  }, [])

  const fetchPerformance = async () => {
    try {
      const res = await fetch('/api/store-performance')
      const data = await res.json()
      if (data.performance) setPerformance(data.performance)
    } catch (err) {
      console.error('Falha ao buscar desempenho das lojas:', err)
    } finally {
      setLoading(false)
    }
  }

  const calcGrowth = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0
    return Math.round(((current - previous) / previous) * 100)
  }

  const growthColor = (growth: number) => {
    if (growth >= 20) return 'text-green-700 bg-green-100'
    if (growth > 0) return 'text-yellow-700 bg-yellow-100'
    return 'text-red-700 bg-red-100'
  }

  if (loading) return <LoadingSpinner />

  return (
    <>
      <AdminHeader title="Desempenho das Lojas" subtitle="Acompanhamento B2B - meta: +20% de crescimento semanal" />

      <div className="p-6">
        {/* Cartoes de resumo */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
            <p className="text-sm text-gray-500">Total de Lojas</p>
            <p className="text-2xl font-bold text-gray-900">{performance.length}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
            <p className="text-sm text-gray-500">Total de Vendedores</p>
            <p className="text-2xl font-bold text-indigo-600">
              {performance.reduce((sum, s) => sum + s.salesperson_count, 0)}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
            <p className="text-sm text-gray-500">Metas Concluidas</p>
            <p className="text-2xl font-bold text-green-600">
              {performance.reduce((sum, s) => sum + s.goals_completed, 0)}
            </p>
          </div>
        </div>

        {/* Tabela de desempenho */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Loja</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Localizacao</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Equipe</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Aprovados</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Pontos</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Metas</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Esta Semana</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Semana Anterior</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Crescimento</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {performance.map((store) => {
                const growth = calcGrowth(store.current_week_approved, store.previous_week_approved)
                return (
                  <tr key={store.store_id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900 text-sm">{store.store_name}</div>
                      <div className="text-xs text-gray-500">{store.cnpj}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{store.location || '-'}</td>
                    <td className="px-4 py-3 text-center text-sm font-medium">{store.salesperson_count}</td>
                    <td className="px-4 py-3 text-center text-sm">{store.approved_coupons}</td>
                    <td className="px-4 py-3 text-center text-sm font-medium text-indigo-600">{store.total_points}</td>
                    <td className="px-4 py-3 text-center text-sm">{store.goals_completed}</td>
                    <td className="px-4 py-3 text-center text-sm font-medium">{store.current_week_approved}</td>
                    <td className="px-4 py-3 text-center text-sm text-gray-500">{store.previous_week_approved}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold ${growthColor(growth)}`}>
                        {growth > 0 ? '+' : ''}{growth}%
                      </span>
                    </td>
                  </tr>
                )
              })}
              {performance.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-gray-500">
                    Nenhum dado de loja disponivel ainda.
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

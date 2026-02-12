'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useAuth } from '@/lib/hooks/useAuth'
import { createClient } from '@/lib/supabase/client'
import CabecalhoUsuario from './CabecalhoUsuario'
import BarraNavegacao from './BarraNavegacao'
import LoadingSpinner from '@/components/shared/LoadingSpinner'

interface CouponRow {
  id: string
  status: string
  points_awarded: number
  created_at: string
  campaigns: { title: string } | null
}

export default function MeusCupons() {
  const { user, loading: authLoading } = useAuth()
  const [coupons, setCoupons] = useState<CouponRow[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = useMemo(() => createClient(), [])

  const fetchCoupons = useCallback(async () => {
    try {
      if (!user) return
      const { data } = await supabase
        .from('coupons')
        .select('id, status, points_awarded, created_at, campaigns(title)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      if (data) setCoupons(data as unknown as CouponRow[])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [supabase, user])

  useEffect(() => {
    if (user) void fetchCoupons()
  }, [user, fetchCoupons])

  const statusConfig: Record<string, { label: string; bg: string; text: string }> = {
    pending: { label: 'Pendente', bg: 'bg-yellow-100', text: 'text-yellow-800' },
    approved: { label: 'Aprovado', bg: 'bg-green-100', text: 'text-green-800' },
    rejected: { label: 'Rejeitado', bg: 'bg-red-100', text: 'text-red-800' },
  }

  if (authLoading || loading) return <LoadingSpinner />
  if (!user) return null

  return (
    <>
      <CabecalhoUsuario />
      <main className="max-w-lg mx-auto px-4 py-4 pb-24">
        <h1 className="text-xl font-bold text-gray-900 mb-4">Meus Cupons</h1>

        {coupons.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-500 text-sm">Nenhum cupom enviado ainda.</p>
            <p className="text-gray-400 text-xs mt-1">Escaneie um cupom para comecar!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {coupons.map((coupon) => {
              const status = statusConfig[coupon.status] || statusConfig.pending
              return (
                <div key={coupon.id} className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {coupon.campaigns?.title || 'Campanha'}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {new Date(coupon.created_at).toLocaleDateString('pt-BR', {
                          day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                        })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {coupon.status === 'approved' && coupon.points_awarded > 0 && (
                        <span className="text-sm font-bold text-indigo-600">+{coupon.points_awarded} pts</span>
                      )}
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${status.bg} ${status.text}`}>
                        {status.label}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>
      <BarraNavegacao />
    </>
  )
}

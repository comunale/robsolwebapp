'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import Image from 'next/image'
import AdminHeader from './AdminHeader'
import LoadingSpinner from '@/components/shared/LoadingSpinner'
import { createClient } from '@/lib/supabase/client'
import type { CouponWithRelations, CouponStatus } from '@/types/coupon'

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
}

const statusLabels: Record<string, string> = {
  pending: 'Pendente',
  approved: 'Aprovado',
  rejected: 'Rejeitado',
  all: 'Todos',
}

const REJECTION_REASONS = [
  'Imagem borrada ou ilegível',
  'Produto não corresponde à campanha',
  'Cupom fiscal inválido ou incorreto',
  'Cupom já enviado anteriormente',
  'Quantidade informada incorreta',
  'Modelo de óculos não elegível',
  'Outro motivo',
]

export default function CouponModeration() {
  const [coupons, setCoupons] = useState<CouponWithRelations[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<CouponStatus | 'all'>('pending')
  const [filterCampaignId, setFilterCampaignId] = useState('')
  const [filterUserName, setFilterUserName] = useState('')
  const [campaignList, setCampaignList] = useState<{ id: string; title: string }[]>([])
  const [selectedCoupon, setSelectedCoupon] = useState<CouponWithRelations | null>(null)
  const supabase = useMemo(() => createClient(), [])
  const [reviewPoints, setReviewPoints] = useState(10)
  const [reviewing, setReviewing] = useState(false)
  const [error, setError] = useState('')

  // Image viewer controls
  const [imageZoom, setImageZoom] = useState(1)
  const [imageRotation, setImageRotation] = useState(0)
  const [imagePan, setImagePan] = useState({ x: 0, y: 0 })
  const [isDraggingState, setIsDraggingState] = useState(false)
  const isDragging = useRef(false)
  const dragStart = useRef({ x: 0, y: 0 })
  const panAtDragStart = useRef({ x: 0, y: 0 })

  // Rejection reason modal
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [selectedRejectionReason, setSelectedRejectionReason] = useState('')
  const [customRejectionReason, setCustomRejectionReason] = useState('')

  // Reset image controls whenever a new coupon is opened
  useEffect(() => {
    setImageZoom(1)
    setImageRotation(0)
    setImagePan({ x: 0, y: 0 })
    isDragging.current = false
    setIsDraggingState(false)
  }, [selectedCoupon?.id])

  // Load campaign list for filter dropdown
  useEffect(() => {
    supabase
      .from('campaigns')
      .select('id, title')
      .order('title')
      .then(({ data }) => { if (data) setCampaignList(data) })
  }, [supabase])

  const fetchCoupons = useCallback(async () => {
    setLoading(true)
    try {
      const p = new URLSearchParams()
      if (filter !== 'all') p.set('status', filter)
      if (filterCampaignId) p.set('campaign_id', filterCampaignId)
      const query = p.toString() ? `?${p.toString()}` : ''
      const res = await fetch(`/api/coupons${query}`)
      if (!res.ok) throw new Error('Falha ao carregar cupons')
      const data = await res.json()
      setCoupons(data.coupons || [])
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Falha ao carregar cupons')
    } finally {
      setLoading(false)
    }
  }, [filter, filterCampaignId])

  useEffect(() => {
    void fetchCoupons()
  }, [fetchCoupons])

  // Pre-load campaign's default points when a coupon is selected
  useEffect(() => {
    if (!selectedCoupon) return
    const loadCampaignPoints = async () => {
      try {
        const res = await fetch(`/api/campaigns/${selectedCoupon.campaign_id}`)
        if (res.ok) {
          const data = await res.json()
          const settings = data.campaign?.settings as Record<string, unknown> | null
          const defaultPts = (settings?.points_per_coupon as number) ?? 10
          setReviewPoints(defaultPts)
        }
      } catch {
        // fallback to 10
      }
    }
    void loadCampaignPoints()
  }, [selectedCoupon?.campaign_id])

  const handleReview = async (
    couponId: string,
    status: 'approved' | 'rejected',
    rejectionReason?: string
  ) => {
    setReviewing(true)
    setError('')
    try {
      const res = await fetch(`/api/coupons/${couponId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          points_awarded: status === 'approved' ? reviewPoints : 0,
          rejection_reason: rejectionReason || null,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Falha ao revisar cupom')
      }
      setSelectedCoupon(null)
      setReviewPoints(10)
      await fetchCoupons()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Falha ao revisar cupom')
    } finally {
      setReviewing(false)
    }
  }

  const handleOpenRejectModal = () => {
    setSelectedRejectionReason('')
    setCustomRejectionReason('')
    setShowRejectModal(true)
  }

  const handleConfirmReject = async () => {
    if (!selectedCoupon) return
    const reason = selectedRejectionReason === 'Outro motivo'
      ? customRejectionReason.trim()
      : selectedRejectionReason
    await handleReview(selectedCoupon.id, 'rejected', reason)
    setShowRejectModal(false)
    setSelectedRejectionReason('')
    setCustomRejectionReason('')
  }

  const handleCloseRejectModal = () => {
    setShowRejectModal(false)
    setSelectedRejectionReason('')
    setCustomRejectionReason('')
  }

  const handleImageMouseDown = (e: React.MouseEvent) => {
    if (imageZoom <= 1) return
    e.preventDefault()
    isDragging.current = true
    setIsDraggingState(true)
    dragStart.current = { x: e.clientX, y: e.clientY }
    panAtDragStart.current = { ...imagePan }
  }

  const handleImageMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current) return
    const dx = e.clientX - dragStart.current.x
    const dy = e.clientY - dragStart.current.y
    setImagePan({ x: panAtDragStart.current.x + dx, y: panAtDragStart.current.y + dy })
  }

  const handleImageMouseUpOrLeave = () => {
    if (!isDragging.current) return
    isDragging.current = false
    setIsDraggingState(false)
  }

  const handleImageDownload = async () => {
    if (!selectedCoupon) return
    try {
      const response = await fetch(selectedCoupon.image_url)
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `cupom-${selectedCoupon.id.slice(0, 8)}.jpg`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      window.open(selectedCoupon.image_url, '_blank')
    }
  }

  // Client-side filter by user name / email on top of the server-side status+campaign filter
  const displayedCoupons = useMemo(() => {
    const q = filterUserName.trim().toLowerCase()
    if (!q) return coupons
    return coupons.filter((c) =>
      (c.profiles?.full_name ?? '').toLowerCase().includes(q) ||
      (c.profiles?.email ?? '').toLowerCase().includes(q)
    )
  }, [coupons, filterUserName])

  const canConfirmReject =
    !!selectedRejectionReason &&
    (selectedRejectionReason !== 'Outro motivo' || customRejectionReason.trim().length > 0)

  return (
    <>
      <AdminHeader title="Moderacao de Cupons" subtitle="Revise, aprove ou rejeite os envios dos usuarios" />

      <div className="p-8">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Filter bar */}
        <div className="flex flex-wrap gap-3 mb-6">
          {/* Status tabs */}
          <div className="flex gap-2">
            {(['pending', 'approved', 'rejected', 'all'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition ${
                  filter === s
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                {statusLabels[s]}
              </button>
            ))}
          </div>

          {/* Campaign filter */}
          <select
            value={filterCampaignId}
            onChange={(e) => setFilterCampaignId(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white text-gray-700 focus:ring-2 focus:ring-indigo-400 outline-none"
          >
            <option value="">Todas as campanhas</option>
            {campaignList.map((c) => (
              <option key={c.id} value={c.id}>{c.title}</option>
            ))}
          </select>

          {/* User name search (client-side) */}
          <input
            type="text"
            placeholder="Buscar usuário..."
            value={filterUserName}
            onChange={(e) => setFilterUserName(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white text-gray-700 focus:ring-2 focus:ring-indigo-400 outline-none w-44"
          />
        </div>

        {/* ── REVIEW MODAL ──────────────────────────────────────── */}
        {selectedCoupon && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto">

              {/* Modal Header */}
              <div className="flex justify-between items-center p-6 border-b sticky top-0 bg-white z-10">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Revisar Cupom</h2>
                  <p className="text-sm text-gray-500">
                    Enviado por <span className="font-medium">{selectedCoupon.profiles?.full_name || 'Desconhecido'}</span>
                    {' '}&mdash; Campanha: <span className="font-medium">{selectedCoupon.campaigns?.title || 'Desconhecida'}</span>
                  </p>
                </div>
                <button onClick={() => setSelectedCoupon(null)} className="p-2 hover:bg-gray-100 rounded-full transition">
                  <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Modal Body */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">

                {/* ── LEFT: Image viewer with zoom + rotation ── */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Foto do Cupom</h3>

                  {/* Image frame */}
                  <div
                    className="relative rounded-lg border overflow-hidden bg-gray-900 w-full"
                    style={{
                      height: '380px',
                      cursor: imageZoom > 1 ? (isDraggingState ? 'grabbing' : 'grab') : 'default',
                      userSelect: 'none',
                    }}
                    onMouseDown={handleImageMouseDown}
                    onMouseMove={handleImageMouseMove}
                    onMouseUp={handleImageMouseUpOrLeave}
                    onMouseLeave={handleImageMouseUpOrLeave}
                  >
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        transform: `translate(${imagePan.x}px, ${imagePan.y}px) scale(${imageZoom}) rotate(${imageRotation}deg)`,
                        transition: isDraggingState ? 'none' : 'transform 0.2s ease',
                        transformOrigin: 'center center',
                      }}
                    >
                      <Image
                        src={selectedCoupon.image_url}
                        alt="Cupom"
                        fill
                        sizes="(max-width: 1024px) 100vw, 50vw"
                        className="object-contain"
                      />
                    </div>
                  </div>

                  {/* Image controls bar */}
                  <div className="flex items-center justify-between mt-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                    {/* Rotation — Unicode arrows are reliable across all browsers */}
                    <div className="flex gap-1">
                      <button
                        onClick={() => setImageRotation((r) => r - 90)}
                        title="Girar para a esquerda"
                        className="p-1.5 rounded hover:bg-gray-200 transition text-gray-700 text-lg leading-none"
                      >
                        ↺
                      </button>
                      <button
                        onClick={() => setImageRotation((r) => r + 90)}
                        title="Girar para a direita"
                        className="p-1.5 rounded hover:bg-gray-200 transition text-gray-700 text-lg leading-none"
                      >
                        ↻
                      </button>
                    </div>

                    {/* Zoom — Heroicons v2 MagnifyingGlass paths */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setImageZoom((z) => Math.max(0.5, parseFloat((z - 0.25).toFixed(2))))}
                        title="Diminuir zoom"
                        className="p-1.5 rounded hover:bg-gray-200 transition text-gray-600"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607ZM13.5 10.5h-6" />
                        </svg>
                      </button>
                      <span className="text-xs font-semibold text-gray-600 w-10 text-center tabular-nums">
                        {Math.round(imageZoom * 100)}%
                      </span>
                      <button
                        onClick={() => setImageZoom((z) => Math.min(3, parseFloat((z + 0.25).toFixed(2))))}
                        title="Aumentar zoom"
                        className="p-1.5 rounded hover:bg-gray-200 transition text-gray-600"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607ZM10.5 7.5v6m3-3h-6" />
                        </svg>
                      </button>
                    </div>

                    {/* Reset + Download */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => { setImageZoom(1); setImageRotation(0); setImagePan({ x: 0, y: 0 }) }}
                        className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded hover:bg-gray-200 transition"
                      >
                        Reset
                      </button>
                      <button
                        onClick={handleImageDownload}
                        title="Baixar imagem"
                        className="p-1.5 rounded hover:bg-gray-200 transition text-gray-600"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>

                {/* ── RIGHT: Data Panel ── */}
                <div className="space-y-4">
                  {/* Submission type badge */}
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Dados do Envio</h3>
                    {selectedCoupon.extracted_data?.submission_type === 'manual' ? (
                      <span className="px-2.5 py-1 bg-orange-100 text-orange-700 text-xs font-semibold rounded-full">
                        Entrada Manual
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">
                        Extraído por IA
                      </span>
                    )}
                  </div>

                  {selectedCoupon.extracted_data ? (
                    <>
                      {/* Manual submission highlight */}
                      {selectedCoupon.extracted_data.submission_type === 'manual' && (
                        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
                          <p className="text-xs font-semibold text-orange-700 uppercase tracking-wide mb-3">
                            Identificação declarada pelo usuário
                          </p>
                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div className="col-span-2 bg-white rounded-lg p-3">
                              <span className="text-xs text-gray-500">Modelo do Óculos</span>
                              <p className="font-semibold text-gray-900 text-base mt-0.5">
                                {selectedCoupon.extracted_data.manual_model || 'Não informado'}
                              </p>
                            </div>
                            <div className="bg-white rounded-lg p-3">
                              <span className="text-xs text-gray-500">Quantidade</span>
                              <p className="font-semibold text-gray-900 text-base mt-0.5">
                                {selectedCoupon.extracted_data.manual_quantity ?? 'N/D'}
                              </p>
                            </div>
                            {selectedCoupon.extracted_data.receipt_number && (
                              <div className="bg-white rounded-lg p-3">
                                <span className="text-xs text-gray-500">Nº Fiscal (IA)</span>
                                <p className="font-medium text-indigo-700 text-sm mt-0.5">
                                  {selectedCoupon.extracted_data.receipt_number}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* AI keyword match status */}
                      <div className={`p-4 rounded-lg ${
                        selectedCoupon.extracted_data.has_matching_products
                          ? 'bg-green-50 border border-green-200'
                          : 'bg-yellow-50 border border-yellow-200'
                      }`}>
                        <p className={`font-semibold text-sm ${
                          selectedCoupon.extracted_data.has_matching_products ? 'text-green-800' : 'text-yellow-800'
                        }`}>
                          {selectedCoupon.extracted_data.has_matching_products
                            ? 'IA identificou produtos correspondentes'
                            : 'IA não identificou produtos correspondentes'}
                        </p>
                        {selectedCoupon.extracted_data.matched_keywords?.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {selectedCoupon.extracted_data.matched_keywords.map((kw, i) => (
                              <span key={i} className="px-2 py-0.5 bg-green-200 text-green-800 text-xs rounded-full">{kw}</span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* AI extracted info grid (AI submissions only) */}
                      {selectedCoupon.extracted_data.submission_type !== 'manual' && (
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          {selectedCoupon.extracted_data.receipt_number && (
                            <div className="col-span-2 bg-indigo-50 rounded-lg p-3">
                              <span className="text-xs text-indigo-500">Nº Cupom Fiscal</span>
                              <p className="font-semibold text-indigo-800">{selectedCoupon.extracted_data.receipt_number}</p>
                            </div>
                          )}
                          <div className="bg-gray-50 rounded-lg p-3">
                            <span className="text-xs text-gray-500">Cliente</span>
                            <p className="font-medium">{selectedCoupon.extracted_data.customer_name || 'N/D'}</p>
                          </div>
                          <div className="bg-gray-50 rounded-lg p-3">
                            <span className="text-xs text-gray-500">Data</span>
                            <p className="font-medium">{selectedCoupon.extracted_data.date || 'N/D'}</p>
                          </div>
                          <div className="bg-gray-50 rounded-lg p-3">
                            <span className="text-xs text-gray-500">Loja</span>
                            <p className="font-medium">{selectedCoupon.extracted_data.store || 'N/D'}</p>
                          </div>
                          <div className="bg-gray-50 rounded-lg p-3">
                            <span className="text-xs text-gray-500">Total</span>
                            <p className="font-medium text-lg">
                              {selectedCoupon.extracted_data.total != null
                                ? `R$ ${selectedCoupon.extracted_data.total.toFixed(2)}`
                                : 'N/D'}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Products table */}
                      {selectedCoupon.extracted_data.items?.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold text-gray-700 mb-2">
                            Produtos da IA ({selectedCoupon.extracted_data.items.length})
                          </h4>
                          <div className="max-h-48 overflow-y-auto border rounded-lg">
                            <table className="w-full text-sm">
                              <thead className="bg-gray-50 sticky top-0">
                                <tr>
                                  <th className="text-left py-2 px-3 font-medium text-gray-600">Produto</th>
                                  <th className="text-center py-2 px-2 font-medium text-gray-600">Qtd</th>
                                  <th className="text-right py-2 px-3 font-medium text-gray-600">Preço</th>
                                </tr>
                              </thead>
                              <tbody>
                                {selectedCoupon.extracted_data.items.map((item, i) => (
                                  <tr key={i} className={`border-t ${item.matched_keyword ? 'bg-green-50' : ''}`}>
                                    <td className="py-2 px-3">
                                      {item.name}
                                      {item.matched_keyword && (
                                        <span className="ml-2 px-1.5 py-0.5 bg-green-200 text-green-800 text-xs rounded">
                                          {item.matched_keyword}
                                        </span>
                                      )}
                                    </td>
                                    <td className="text-center py-2 px-2">{item.quantity ?? '-'}</td>
                                    <td className="text-right py-2 px-3">
                                      {item.price != null ? `R$ ${item.price.toFixed(2)}` : '-'}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="text-gray-500 text-sm">Nenhum dado extraído para este cupom.</p>
                  )}

                  {/* Rejection reason display (already-rejected coupons) */}
                  {selectedCoupon.status === 'rejected' && selectedCoupon.rejection_reason && (
                    <div className="bg-red-50 border border-red-100 rounded-xl p-3">
                      <span className="text-xs font-semibold text-red-500 uppercase tracking-wide">Motivo da rejeição</span>
                      <p className="text-sm text-red-700 mt-1">{selectedCoupon.rejection_reason}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Modal Footer — actions for pending coupons */}
              {selectedCoupon.status === 'pending' && (
                <div className="flex items-center justify-between p-6 border-t bg-gray-50">
                  <div className="flex items-center gap-3">
                    <label className="text-sm font-medium text-gray-700">Pontos a conceder:</label>
                    <input
                      type="number"
                      min={0}
                      value={reviewPoints}
                      onChange={(e) => setReviewPoints(parseInt(e.target.value) || 0)}
                      className="w-24 px-3 py-2 border rounded-lg text-center focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={handleOpenRejectModal}
                      disabled={reviewing}
                      className="px-6 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-300 text-white rounded-lg font-medium transition"
                    >
                      Rejeitar
                    </button>
                    <button
                      onClick={() => handleReview(selectedCoupon.id, 'approved')}
                      disabled={reviewing}
                      className="px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white rounded-lg font-medium transition"
                    >
                      {reviewing ? '...' : `Aprovar (+${reviewPoints} pts)`}
                    </button>
                  </div>
                </div>
              )}

              {/* Status display for non-pending */}
              {selectedCoupon.status !== 'pending' && (
                <div className="p-6 border-t bg-gray-50 text-center">
                  <span className={`px-4 py-2 rounded-full text-sm font-medium ${statusColors[selectedCoupon.status]}`}>
                    {statusLabels[selectedCoupon.status]}
                    {selectedCoupon.status === 'approved' && ` — ${selectedCoupon.points_awarded} pts concedidos`}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── REJECTION REASON MODAL (nested, z-[60] > modal z-50) ── */}
        {showRejectModal && selectedCoupon && (
          <div className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
              {/* Header */}
              <div className="flex justify-between items-center p-5 border-b">
                <div>
                  <h3 className="text-base font-bold text-gray-900">Motivo da Rejeição</h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Selecione um motivo — ele será enviado ao usuário por notificação
                  </p>
                </div>
                <button
                  onClick={handleCloseRejectModal}
                  className="p-2 hover:bg-gray-100 rounded-full transition"
                >
                  <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Reason list */}
              <div className="p-5 space-y-2 max-h-[50vh] overflow-y-auto">
                {REJECTION_REASONS.map((reason) => (
                  <button
                    key={reason}
                    onClick={() => setSelectedRejectionReason(reason)}
                    className={`w-full text-left px-4 py-3 rounded-lg border-2 text-sm transition font-medium ${
                      selectedRejectionReason === reason
                        ? 'border-red-500 bg-red-50 text-red-800'
                        : 'border-gray-100 bg-gray-50 hover:border-gray-200 text-gray-700'
                    }`}
                  >
                    {reason}
                  </button>
                ))}

                {/* Free-text for "Outro motivo" */}
                {selectedRejectionReason === 'Outro motivo' && (
                  <textarea
                    value={customRejectionReason}
                    onChange={(e) => setCustomRejectionReason(e.target.value)}
                    placeholder="Descreva o motivo da rejeição..."
                    autoFocus
                    className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-red-400 outline-none resize-none"
                    rows={3}
                  />
                )}
              </div>

              {/* Footer */}
              <div className="flex gap-3 p-5 border-t">
                <button
                  onClick={handleCloseRejectModal}
                  className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition font-medium"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirmReject}
                  disabled={!canConfirmReject || reviewing}
                  className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 disabled:bg-gray-300 text-white rounded-lg text-sm font-semibold transition"
                >
                  {reviewing ? 'Rejeitando…' : 'Confirmar Rejeição'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── COUPONS GRID ── */}
        {loading ? (
          <LoadingSpinner />
        ) : displayedCoupons.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
            <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="text-xl font-semibold text-gray-400 mb-2">
              Nenhum cupom {filter !== 'all' ? statusLabels[filter].toLowerCase() : ''}
            </h3>
            <p className="text-gray-400">
              {filter === 'pending' ? 'Todos os cupons foram revisados' : 'Nenhum cupom encontrado com este filtro'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayedCoupons.map((coupon) => (
              <div
                key={coupon.id}
                onClick={() => setSelectedCoupon(coupon)}
                className="bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition cursor-pointer overflow-hidden"
              >
                <div className="relative h-40 bg-gray-100 overflow-hidden">
                  <Image
                    src={coupon.image_url}
                    alt="Cupom"
                    fill
                    sizes="(max-width: 1024px) 100vw, 33vw"
                    className="object-cover"
                  />
                  {/* Submission type badge on image */}
                  <span className={`absolute top-2 left-2 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                    coupon.extracted_data?.submission_type === 'manual'
                      ? 'bg-orange-100 text-orange-700'
                      : 'bg-blue-100 text-blue-700'
                  }`}>
                    {coupon.extracted_data?.submission_type === 'manual' ? 'Manual' : 'IA'}
                  </span>
                </div>
                <div className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 truncate">{coupon.profiles?.full_name || 'Usuário desconhecido'}</p>
                      <p className="text-sm text-gray-500 truncate">{coupon.campaigns?.title || 'Campanha desconhecida'}</p>
                    </div>
                    <span className={`flex-shrink-0 ml-2 px-2 py-1 text-xs font-medium rounded-full ${statusColors[coupon.status]}`}>
                      {statusLabels[coupon.status]}
                    </span>
                  </div>

                  {coupon.extracted_data && (
                    <div className="mt-2 pt-2 border-t border-gray-100 text-sm">
                      {coupon.extracted_data.submission_type === 'manual' ? (
                        <p className="text-gray-700 truncate">
                          <span className="font-medium">Modelo:</span> {coupon.extracted_data.manual_model || 'N/D'}
                          {coupon.extracted_data.manual_quantity && (
                            <span className="ml-2 text-gray-500">× {coupon.extracted_data.manual_quantity}</span>
                          )}
                        </p>
                      ) : (
                        <div className="flex justify-between">
                          <span className="text-gray-500">{coupon.extracted_data.items?.length || 0} itens</span>
                          <span className="font-medium text-gray-900">
                            {coupon.extracted_data.total != null ? `R$ ${coupon.extracted_data.total.toFixed(2)}` : ''}
                          </span>
                        </div>
                      )}
                      {coupon.extracted_data.has_matching_products ? (
                        <p className="text-xs text-green-600 font-medium mt-1">Produtos correspondentes</p>
                      ) : (
                        <p className="text-xs text-yellow-600 font-medium mt-1">Sem correspondência</p>
                      )}
                    </div>
                  )}

                  {/* Rejection reason snippet */}
                  {coupon.status === 'rejected' && coupon.rejection_reason && (
                    <p className="text-xs text-red-500 mt-1.5 truncate" title={coupon.rejection_reason}>
                      Motivo: {coupon.rejection_reason}
                    </p>
                  )}

                  <p className="text-xs text-gray-400 mt-2" suppressHydrationWarning>
                    {new Date(coupon.created_at).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}

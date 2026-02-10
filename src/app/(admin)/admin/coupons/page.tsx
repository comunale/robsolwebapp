'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/hooks/useAuth'
import type { CouponWithRelations, CouponStatus } from '@/types/coupon'

export default function AdminCouponsPage() {
  const { user, profile, loading: authLoading } = useAuth()
  const router = useRouter()

  const [coupons, setCoupons] = useState<CouponWithRelations[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<CouponStatus | 'all'>('pending')
  const [selectedCoupon, setSelectedCoupon] = useState<CouponWithRelations | null>(null)
  const [reviewPoints, setReviewPoints] = useState(10)
  const [reviewing, setReviewing] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!authLoading && (!user || profile?.role !== 'admin')) {
      router.push('/login')
    }
  }, [user, profile, authLoading, router])

  useEffect(() => {
    if (user && profile?.role === 'admin') fetchCoupons()
  }, [user, profile, filter])

  const fetchCoupons = async () => {
    setLoading(true)
    try {
      const params = filter !== 'all' ? `?status=${filter}` : ''
      const res = await fetch(`/api/coupons${params}`)
      if (!res.ok) throw new Error('Failed to fetch coupons')
      const data = await res.json()
      setCoupons(data.coupons || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleReview = async (couponId: string, status: 'approved' | 'rejected') => {
    setReviewing(true)
    setError('')

    try {
      const res = await fetch(`/api/coupons/${couponId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          points_awarded: status === 'approved' ? reviewPoints : 0,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to review coupon')
      }

      setSelectedCoupon(null)
      setReviewPoints(10)
      await fetchCoupons()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setReviewing(false)
    }
  }

  if (authLoading || (!user || profile?.role !== 'admin')) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    approved: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Link
            href="/admin"
            className="text-indigo-600 hover:text-indigo-800 text-sm font-medium mb-2 inline-block"
          >
            ← Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">
            Coupon Moderation
          </h1>
          <p className="text-gray-600 mt-1">
            Review, approve or reject user coupon submissions
          </p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6">
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
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>

        {/* Modal / Detail View */}
        {selectedCoupon && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto">
              {/* Modal Header */}
              <div className="flex justify-between items-center p-6 border-b">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    Review Coupon
                  </h2>
                  <p className="text-sm text-gray-500">
                    Submitted by{' '}
                    <span className="font-medium">
                      {selectedCoupon.profiles?.full_name || 'Unknown'}
                    </span>{' '}
                    — Campaign:{' '}
                    <span className="font-medium">
                      {selectedCoupon.campaigns?.title || 'Unknown'}
                    </span>
                  </p>
                </div>
                <button
                  onClick={() => setSelectedCoupon(null)}
                  className="p-2 hover:bg-gray-100 rounded-full transition"
                >
                  <svg
                    className="w-6 h-6 text-gray-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              {/* Modal Body — Side by side */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">
                {/* Left: Photo */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                    Receipt Photo
                  </h3>
                  <div className="rounded-lg border overflow-hidden bg-gray-100">
                    <img
                      src={selectedCoupon.image_url}
                      alt="Receipt"
                      className="w-full object-contain max-h-[500px]"
                    />
                  </div>
                </div>

                {/* Right: AI Extracted Data */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                    AI Extracted Data
                  </h3>

                  {selectedCoupon.extracted_data ? (
                    <>
                      {/* Match status */}
                      <div
                        className={`p-4 rounded-lg ${
                          selectedCoupon.extracted_data.has_matching_products
                            ? 'bg-green-50 border border-green-200'
                            : 'bg-yellow-50 border border-yellow-200'
                        }`}
                      >
                        <p
                          className={`font-semibold ${
                            selectedCoupon.extracted_data.has_matching_products
                              ? 'text-green-800'
                              : 'text-yellow-800'
                          }`}
                        >
                          {selectedCoupon.extracted_data.has_matching_products
                            ? '✓ Matching products found'
                            : '⚠ No matching products'}
                        </p>
                        {selectedCoupon.extracted_data.matched_keywords
                          ?.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {selectedCoupon.extracted_data.matched_keywords.map(
                              (kw, i) => (
                                <span
                                  key={i}
                                  className="px-2 py-0.5 bg-green-200 text-green-800 text-xs rounded-full"
                                >
                                  {kw}
                                </span>
                              )
                            )}
                          </div>
                        )}
                      </div>

                      {/* Info Grid */}
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="bg-gray-50 rounded-lg p-3">
                          <span className="text-gray-500">Customer</span>
                          <p className="font-medium">
                            {selectedCoupon.extracted_data.customer_name ||
                              'N/A'}
                          </p>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-3">
                          <span className="text-gray-500">Date</span>
                          <p className="font-medium">
                            {selectedCoupon.extracted_data.date || 'N/A'}
                          </p>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-3">
                          <span className="text-gray-500">Store</span>
                          <p className="font-medium">
                            {selectedCoupon.extracted_data.store || 'N/A'}
                          </p>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-3">
                          <span className="text-gray-500">Total</span>
                          <p className="font-medium text-lg">
                            {selectedCoupon.extracted_data.total != null
                              ? `$${selectedCoupon.extracted_data.total.toFixed(2)}`
                              : 'N/A'}
                          </p>
                        </div>
                      </div>

                      {/* Items */}
                      <div>
                        <h4 className="text-sm font-semibold text-gray-700 mb-2">
                          Products (
                          {selectedCoupon.extracted_data.items?.length || 0})
                        </h4>
                        <div className="max-h-48 overflow-y-auto border rounded-lg">
                          <table className="w-full text-sm">
                            <thead className="bg-gray-50 sticky top-0">
                              <tr>
                                <th className="text-left py-2 px-3 font-medium text-gray-600">
                                  Product
                                </th>
                                <th className="text-center py-2 px-2 font-medium text-gray-600">
                                  Qty
                                </th>
                                <th className="text-right py-2 px-3 font-medium text-gray-600">
                                  Price
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {selectedCoupon.extracted_data.items?.map(
                                (item, i) => (
                                  <tr
                                    key={i}
                                    className={`border-t ${
                                      item.matched_keyword
                                        ? 'bg-green-50'
                                        : ''
                                    }`}
                                  >
                                    <td className="py-2 px-3">
                                      {item.name}
                                      {item.matched_keyword && (
                                        <span className="ml-2 px-1.5 py-0.5 bg-green-200 text-green-800 text-xs rounded">
                                          ✓ {item.matched_keyword}
                                        </span>
                                      )}
                                    </td>
                                    <td className="text-center py-2 px-2">
                                      {item.quantity ?? '-'}
                                    </td>
                                    <td className="text-right py-2 px-3">
                                      {item.price != null
                                        ? `$${item.price.toFixed(2)}`
                                        : '-'}
                                    </td>
                                  </tr>
                                )
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </>
                  ) : (
                    <p className="text-gray-500">
                      No AI data extracted for this coupon.
                    </p>
                  )}
                </div>
              </div>

              {/* Modal Footer — Actions */}
              {selectedCoupon.status === 'pending' && (
                <div className="flex items-center justify-between p-6 border-t bg-gray-50">
                  <div className="flex items-center gap-3">
                    <label className="text-sm font-medium text-gray-700">
                      Points to Award:
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={reviewPoints}
                      onChange={(e) =>
                        setReviewPoints(parseInt(e.target.value) || 0)
                      }
                      className="w-24 px-3 py-2 border rounded-lg text-center focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() =>
                        handleReview(selectedCoupon.id, 'rejected')
                      }
                      disabled={reviewing}
                      className="px-6 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-300 text-white rounded-lg font-medium transition"
                    >
                      {reviewing ? '...' : 'Reject'}
                    </button>
                    <button
                      onClick={() =>
                        handleReview(selectedCoupon.id, 'approved')
                      }
                      disabled={reviewing}
                      className="px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white rounded-lg font-medium transition"
                    >
                      {reviewing
                        ? '...'
                        : `Approve (+${reviewPoints} pts)`}
                    </button>
                  </div>
                </div>
              )}

              {selectedCoupon.status !== 'pending' && (
                <div className="p-6 border-t bg-gray-50 text-center">
                  <span
                    className={`px-4 py-2 rounded-full text-sm font-medium ${statusColors[selectedCoupon.status]}`}
                  >
                    Already {selectedCoupon.status}
                    {selectedCoupon.status === 'approved' &&
                      ` — ${selectedCoupon.points_awarded} pts awarded`}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Coupons List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : coupons.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <svg
              className="w-16 h-16 text-gray-300 mx-auto mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <h3 className="text-xl font-semibold text-gray-400 mb-2">
              No {filter !== 'all' ? filter : ''} coupons
            </h3>
            <p className="text-gray-400">
              {filter === 'pending'
                ? 'All coupons have been reviewed'
                : 'No coupons found with this filter'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {coupons.map((coupon) => (
              <div
                key={coupon.id}
                onClick={() => setSelectedCoupon(coupon)}
                className="bg-white rounded-lg shadow hover:shadow-lg transition cursor-pointer overflow-hidden"
              >
                {/* Image Thumbnail */}
                <div className="h-40 bg-gray-100 overflow-hidden">
                  <img
                    src={coupon.image_url}
                    alt="Receipt"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-semibold text-gray-900">
                        {coupon.profiles?.full_name || 'Unknown User'}
                      </p>
                      <p className="text-sm text-gray-500">
                        {coupon.campaigns?.title || 'Unknown Campaign'}
                      </p>
                    </div>
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors[coupon.status]}`}
                    >
                      {coupon.status}
                    </span>
                  </div>

                  {/* Quick AI summary */}
                  {coupon.extracted_data && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">
                          {coupon.extracted_data.items?.length || 0} items
                        </span>
                        <span className="font-medium text-gray-900">
                          {coupon.extracted_data.total != null
                            ? `$${coupon.extracted_data.total.toFixed(2)}`
                            : ''}
                        </span>
                      </div>
                      {coupon.extracted_data.has_matching_products ? (
                        <p className="text-xs text-green-600 font-medium mt-1">
                          ✓ Has matching products
                        </p>
                      ) : (
                        <p className="text-xs text-yellow-600 font-medium mt-1">
                          ⚠ No keyword matches
                        </p>
                      )}
                    </div>
                  )}

                  <p className="text-xs text-gray-400 mt-2">
                    {new Date(coupon.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

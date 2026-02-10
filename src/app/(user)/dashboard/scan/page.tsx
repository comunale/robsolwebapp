'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/hooks/useAuth'
import { createClient } from '@/lib/supabase/client'
import { scanCouponImage } from '@/app/actions/scanCoupon'
import { uploadCouponImage } from '@/lib/storage/imageStorage'
import type { Campaign } from '@/types/campaign'
import type { ExtractedData } from '@/types/coupon'

export default function ScanPage() {
  const { user, profile, loading: authLoading } = useAuth()
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  // State
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [scanning, setScanning] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    if (!authLoading && !user) router.push('/login')
  }, [user, authLoading, router])

  // Fetch active campaigns
  useEffect(() => {
    const fetchCampaigns = async () => {
      const res = await fetch('/api/campaigns')
      if (res.ok) {
        const data = await res.json()
        const active = (data.campaigns || []).filter(
          (c: Campaign) =>
            c.is_active && new Date(c.end_date) >= new Date()
        )
        setCampaigns(active)
      }
    }
    if (user) fetchCampaigns()
  }, [user])

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('Image size must be less than 10MB')
      return
    }

    setImageFile(file)
    setExtractedData(null)
    setError('')
    setSuccess('')

    const reader = new FileReader()
    reader.onloadend = () => setImagePreview(reader.result as string)
    reader.readAsDataURL(file)
  }

  const handleScan = async () => {
    if (!imageFile || !selectedCampaign) {
      setError('Please select a campaign and upload an image first')
      return
    }

    setScanning(true)
    setError('')

    try {
      // Convert file to base64
      const buffer = await imageFile.arrayBuffer()
      const base64 = btoa(
        new Uint8Array(buffer).reduce(
          (data, byte) => data + String.fromCharCode(byte),
          ''
        )
      )

      const result = await scanCouponImage(
        base64,
        imageFile.type,
        selectedCampaign.keywords || []
      )

      if (!result.success || !result.data) {
        throw new Error(result.error || 'Scan failed')
      }

      setExtractedData(result.data)
    } catch (err: any) {
      setError(err.message || 'Failed to scan image')
    } finally {
      setScanning(false)
    }
  }

  const handleSubmit = async () => {
    if (!imageFile || !selectedCampaign || !extractedData || !user) return

    setSubmitting(true)
    setError('')

    try {
      // Upload image to Supabase Storage
      const imageUrl = await uploadCouponImage(
        imageFile,
        user.id,
        selectedCampaign.id
      )

      // Create coupon record
      const res = await fetch('/api/coupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaign_id: selectedCampaign.id,
          image_url: imageUrl,
          extracted_data: extractedData,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to submit coupon')
      }

      setSuccess('Coupon submitted successfully! It is now pending review.')
      setImageFile(null)
      setImagePreview(null)
      setExtractedData(null)
      setSelectedCampaign(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    } catch (err: any) {
      setError(err.message || 'Failed to submit coupon')
    } finally {
      setSubmitting(false)
    }
  }

  const resetForm = () => {
    setImageFile(null)
    setImagePreview(null)
    setExtractedData(null)
    setError('')
    setSuccess('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Link
            href="/dashboard"
            className="text-blue-600 hover:text-blue-800 text-sm font-medium mb-2 inline-block"
          >
            ← Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Scan Coupon</h1>
          <p className="text-gray-600 mt-1">
            Upload your receipt and our AI will extract the data automatically
          </p>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-6 py-4 rounded-lg mb-6 flex items-center justify-between">
            <span>{success}</span>
            <button
              onClick={() => setSuccess('')}
              className="text-green-800 font-medium"
            >
              Dismiss
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column — Upload */}
          <div className="space-y-6">
            {/* Step 1: Select Campaign */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-1">
                Step 1: Select Campaign
              </h2>
              <p className="text-sm text-gray-500 mb-4">
                Choose the campaign this receipt belongs to
              </p>

              {campaigns.length === 0 ? (
                <p className="text-gray-500 text-sm">
                  No active campaigns available at the moment.
                </p>
              ) : (
                <div className="space-y-3">
                  {campaigns.map((campaign) => (
                    <button
                      key={campaign.id}
                      onClick={() => {
                        setSelectedCampaign(campaign)
                        setExtractedData(null)
                      }}
                      className={`w-full text-left p-4 rounded-lg border-2 transition ${
                        selectedCampaign?.id === campaign.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <p className="font-semibold text-gray-900">
                        {campaign.title}
                      </p>
                      {campaign.keywords?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {campaign.keywords.map((kw, i) => (
                            <span
                              key={i}
                              className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full"
                            >
                              {kw}
                            </span>
                          ))}
                        </div>
                      )}
                      <p className="text-xs text-gray-500 mt-2">
                        Ends {new Date(campaign.end_date).toLocaleDateString()}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Step 2: Upload Image */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-1">
                Step 2: Upload Receipt
              </h2>
              <p className="text-sm text-gray-500 mb-4">
                Take a photo or upload an image of your receipt
              </p>

              <label
                htmlFor="receipt-upload"
                className="flex flex-col items-center justify-center w-full h-64 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition overflow-hidden"
              >
                {imagePreview ? (
                  <img
                    src={imagePreview}
                    alt="Receipt preview"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <svg
                      className="w-12 h-12 mb-4 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                    <p className="mb-2 text-sm text-gray-500">
                      <span className="font-semibold">Click to upload</span> or
                      drag and drop
                    </p>
                    <p className="text-xs text-gray-500">
                      PNG, JPG up to 10MB
                    </p>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  id="receipt-upload"
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleImageChange}
                  className="hidden"
                />
              </label>

              {imagePreview && (
                <button
                  onClick={resetForm}
                  className="mt-3 text-sm text-red-600 hover:text-red-800"
                >
                  Remove image
                </button>
              )}
            </div>

            {/* Step 3: Scan */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Step 3: Scan & Submit
              </h2>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
                  {error}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={handleScan}
                  disabled={!selectedCampaign || !imageFile || scanning}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-medium py-3 px-6 rounded-lg transition"
                >
                  {scanning ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg
                        className="w-5 h-5 animate-spin"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                        />
                      </svg>
                      AI Scanning...
                    </span>
                  ) : (
                    'Scan with AI'
                  )}
                </button>

                {extractedData && (
                  <button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white font-medium py-3 px-6 rounded-lg transition"
                  >
                    {submitting ? 'Submitting...' : 'Submit for Review'}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Right Column — Extracted Data */}
          <div>
            {scanning && (
              <div className="bg-white rounded-lg shadow p-12 text-center">
                <div className="w-20 h-20 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  AI is analyzing your receipt...
                </h3>
                <p className="text-gray-500">
                  Extracting products, prices and matching with campaign
                  keywords
                </p>
              </div>
            )}

            {!scanning && !extractedData && (
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
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                  />
                </svg>
                <h3 className="text-lg font-semibold text-gray-400 mb-2">
                  Extracted Data
                </h3>
                <p className="text-gray-400 text-sm">
                  Select a campaign, upload a receipt, then click "Scan with AI"
                </p>
              </div>
            )}

            {!scanning && extractedData && (
              <div className="space-y-6">
                {/* Match Status */}
                <div
                  className={`rounded-lg shadow p-6 ${
                    extractedData.has_matching_products
                      ? 'bg-green-50 border-2 border-green-200'
                      : 'bg-yellow-50 border-2 border-yellow-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        extractedData.has_matching_products
                          ? 'bg-green-200'
                          : 'bg-yellow-200'
                      }`}
                    >
                      {extractedData.has_matching_products ? (
                        <svg
                          className="w-6 h-6 text-green-700"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      ) : (
                        <svg
                          className="w-6 h-6 text-yellow-700"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                      )}
                    </div>
                    <div>
                      <h3
                        className={`font-semibold ${
                          extractedData.has_matching_products
                            ? 'text-green-800'
                            : 'text-yellow-800'
                        }`}
                      >
                        {extractedData.has_matching_products
                          ? 'Matching products found!'
                          : 'No matching products found'}
                      </h3>
                      {extractedData.matched_keywords?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {extractedData.matched_keywords.map((kw, i) => (
                            <span
                              key={i}
                              className="px-2 py-0.5 bg-green-200 text-green-800 text-xs rounded-full"
                            >
                              {kw}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Receipt Info */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Receipt Info
                  </h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Customer</span>
                      <p className="font-medium text-gray-900">
                        {extractedData.customer_name || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-500">Date</span>
                      <p className="font-medium text-gray-900">
                        {extractedData.date || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-500">Store</span>
                      <p className="font-medium text-gray-900">
                        {extractedData.store || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-500">Total</span>
                      <p className="font-medium text-gray-900 text-lg">
                        {extractedData.total != null
                          ? `$${extractedData.total.toFixed(2)}`
                          : 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Items Table */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Products Found ({extractedData.items?.length || 0})
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-2 pr-4 text-gray-600 font-medium">
                            Product
                          </th>
                          <th className="text-center py-2 px-2 text-gray-600 font-medium">
                            Qty
                          </th>
                          <th className="text-right py-2 px-2 text-gray-600 font-medium">
                            Price
                          </th>
                          <th className="text-center py-2 pl-4 text-gray-600 font-medium">
                            Match
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {extractedData.items?.map((item, i) => (
                          <tr
                            key={i}
                            className={`border-b border-gray-100 ${
                              item.matched_keyword
                                ? 'bg-green-50'
                                : ''
                            }`}
                          >
                            <td className="py-2 pr-4">
                              <p className="font-medium text-gray-900">
                                {item.name}
                              </p>
                              {item.matched_keyword && (
                                <span className="text-xs text-green-600">
                                  Matched: {item.matched_keyword}
                                </span>
                              )}
                            </td>
                            <td className="text-center py-2 px-2 text-gray-700">
                              {item.quantity ?? '-'}
                            </td>
                            <td className="text-right py-2 px-2 text-gray-700">
                              {item.price != null
                                ? `$${item.price.toFixed(2)}`
                                : '-'}
                            </td>
                            <td className="text-center py-2 pl-4">
                              {item.matched_keyword ? (
                                <span className="inline-block w-6 h-6 bg-green-200 text-green-800 rounded-full leading-6 text-xs font-bold">
                                  ✓
                                </span>
                              ) : (
                                <span className="inline-block w-6 h-6 bg-gray-100 text-gray-400 rounded-full leading-6 text-xs">
                                  –
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

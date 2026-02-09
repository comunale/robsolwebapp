import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Admin Panel - Incentive Campaigns',
  description: 'Manage campaigns, users, and coupons',
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      {children}
    </div>
  )
}

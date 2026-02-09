import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Dashboard - Incentive Campaigns',
  description: 'Manage your campaigns and earn rewards',
}

export default function UserLayout({
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

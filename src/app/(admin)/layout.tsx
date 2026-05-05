import type { Metadata } from 'next'
import AdminSidebar from '@/components/admin/AdminSidebar'
import AdminGuard from '@/components/admin/AdminGuard'

export const metadata: Metadata = {
  title: 'Painel Admin - Campanhas de Incentivo',
  description: 'Gerencie campanhas, usuarios e cupons',
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gray-50 flex">
      <div className="w-64 flex-shrink-0" />
      <AdminSidebar />
      <div className="flex-1 min-w-0 flex flex-col overflow-x-hidden">
        <AdminGuard>{children}</AdminGuard>
      </div>
    </div>
  )
}

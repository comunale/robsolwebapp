import type { Metadata } from 'next'
import SidebarUsuario from '@/components/user/SidebarUsuario'

export const metadata: Metadata = {
  title: 'Painel - Robsol VIP',
  description: 'Participe de campanhas e ganhe premios',
}

export default function UserLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Desktop sidebar — hidden on mobile, shown on md+ */}
      <SidebarUsuario />

      {/* Content area — full width on mobile, offset by sidebar on desktop.
          Max-width 520 px centered keeps the PWA feel on wide screens. */}
      <div className="md:ml-64">
        <div className="max-w-[520px] mx-auto w-full">
          {children}
        </div>
      </div>
    </div>
  )
}

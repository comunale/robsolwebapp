import type { Metadata } from 'next'

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
    <div className="min-h-screen bg-gray-50 pb-20">
      {children}
    </div>
  )
}

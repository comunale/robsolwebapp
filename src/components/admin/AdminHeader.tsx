'use client'

import { useAuth } from '@/lib/hooks/useAuth'
import { useRouter } from 'next/navigation'

interface AdminHeaderProps {
  title: string
  subtitle?: string
  children?: React.ReactNode
}

export default function AdminHeader({ title, subtitle, children }: AdminHeaderProps) {
  const { profile, signOut } = useAuth()
  const router = useRouter()

  const handleSignOut = async () => {
    await signOut()
    router.push('/login')
  }

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-20">
      <div className="px-8 py-4 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          {subtitle && (
            <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>
          )}
        </div>
        <div className="flex items-center gap-4">
          {children}
          <span className="text-sm text-gray-600">
            {profile?.full_name}
          </span>
          <button
            onClick={handleSignOut}
            className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition"
          >
            Sair
          </button>
        </div>
      </div>
    </header>
  )
}

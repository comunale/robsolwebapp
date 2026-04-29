'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/hooks/useAuth'
import { useBrand } from '@/components/shared/BrandProvider'

function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPass, setShowPass] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const { signIn, profile } = useAuth()
  const brand = useBrand()
  const loginLogoW = Math.min(parseInt(brand.logo_login_width || '80', 10) || 80, 200)

  const redirectTo = searchParams.get('redirectTo') || null

  useEffect(() => {
    if (profile) {
      const destination = redirectTo || (profile.role === 'admin' ? '/admin' : '/dashboard')
      router.push(destination)
    }
  }, [profile, router, redirectTo])

  const handleSubmit = async (e: { preventDefault(): void }) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { error } = await signIn(email, password)
      if (error) throw error
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Falha ao fazer login')
      setLoading(false)
    }
  }

  return (
    <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl overflow-hidden">
      {/* Brand accent bar — colour driven by --brand-accent CSS var */}
      <div className="h-1 w-full brand-accent-bar" />

      <div className="p-8">
        {/* Logo area */}
        <div className="flex flex-col items-center mb-8">
          <div className="mb-4 flex justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={brand.logo_login_url || '/logo.png'}
              alt="Robsol VIP"
              style={{ width: `${loginLogoW}px`, height: 'auto', maxWidth: '200px' }}
              className="object-contain"
              onError={(e) => {
                const img = e.currentTarget as HTMLImageElement
                img.style.display = 'none'
                const fallback = img.nextElementSibling as HTMLElement | null
                if (fallback) fallback.style.display = 'flex'
              }}
            />
            {/* Fallback shown if logo fails to load */}
            <div
              className="hidden bg-gradient-to-br from-indigo-600 to-purple-700 rounded-2xl items-center justify-center shadow-lg flex-shrink-0"
              style={{ width: `${loginLogoW}px`, height: `${loginLogoW}px`, maxWidth: '200px', maxHeight: '200px' }}
              aria-hidden="true"
            >
              <span className="text-white font-black text-3xl">R</span>
            </div>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Bem-vindo de Volta</h1>
          <p className="text-sm text-gray-500 mt-1">Entre na sua conta VIP</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-[var(--brand-primary)] focus:border-transparent outline-none transition text-sm"
              placeholder="seu@email.com"
              autoComplete="email"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Senha
              </label>
              <Link
                href="/forgot-password"
                className="text-xs font-medium hover:underline"
                style={{ color: 'var(--brand-primary)' }}
              >
                Esqueci minha senha
              </Link>
            </div>
            <div className="relative">
              <input
                id="password"
                type={showPass ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 pr-11 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-[var(--brand-primary)] focus:border-transparent outline-none transition text-sm"
                placeholder="Sua senha"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
                tabIndex={-1}
              >
                {showPass ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full font-semibold py-3 px-4 rounded-xl transition duration-200 shadow-md hover:shadow-lg text-sm disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))', color: '#fff' }}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Entrando...
              </span>
            ) : 'Entrar'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500">
            Nao tem uma conta?{' '}
            <Link href="/register" className="text-indigo-600 hover:text-indigo-700 font-semibold">
              Cadastre-se
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="bg-white/95 rounded-2xl shadow-2xl p-8">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-gray-500 text-sm">Carregando...</p>
          </div>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  )
}

'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useBrand } from '@/components/shared/BrandProvider'

const RESET_REDIRECT = 'https://appbeneficios.robsol.com.br/auth/callback?next=/reset-password'

export default function ForgotPasswordPage() {
  const [email, setEmail]     = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent]       = useState(false)
  const [error, setError]     = useState('')
  const brand    = useBrand()
  const supabase = useMemo(() => createClient(), [])
  const logoW    = Math.min(parseInt(brand.logo_login_width || '80', 10) || 80, 200)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: RESET_REDIRECT,
      })
      if (error) throw error
      setSent(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao enviar email de recuperação')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl overflow-hidden">
      <div className="h-1 w-full brand-accent-bar" />

      <div className="p-8">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="mb-4 flex justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={brand.logo_login_url || '/logo.png'}
              alt="Robsol VIP"
              style={{ width: `${logoW}px`, height: 'auto', maxWidth: '200px' }}
              className="object-contain"
              onError={(e) => {
                const img = e.currentTarget as HTMLImageElement
                img.style.display = 'none'
                const fallback = img.nextElementSibling as HTMLElement | null
                if (fallback) fallback.style.display = 'flex'
              }}
            />
            <div
              className="hidden bg-gradient-to-br from-indigo-600 to-purple-700 rounded-2xl items-center justify-center shadow-lg flex-shrink-0"
              style={{ width: `${logoW}px`, height: `${logoW}px`, maxWidth: '200px', maxHeight: '200px' }}
              aria-hidden="true"
            >
              <span className="text-white font-black text-3xl">R</span>
            </div>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Recuperar Senha</h1>
          <p className="text-sm text-gray-500 mt-1 text-center">
            Informe seu email e enviaremos o link de recuperação
          </p>
        </div>

        {sent ? (
          <div className="text-center">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))' }}
            >
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-gray-900 font-semibold mb-2">Email enviado!</p>
            <p className="text-sm text-gray-500 mb-6">
              Verifique sua caixa de entrada em <strong>{email}</strong> e clique no link de recuperação.
            </p>
            <Link href="/login" className="text-sm font-semibold" style={{ color: 'var(--brand-primary)' }}>
              ← Voltar ao Login
            </Link>
          </div>
        ) : (
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
                  Enviando...
                </span>
              ) : 'Enviar Link de Recuperação'}
            </button>

            <div className="text-center">
              <Link
                href="/login"
                className="text-sm font-medium text-gray-500 hover:text-gray-700 transition"
              >
                ← Voltar ao Login
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

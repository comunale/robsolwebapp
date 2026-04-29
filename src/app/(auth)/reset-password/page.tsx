'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useBrand } from '@/components/shared/BrandProvider'

export default function ResetPasswordPage() {
  const [password, setPassword]           = useState('')
  const [confirm, setConfirm]             = useState('')
  const [showPass, setShowPass]           = useState(false)
  const [showConfirm, setShowConfirm]     = useState(false)
  const [loading, setLoading]             = useState(false)
  const [success, setSuccess]             = useState(false)
  const [error, setError]                 = useState('')
  const [sessionReady, setSessionReady]   = useState(false)
  const [linkInvalid, setLinkInvalid]     = useState(false)
  const sessionReadyRef                   = useRef(false)
  const brand    = useBrand()
  const supabase = useMemo(() => createClient(), [])
  const router   = useRouter()
  const logoW    = Math.min(parseInt(brand.logo_login_width || '80', 10) || 80, 200)

  useEffect(() => {
    // Listen for the PASSWORD_RECOVERY event that Supabase fires when the
    // user arrives via the reset-password email link.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        sessionReadyRef.current = true
        setSessionReady(true)
      }
    })

    // Race condition guard: if the client already established the session
    // before our listener was wired, getSession() will return it.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session && !sessionReadyRef.current) {
        sessionReadyRef.current = true
        setSessionReady(true)
      }
    })

    // After 6 s with no session, the link is likely invalid or expired.
    const timeout = setTimeout(() => {
      if (!sessionReadyRef.current) setLinkInvalid(true)
    }, 6_000)

    return () => {
      subscription.unsubscribe()
      clearTimeout(timeout)
    }
  }, [supabase])

  // Redirect to login 3 s after a successful update
  useEffect(() => {
    if (!success) return
    const t = setTimeout(() => router.push('/login'), 3_000)
    return () => clearTimeout(t)
  }, [success, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirm) {
      setError('As senhas não coincidem.')
      return
    }
    if (password.length < 6) {
      setError('A senha deve ter no mínimo 6 caracteres.')
      return
    }
    setError('')
    setLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
      setSuccess(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar senha')
    } finally {
      setLoading(false)
    }
  }

  const inputClass =
    'w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-[var(--brand-primary)] focus:border-transparent outline-none transition text-sm'

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
          <h1 className="text-2xl font-bold text-gray-900">Nova Senha</h1>
          <p className="text-sm text-gray-500 mt-1 text-center">
            Crie uma senha segura para sua conta
          </p>
        </div>

        {/* ── Success state ── */}
        {success && (
          <div className="text-center">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))' }}
            >
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-gray-900 font-semibold mb-2">Senha atualizada!</p>
            <p className="text-sm text-gray-500 mb-1">
              Você será redirecionado ao login em instantes…
            </p>
            <Link href="/login" className="text-sm font-semibold" style={{ color: 'var(--brand-primary)' }}>
              Ir ao Login agora →
            </Link>
          </div>
        )}

        {/* ── Invalid link state ── */}
        {!success && linkInvalid && (
          <div className="text-center">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 bg-red-100">
              <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
            </div>
            <p className="text-gray-900 font-semibold mb-2">Link inválido ou expirado</p>
            <p className="text-sm text-gray-500 mb-6">
              Solicite um novo link de recuperação de senha.
            </p>
            <Link
              href="/forgot-password"
              className="w-full inline-block text-center font-semibold py-3 px-4 rounded-xl transition duration-200 shadow-md text-sm"
              style={{ background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))', color: '#fff' }}
            >
              Solicitar novo link
            </Link>
            <div className="mt-4">
              <Link href="/login" className="text-sm font-medium text-gray-500 hover:text-gray-700 transition">
                ← Voltar ao Login
              </Link>
            </div>
          </div>
        )}

        {/* ── Loading state ── */}
        {!success && !linkInvalid && !sessionReady && (
          <div className="flex flex-col items-center py-4 gap-3">
            <svg className="w-8 h-8 animate-spin" style={{ color: 'var(--brand-primary)' }} fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <p className="text-sm text-gray-400">Verificando link de recuperação…</p>
          </div>
        )}

        {/* ── Reset form ── */}
        {!success && !linkInvalid && sessionReady && (
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Nova Senha */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
                Nova Senha
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPass ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={inputClass}
                  placeholder="Mínimo 6 caracteres"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
                  tabIndex={-1}
                  aria-label={showPass ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  {showPass ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Confirmar Senha */}
            <div>
              <label htmlFor="confirm" className="block text-sm font-medium text-gray-700 mb-1.5">
                Confirmar Senha
              </label>
              <div className="relative">
                <input
                  id="confirm"
                  type={showConfirm ? 'text' : 'password'}
                  required
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className={`${inputClass} ${confirm && password !== confirm ? 'border-red-300 focus:ring-red-400' : ''}`}
                  placeholder="Repita a nova senha"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
                  tabIndex={-1}
                  aria-label={showConfirm ? 'Ocultar confirmação' : 'Mostrar confirmação'}
                >
                  {showConfirm ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  )}
                </button>
              </div>
              {confirm && password !== confirm && (
                <p className="mt-1.5 text-xs text-red-500">As senhas não coincidem</p>
              )}
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || (confirm.length > 0 && password !== confirm)}
              className="w-full font-semibold py-3 px-4 rounded-xl transition duration-200 shadow-md hover:shadow-lg text-sm disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))', color: '#fff' }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Salvando…
                </span>
              ) : 'Salvar Nova Senha'}
            </button>

            <div className="text-center">
              <Link href="/login" className="text-sm font-medium text-gray-500 hover:text-gray-700 transition">
                ← Voltar ao Login
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

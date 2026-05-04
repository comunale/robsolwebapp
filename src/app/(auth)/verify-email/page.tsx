'use client'

import { Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useBrand } from '@/components/shared/BrandProvider'

function VerifyEmailContent() {
  const brand = useBrand()
  const searchParams = useSearchParams()
  const email = searchParams.get('email')
  const loginLogoW = Math.min(parseInt(brand.logo_login_width || '80', 10) || 80, 200)

  return (
    <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl overflow-hidden">
      <div className="h-1 w-full brand-accent-bar" />

      <div className="p-8 text-center">
        <div className="mb-6 flex justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={brand.logo_login_url || '/logo.png'}
            alt="Robsol VIP"
            style={{ width: `${loginLogoW}px`, height: 'auto', maxWidth: '200px' }}
            className="object-contain"
            onError={(event) => {
              const img = event.currentTarget
              img.style.display = 'none'
              const fallback = img.nextElementSibling as HTMLElement | null
              if (fallback) fallback.style.display = 'flex'
            }}
          />
          <div
            className="hidden bg-gradient-to-br from-indigo-600 to-purple-700 rounded-2xl items-center justify-center shadow-lg flex-shrink-0"
            style={{ width: `${loginLogoW}px`, height: `${loginLogoW}px`, maxWidth: '200px', maxHeight: '200px' }}
            aria-hidden="true"
          >
            <span className="text-white font-black text-3xl">R</span>
          </div>
        </div>

        <div
          className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center mb-5 shadow-lg"
          style={{ background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))' }}
        >
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d="M21.75 7.5v9a2.25 2.25 0 01-2.25 2.25h-15A2.25 2.25 0 012.25 16.5v-9m19.5 0A2.25 2.25 0 0019.5 5.25h-15A2.25 2.25 0 002.25 7.5m19.5 0v.24a2.25 2.25 0 01-1.07 1.92l-7.5 4.62a2.25 2.25 0 01-2.36 0l-7.5-4.62a2.25 2.25 0 01-1.07-1.92V7.5" />
          </svg>
        </div>

        <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--brand-accent)' }}>
          Quase lá
        </p>
        <h1 className="text-2xl font-black text-gray-900 mb-3">Confirme seu e-mail</h1>
        <p className="text-sm leading-relaxed text-gray-600">
          Enviamos um link de confirmação para sua caixa de entrada.
          {email && (
            <>
              <br />
              <span className="font-semibold text-gray-900">{email}</span>
            </>
          )}
        </p>

        <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-left">
          <p className="text-sm font-semibold text-amber-900">Dica VIP</p>
          <p className="text-sm text-amber-800 mt-1">
            Se não encontrar a mensagem, confira também a pasta de spam ou promoções.
          </p>
        </div>

        <Link
          href="/login"
          className="mt-6 inline-flex w-full items-center justify-center rounded-xl px-4 py-3 text-base font-semibold shadow-md hover:shadow-lg transition"
          style={{ background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))', color: '#fff' }}
        >
          Ir para o login
        </Link>
      </div>
    </div>
  )
}

export default function VerifyEmailPage() {
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
      <VerifyEmailContent />
    </Suspense>
  )
}

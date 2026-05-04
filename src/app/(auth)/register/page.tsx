'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useBrand } from '@/components/shared/BrandProvider'
import type { Store } from '@/types/store'

const OTHER_STORE_VALUE = '__other_store__'
const EMAIL_REDIRECT_TO = 'https://appbeneficios.robsol.com.br/auth/callback'

function onlyDigits(value: string): string {
  return value.replace(/\D/g, '')
}

function formatCpf(value: string): string {
  const digits = onlyDigits(value).slice(0, 11)
  if (digits.length <= 3) return digits
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`
}

function formatWhatsApp(value: string): string {
  const digits = onlyDigits(value).slice(0, 11)
  if (digits.length <= 2) return digits.length ? `(${digits}` : ''
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
}

function isValidCpf(value: string): boolean {
  const cpf = onlyDigits(value)
  if (cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) return false

  const calcDigit = (base: string, factor: number) => {
    const total = base.split('').reduce((sum, digit) => sum + Number(digit) * factor--, 0)
    const remainder = (total * 10) % 11
    return remainder === 10 ? 0 : remainder
  }

  return calcDigit(cpf.slice(0, 9), 10) === Number(cpf[9]) &&
    calcDigit(cpf.slice(0, 10), 11) === Number(cpf[10])
}

interface StoreComboboxProps {
  stores: Store[]
  value: string
  onChange: (value: string) => void
}

function StoreCombobox({ stores, value, onChange }: StoreComboboxProps) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const selectedStore = stores.find((store) => store.id === value)
  const selectedLabel = value === OTHER_STORE_VALUE
    ? 'Minha loja não está na lista'
    : selectedStore?.name ?? ''

  const filteredStores = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    if (!normalizedQuery) return stores

    return stores.filter((store) => {
      const name = store.name.toLowerCase()
      const location = store.location?.toLowerCase() ?? ''
      return name.includes(normalizedQuery) || location.includes(normalizedQuery)
    })
  }, [query, stores])

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false)
        setQuery('')
      }
    }

    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [])

  function selectStore(nextValue: string) {
    onChange(nextValue)
    setOpen(false)
    setQuery('')
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-[var(--brand-primary)] focus:border-transparent outline-none transition text-base text-left flex items-center justify-between gap-3"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className={value ? 'text-gray-900 truncate' : 'text-gray-400'}>
          {value ? selectedLabel : 'Selecione sua loja...'}
        </span>
        <svg className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m19 9-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden">
          <div className="p-2 border-b border-gray-100">
            <input
              autoFocus
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar loja..."
              className="w-full px-3 py-2 text-base border border-gray-200 rounded-lg focus:ring-2 focus:ring-[var(--brand-primary)] focus:border-transparent outline-none"
            />
          </div>

          <ul className="max-h-56 overflow-y-auto py-1" role="listbox">
            {filteredStores.map((store) => (
              <li
                key={store.id}
                role="option"
                aria-selected={value === store.id}
                onClick={() => selectStore(store.id)}
                className="px-4 py-2.5 text-sm cursor-pointer hover:bg-gray-50 transition"
              >
                <span className="block font-semibold text-gray-900">{store.name}</span>
                {store.location && <span className="block text-xs text-gray-500 mt-0.5">{store.location}</span>}
              </li>
            ))}

            {filteredStores.length === 0 && (
              <li className="px-4 py-3 text-sm text-gray-500 text-center">Nenhuma loja encontrada</li>
            )}

            <li className="border-t border-gray-100 my-1" aria-hidden="true" />
            <li
              role="option"
              aria-selected={value === OTHER_STORE_VALUE}
              onClick={() => selectStore(OTHER_STORE_VALUE)}
              className="px-4 py-2.5 text-sm cursor-pointer hover:bg-gray-50 transition"
            >
              <span className="block font-semibold" style={{ color: 'var(--brand-primary)' }}>
                Minha loja não está na lista
              </span>
              <span className="block text-xs text-gray-500 mt-0.5">Solicite o cadastro da sua loja</span>
            </li>
          </ul>
        </div>
      )}
    </div>
  )
}

export default function RegisterPage() {
  const brand = useBrand()
  const supabase = useMemo(() => createClient(), [])
  const loginLogoW = Math.min(parseInt(brand.logo_login_width || '80', 10) || 80, 200)

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [cpf, setCpf] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [storeId, setStoreId] = useState('')
  const [requestedStoreName, setRequestedStoreName] = useState('')
  const [stores, setStores] = useState<Store[]>([])
  const [showPass, setShowPass] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let mounted = true

    supabase
      .from('stores')
      .select('*')
      .eq('is_active', true)
      .order('name', { ascending: true })
      .then(({ data, error: storesError }) => {
        if (!mounted) return
        if (storesError) {
          console.error('Error loading stores:', storesError)
          return
        }
        setStores(data ?? [])
      })

    return () => {
      mounted = false
    }
  }, [supabase])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')

    const cleanWhatsapp = onlyDigits(whatsapp)
    const cleanCpf = onlyDigits(cpf)
    const isOtherStore = storeId === OTHER_STORE_VALUE

    if (!fullName.trim()) {
      setError('Informe seu nome completo')
      return
    }
    if (cleanWhatsapp.length < 10 || cleanWhatsapp.length > 11) {
      setError('Informe um número de WhatsApp válido com DDD')
      return
    }
    if (!isValidCpf(cleanCpf)) {
      setError('Informe um CPF válido')
      return
    }
    if (!storeId) {
      setError('Selecione sua loja para continuar')
      return
    }
    if (isOtherStore && !requestedStoreName.trim()) {
      setError('Informe o nome da sua loja')
      return
    }
    if (password !== confirmPassword) {
      setError('As senhas não coincidem')
      return
    }
    if (password.length < 6) {
      setError('A senha deve ter no mínimo 6 caracteres')
      return
    }

    setLoading(true)

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: EMAIL_REDIRECT_TO,
          data: {
            full_name: fullName.trim(),
            whatsapp: cleanWhatsapp,
            cpf: cleanCpf,
            store_id: isOtherStore ? null : storeId,
            requested_store_name: isOtherStore ? requestedStoreName.trim() : null,
          },
        },
      })

      if (authError) throw authError
      if (!authData.user) throw new Error('Falha ao criar usuário')

      window.location.href = `/verify-email?email=${encodeURIComponent(email.trim())}`
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : ''
      const lowerMessage = message.toLowerCase()

      if (lowerMessage.includes('cpf')) {
        setError('Este CPF já está cadastrado')
      } else if (lowerMessage.includes('whatsapp')) {
        setError('Este número de WhatsApp já está cadastrado')
      } else if (lowerMessage.includes('already registered') || lowerMessage.includes('email')) {
        setError('Este e-mail já está cadastrado')
      } else {
        setError(message || 'Falha ao criar conta. Tente novamente.')
      }
      setLoading(false)
    }
  }

  return (
    <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl overflow-hidden">
      <div className="h-1 w-full brand-accent-bar" />

      <div className="p-6 md:p-8">
        <div className="flex flex-col items-center mb-6">
          <div className="mb-4 flex justify-center">
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
          <h1 className="text-2xl font-bold text-gray-900">Criar conta</h1>
          <p className="text-sm text-gray-500 mt-1">Cadastre-se e comece a ganhar prêmios</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1.5">
              Nome completo <span className="text-red-500">*</span>
            </label>
            <input
              id="fullName"
              type="text"
              required
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-[var(--brand-primary)] focus:border-transparent outline-none transition text-base"
              placeholder="Seu nome completo"
              autoComplete="name"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-[var(--brand-primary)] focus:border-transparent outline-none transition text-base"
              placeholder="seu@email.com"
              autoComplete="email"
            />
          </div>

          <div>
            <label htmlFor="whatsapp" className="block text-sm font-medium text-gray-700 mb-1.5">
              WhatsApp <span className="text-red-500">*</span>
            </label>
            <input
              id="whatsapp"
              type="tel"
              required
              value={whatsapp}
              onChange={(event) => setWhatsapp(formatWhatsApp(event.target.value))}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-[var(--brand-primary)] focus:border-transparent outline-none transition text-base"
              placeholder="(11) 99999-9999"
              autoComplete="tel"
              inputMode="tel"
            />
          </div>

          <div>
            <label htmlFor="cpf" className="block text-sm font-medium text-gray-700 mb-1.5">
              CPF <span className="text-red-500">*</span>
            </label>
            <input
              id="cpf"
              type="text"
              required
              value={cpf}
              onChange={(event) => setCpf(formatCpf(event.target.value))}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-[var(--brand-primary)] focus:border-transparent outline-none transition text-base"
              placeholder="000.000.000-00"
              autoComplete="off"
              inputMode="numeric"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Sua loja <span className="text-red-500">*</span>
            </label>
            <StoreCombobox stores={stores} value={storeId} onChange={setStoreId} />
            <p className="text-xs text-gray-500 mt-1">Selecione a loja onde você trabalha</p>
          </div>

          {storeId === OTHER_STORE_VALUE && (
            <div>
              <label htmlFor="requestedStoreName" className="block text-sm font-medium text-gray-700 mb-1.5">
                Nome da loja <span className="text-red-500">*</span>
              </label>
              <input
                id="requestedStoreName"
                type="text"
                required
                value={requestedStoreName}
                onChange={(event) => setRequestedStoreName(event.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-[var(--brand-primary)] focus:border-transparent outline-none transition text-base"
                placeholder="Ex: Ótica Visão Clara"
              />
            </div>
          )}

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
              Senha <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPass ? 'text' : 'password'}
                required
                minLength={6}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full px-4 py-3 pr-11 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-[var(--brand-primary)] focus:border-transparent outline-none transition text-base"
                placeholder="Mínimo 6 caracteres"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPass((current) => !current)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
                aria-label={showPass ? 'Ocultar senha' : 'Mostrar senha'}
              >
                {showPass ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3l18 18M10.58 10.58A2 2 0 0012 14a2 2 0 001.42-.58M9.88 5.09A9.84 9.84 0 0112 4.86c4.48 0 8.27 2.94 9.54 7a10.02 10.02 0 01-3.01 4.44M6.1 6.1A10 10 0 002.46 11.86c1.27 4.06 5.06 7 9.54 7a9.9 9.9 0 004.23-.95" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.46 12c1.27-4.06 5.06-7 9.54-7s8.27 2.94 9.54 7c-1.27 4.06-5.06 7-9.54 7s-8.27-2.94-9.54-7z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1.5">
              Confirmar senha <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                id="confirmPassword"
                type={showConfirm ? 'text' : 'password'}
                required
                minLength={6}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="w-full px-4 py-3 pr-11 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-[var(--brand-primary)] focus:border-transparent outline-none transition text-base"
                placeholder="Repita a senha"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowConfirm((current) => !current)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
                aria-label={showConfirm ? 'Ocultar confirmação de senha' : 'Mostrar confirmação de senha'}
              >
                {showConfirm ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3l18 18M10.58 10.58A2 2 0 0012 14a2 2 0 001.42-.58M9.88 5.09A9.84 9.84 0 0112 4.86c4.48 0 8.27 2.94 9.54 7a10.02 10.02 0 01-3.01 4.44M6.1 6.1A10 10 0 002.46 11.86c1.27 4.06 5.06 7 9.54 7a9.9 9.9 0 004.23-.95" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.46 12c1.27-4.06 5.06-7 9.54-7s8.27 2.94 9.54 7c-1.27 4.06-5.06 7-9.54 7s-8.27-2.94-9.54-7z" />
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
            className="w-full font-semibold py-3 px-4 rounded-xl transition duration-200 shadow-md hover:shadow-lg text-base disabled:opacity-50 mt-2"
            style={{ background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))', color: '#fff' }}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.37 0 0 5.37 0 12h4z" />
                </svg>
                Criando conta...
              </span>
            ) : 'Criar conta'}
          </button>
        </form>

        <div className="mt-5 text-center">
          <p className="text-sm text-gray-500">
            Já tem uma conta?{' '}
            <Link href="/login" className="font-semibold hover:underline" style={{ color: 'var(--brand-primary)' }}>
              Entrar
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

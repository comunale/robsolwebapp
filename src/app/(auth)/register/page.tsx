'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { Store } from '@/types/store'

function formatWhatsApp(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11)
  if (digits.length <= 2) return digits.length ? `(${digits}` : ''
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
}

function extractDigits(value: string): string {
  return value.replace(/\D/g, '')
}

export default function RegisterPage() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [storeId, setStoreId] = useState('')
  const [stores, setStores] = useState<Store[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const fetchStores = async () => {
      const { data } = await supabase
        .from('stores')
        .select('*')
        .eq('is_active', true)
        .order('name')
      if (data) setStores(data)
    }
    fetchStores()
  }, [])

  const handleWhatsAppChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatWhatsApp(e.target.value)
    setWhatsapp(formatted)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const whatsappDigits = extractDigits(whatsapp)
    if (whatsappDigits.length < 10 || whatsappDigits.length > 11) {
      setError('Informe um numero de WhatsApp valido com DDD')
      return
    }

    if (password !== confirmPassword) {
      setError('As senhas nao coincidem')
      return
    }

    if (password.length < 6) {
      setError('A senha deve ter no minimo 6 caracteres')
      return
    }

    setLoading(true)

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            whatsapp: whatsappDigits,
            store_id: storeId || null,
          },
        },
      })

      if (authError) throw authError

      if (!authData.user) {
        throw new Error('Falha ao criar usuario')
      }

      if (authData.session) {
        router.push('/dashboard')
      } else {
        setError('Verifique seu email para confirmar sua conta antes de fazer login.')
        setTimeout(() => {
          router.push('/login')
        }, 3000)
      }
    } catch (err: any) {
      console.error('Registration error:', err)
      if (err.message?.includes('whatsapp')) {
        setError('Este numero de WhatsApp ja esta cadastrado')
      } else if (err.message?.includes('email')) {
        setError('Este email ja esta cadastrado')
      } else {
        setError(err.message || 'Falha ao criar conta')
      }
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-xl p-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Criar Conta</h1>
        <p className="text-gray-600">Cadastre-se para comecar a ganhar premios</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1">
            Nome Completo *
          </label>
          <input
            id="fullName"
            type="text"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition"
            placeholder="Seu nome completo"
          />
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            Email *
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition"
            placeholder="seu@email.com"
          />
        </div>

        <div>
          <label htmlFor="whatsapp" className="block text-sm font-medium text-gray-700 mb-1">
            WhatsApp *
          </label>
          <input
            id="whatsapp"
            type="tel"
            required
            value={whatsapp}
            onChange={handleWhatsAppChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition"
            placeholder="(11) 99999-9999"
          />
          <p className="text-xs text-gray-500 mt-1">Informe seu numero com DDD</p>
        </div>

        {stores.length > 0 && (
          <div>
            <label htmlFor="store" className="block text-sm font-medium text-gray-700 mb-1">
              Otica (Loja)
            </label>
            <select
              id="store"
              value={storeId}
              onChange={(e) => setStoreId(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition bg-white"
            >
              <option value="">Selecione sua loja...</option>
              {stores.map((store) => (
                <option key={store.id} value={store.id}>
                  {store.name} — {store.location || store.cnpj}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Vincule seu perfil a uma loja participante
            </p>
          </div>
        )}

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
            Senha *
          </label>
          <input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition"
            placeholder="Minimo 6 caracteres"
            minLength={6}
          />
        </div>

        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
            Confirmar Senha *
          </label>
          <input
            id="confirmPassword"
            type="password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition"
            placeholder="Repita a senha"
            minLength={6}
          />
        </div>

        {error && (
          <div className={`${
            error.includes('Verifique seu email') ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'
          } border px-4 py-3 rounded-lg text-sm`}>
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-medium py-2.5 px-4 rounded-lg transition duration-200"
        >
          {loading ? 'Criando conta...' : 'Cadastrar'}
        </button>
      </form>

      <div className="mt-6 text-center">
        <p className="text-gray-600">
          Ja tem uma conta?{' '}
          <Link href="/login" className="text-indigo-600 hover:text-indigo-700 font-medium">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  )
}

'use client'

import { useEffect, useState } from 'react'

// BeforeInstallPromptEvent is not in the standard TypeScript lib
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const SNOOZE_KEY = 'pwa_prompt_snoozed_until'
const SNOOZE_MS  = 14 * 24 * 60 * 60 * 1000  // 14 days

function isSnoozed(): boolean {
  try {
    const until = localStorage.getItem(SNOOZE_KEY)
    return !!until && Date.now() < parseInt(until, 10)
  } catch { return false }
}

function snooze() {
  try { localStorage.setItem(SNOOZE_KEY, String(Date.now() + SNOOZE_MS)) } catch { /**/ }
}

function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (navigator as any).standalone === true
  )
}

function detectPlatform(): 'ios' | 'android' | 'other' {
  const ua = navigator.userAgent
  const isIOS = /iphone|ipad|ipod/i.test(ua) && !(window as unknown as { MSStream?: unknown }).MSStream
  if (isIOS) return 'ios'
  if (/android/i.test(ua)) return 'android'
  return 'other'
}

// ── iOS step-by-step instructions ─────────────────────────────────────────────

function IOSSteps({ onDismiss }: { onDismiss: () => void }) {
  const steps = [
    {
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
        </svg>
      ),
      text: 'Toque em Compartilhar',
      sub: 'ícone na barra inferior do Safari',
    },
    {
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
      ),
      text: 'Adicionar à Tela de Início',
      sub: 'role para baixo na lista de ações',
    },
    {
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      text: 'Toque em "Adicionar"',
      sub: 'canto superior direito',
    },
  ]

  return (
    <>
      <p className="text-white/60 text-xs leading-relaxed mb-4">
        Instale o Robsol VIP para acesso direto — sem abrir o navegador.
      </p>

      <div className="space-y-2 mb-4">
        {steps.map((s, i) => (
          <div
            key={i}
            className="flex items-center gap-3 rounded-xl px-3 py-2.5"
            style={{ background: 'rgba(255,255,255,0.06)' }}
          >
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(255,196,0,0.12)', color: '#ffc400' }}
            >
              {s.icon}
            </div>
            <div className="min-w-0">
              <p className="text-white text-xs font-semibold leading-snug">{s.text}</p>
              <p className="text-white/40 text-xs">{s.sub}</p>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={onDismiss}
        className="w-full py-2 text-xs font-medium text-white/35 hover:text-white/60 transition"
      >
        Talvez mais tarde
      </button>
    </>
  )
}

// ── Android/Chrome install button ──────────────────────────────────────────────

function AndroidInstall({
  onInstall,
  onDismiss,
  installing,
}: {
  onInstall: () => void
  onDismiss: () => void
  installing: boolean
}) {
  return (
    <>
      <p className="text-white/60 text-xs leading-relaxed mb-4">
        Acesse com um toque — ícone na tela de início, sem barra de endereço e com
        notificações rápidas.
      </p>
      <div className="space-y-2">
        <button
          onClick={onInstall}
          disabled={installing}
          className="w-full py-3 rounded-2xl text-sm font-black transition active:scale-95 disabled:opacity-60"
          style={{
            background: 'linear-gradient(135deg,#ffc400,#ffe066)',
            color: '#0f0c29',
          }}
        >
          {installing ? 'Aguarde…' : 'Instalar Agora'}
        </button>
        <button
          onClick={onDismiss}
          className="w-full py-2 text-xs font-medium text-white/35 hover:text-white/60 transition"
        >
          Agora não
        </button>
      </div>
    </>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function PwaInstallPrompt() {
  const [platform, setPlatform] = useState<'ios' | 'android' | 'other'>('other')
  const [visible, setVisible]   = useState(false)
  const [success, setSuccess]   = useState(false)
  const [installing, setInstalling] = useState(false)
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)

  // Register service worker
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => { /* silent — SW is optional */ })
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return

    // Already installed as standalone — never show
    if (isStandalone()) return

    const p = detectPlatform()
    setPlatform(p)

    // Android/Chrome: capture the browser's deferred prompt
    const onBeforeInstall = (e: Event) => {
      e.preventDefault()
      const bip = e as BeforeInstallPromptEvent
      setDeferred(bip)
      if (!isSnoozed()) {
        setTimeout(() => setVisible(true), 4_000)
      }
    }

    if (p === 'android') {
      window.addEventListener('beforeinstallprompt', onBeforeInstall)
    }

    // iOS: no browser event — show manual instructions after delay
    if (p === 'ios') {
      const t = setTimeout(() => {
        if (!isStandalone() && !isSnoozed()) setVisible(true)
      }, 4_000)
      return () => {
        clearTimeout(t)
        window.removeEventListener('beforeinstallprompt', onBeforeInstall)
      }
    }

    return () => window.removeEventListener('beforeinstallprompt', onBeforeInstall)
  }, [])

  const handleInstall = async () => {
    if (!deferred) return
    setInstalling(true)
    deferred.prompt()
    const { outcome } = await deferred.userChoice
    setInstalling(false)
    setDeferred(null)
    if (outcome === 'accepted') {
      setSuccess(true)
      setTimeout(() => setVisible(false), 2_200)
    } else {
      snooze()
      setVisible(false)
    }
  }

  const handleDismiss = () => {
    snooze()
    setVisible(false)
  }

  if (!visible || platform === 'other') return null

  return (
    // Positioned above the mobile nav bar (which is ~60 px + safe-area)
    <div
      className="fixed left-0 right-0 z-[9998] px-3 flex justify-center"
      style={{ bottom: 'calc(72px + env(safe-area-inset-bottom, 0px))' }}
    >
      <div
        className="w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl"
        style={{
          background: 'linear-gradient(160deg,#1a1a2e 0%,#16213e 60%,#0f3460 100%)',
          border: '1px solid rgba(255,255,255,0.1)',
        }}
      >
        {/* Gold shimmer strip */}
        <div
          className="h-[3px] w-full"
          style={{ background: 'linear-gradient(90deg,#ffc400,#ffe066,#ffc400)' }}
        />

        <div className="px-5 py-4">
          {success ? (
            /* ── Success state ── */
            <div className="text-center py-2">
              <div
                className="w-14 h-14 mx-auto mb-3 rounded-2xl flex items-center justify-center shadow-lg"
                style={{ background: 'linear-gradient(135deg,#ffc400,#ffe066)' }}
              >
                <svg className="w-7 h-7" fill="none" stroke="#1a1a2e" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-white font-bold text-sm">Instalado com sucesso!</p>
              <p className="text-white/50 text-xs mt-1">Robsol VIP está na sua tela de início.</p>
            </div>
          ) : (
            <>
              {/* ── Card header ── */}
              <div className="flex items-center gap-3 mb-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/logo.png"
                  alt="Robsol VIP"
                  className="w-11 h-11 rounded-xl object-contain flex-shrink-0"
                  style={{ background: 'rgba(255,255,255,0.08)', padding: '4px' }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-white font-bold text-sm">Robsol VIP</p>
                  <p className="text-white/45 text-xs">Adicionar à Tela de Início</p>
                </div>
                <button
                  onClick={handleDismiss}
                  aria-label="Fechar"
                  className="w-7 h-7 rounded-full flex items-center justify-center text-white/35 hover:text-white hover:bg-white/10 transition flex-shrink-0"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* ── Platform-specific body ── */}
              {platform === 'ios' ? (
                <IOSSteps onDismiss={handleDismiss} />
              ) : (
                <AndroidInstall
                  onInstall={handleInstall}
                  onDismiss={handleDismiss}
                  installing={installing}
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

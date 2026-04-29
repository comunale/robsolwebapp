'use client'

import { useCallback, useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const SNOOZE_KEY = 'pwa_prompt_snoozed_until'
const SNOOZE_MS = 7 * 24 * 60 * 60 * 1000
const PWA_INSTALL_EVENT = 'robsol:pwa-install'
const PWA_SNOOZE_EVENT = 'robsol:pwa-snooze'

function isSnoozed(): boolean {
  try {
    const until = localStorage.getItem(SNOOZE_KEY)
    return !!until && Date.now() < parseInt(until, 10)
  } catch {
    return false
  }
}

function snooze() {
  try {
    localStorage.setItem(SNOOZE_KEY, String(Date.now() + SNOOZE_MS))
  } catch {
    /* no-op */
  }
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

function ShareIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} className="w-5 h-5" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v12m0-12 4 4m-4-4-4 4" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 10v8.25A2.75 2.75 0 0 0 7.75 21h8.5A2.75 2.75 0 0 0 19 18.25V10" />
    </svg>
  )
}

function IOSSteps({ onDismiss }: { onDismiss: () => void }) {
  const steps = [
    {
      icon: <ShareIcon />,
      text: 'Toque em Compartilhar',
      sub: 'Icone da seta para cima na barra inferior do Safari',
    },
    {
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
      ),
      text: 'Escolha Adicionar a Tela de Inicio',
      sub: 'Role a lista de acoes ate encontrar esta opcao',
    },
    {
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
        </svg>
      ),
      text: 'Toque em "Adicionar"',
      sub: 'Canto superior direito',
    },
  ]

  return (
    <>
      <p className="text-white/60 text-xs leading-relaxed mb-4">
        Instale o Robsol VIP para acesso direto, sem abrir o navegador.
      </p>

      <ol className="space-y-3 mb-4">
        {steps.map((s, i) => (
          <li
            key={s.text}
            className="grid grid-cols-[2rem_2.5rem_1fr] items-center gap-3 rounded-2xl px-3 py-3 border border-white/10"
            style={{ background: 'rgba(255,255,255,0.045)' }}
          >
            <span
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black"
              style={{ background: 'rgba(255,255,255,0.08)', color: '#ffc400' }}
            >
              {i + 1}
            </span>
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center"
              style={{ background: 'rgba(255,196,0,0.12)', color: '#ffc400' }}
            >
              {s.icon}
            </div>
            <div className="min-w-0">
              <p className="text-white text-xs font-semibold leading-snug">{s.text}</p>
              <p className="text-white/40 text-xs">{s.sub}</p>
            </div>
          </li>
        ))}
      </ol>

      <div className="flex flex-col items-center gap-1 mb-3 text-white/45">
        <span className="text-[10px] uppercase tracking-widest">Botao compartilhar do Safari</span>
        <svg className="w-7 h-7 pwa-share-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14m0 0 5-5m-5 5-5-5" />
        </svg>
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
        Acesse com um toque: icone na tela de inicio, sem barra de endereco e com
        notificacoes rapidas.
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
          {installing ? 'Aguarde...' : 'Instalar Agora'}
        </button>
        <button
          onClick={onDismiss}
          className="w-full py-2 text-xs font-medium text-white/35 hover:text-white/60 transition"
        >
          Agora nao
        </button>
      </div>
    </>
  )
}

export default function PwaInstallPrompt() {
  const pathname = usePathname()
  const [platform, setPlatform] = useState<'ios' | 'android' | 'other'>(() => {
    if (typeof window === 'undefined') return 'other'
    return detectPlatform()
  })
  const [visible, setVisible] = useState(false)
  const [success, setSuccess] = useState(false)
  const [installing, setInstalling] = useState(false)
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => { /* service worker is optional */ })
    }
  }, [])

  const showPrompt = useCallback((force = false) => {
    if (isStandalone()) return
    if (pathname === '/login') return
    const currentPlatform = detectPlatform()
    setPlatform(deferred ? 'android' : currentPlatform)
    setSuccess(false)
    if (force || !isSnoozed()) setVisible(true)
  }, [deferred, pathname])

  useEffect(() => {
    if (typeof window === 'undefined' || isStandalone() || pathname === '/login') return

    const initialPlatform = detectPlatform()

    const onBeforeInstall = (e: Event) => {
      e.preventDefault()
      setDeferred(e as BeforeInstallPromptEvent)
      setPlatform('android')
      if (!isSnoozed()) setTimeout(() => setVisible(true), 4_000)
    }

    const onManualInstallRequest = () => showPrompt(true)

    window.addEventListener('beforeinstallprompt', onBeforeInstall)
    window.addEventListener(PWA_INSTALL_EVENT, onManualInstallRequest)

    let timer: ReturnType<typeof setTimeout> | undefined
    if (initialPlatform === 'ios') {
      timer = setTimeout(() => showPrompt(false), 4_000)
    }

    return () => {
      if (timer) clearTimeout(timer)
      window.removeEventListener('beforeinstallprompt', onBeforeInstall)
      window.removeEventListener(PWA_INSTALL_EVENT, onManualInstallRequest)
    }
  }, [showPrompt, pathname])

  const handleInstall = async () => {
    if (!deferred) return
    setInstalling(true)
    await deferred.prompt()
    const { outcome } = await deferred.userChoice
    setInstalling(false)
    setDeferred(null)
    if (outcome === 'accepted') {
      setSuccess(true)
      setTimeout(() => setVisible(false), 2_200)
    } else {
      snooze()
      window.dispatchEvent(new Event(PWA_SNOOZE_EVENT))
      setVisible(false)
    }
  }

  const handleDismiss = () => {
    snooze()
    window.dispatchEvent(new Event(PWA_SNOOZE_EVENT))
    setVisible(false)
  }

  if (pathname === '/login' || !visible || platform === 'other') return null

  return (
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
        <div
          className="h-[3px] w-full"
          style={{ background: 'linear-gradient(90deg,#ffc400,#ffe066,#ffc400)' }}
        />

        <div className="px-5 py-4">
          {success ? (
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
              <p className="text-white/50 text-xs mt-1">Robsol VIP esta na sua tela de inicio.</p>
            </div>
          ) : (
            <>
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
                  <p className="text-white/45 text-xs">Adicionar a Tela de Inicio</p>
                </div>
                <button
                  onClick={handleDismiss}
                  aria-label="Fechar"
                  className="w-7 h-7 rounded-full flex items-center justify-center text-white/35 hover:text-white hover:bg-white/10 transition flex-shrink-0"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

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

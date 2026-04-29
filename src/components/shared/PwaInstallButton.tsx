'use client'

import { useEffect, useState } from 'react'

const SNOOZE_KEY = 'pwa_prompt_snoozed_until'
const PWA_INSTALL_EVENT = 'robsol:pwa-install'
const PWA_SNOOZE_EVENT = 'robsol:pwa-snooze'

function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (navigator as any).standalone === true
  )
}

function isPromptClosed(): boolean {
  try {
    const until = localStorage.getItem(SNOOZE_KEY)
    return !!until && Date.now() < parseInt(until, 10)
  } catch {
    return false
  }
}

export default function PwaInstallButton({
  variant = 'dark',
  className = '',
}: {
  variant?: 'dark' | 'light'
  className?: string
}) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const updateVisibility = () => {
      setVisible(!isStandalone() && isPromptClosed())
    }

    updateVisibility()
    window.addEventListener(PWA_SNOOZE_EVENT, updateVisibility)
    window.addEventListener('appinstalled', updateVisibility)
    window.addEventListener('storage', updateVisibility)

    return () => {
      window.removeEventListener(PWA_SNOOZE_EVENT, updateVisibility)
      window.removeEventListener('appinstalled', updateVisibility)
      window.removeEventListener('storage', updateVisibility)
    }
  }, [])

  if (!visible) return null

  const dark = variant === 'dark'

  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event(PWA_INSTALL_EVENT))}
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold transition ${className}`}
      style={dark
        ? { color: 'var(--brand-accent)', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }
        : { color: 'var(--brand-primary)', background: 'rgba(79,70,229,0.08)', border: '1px solid rgba(79,70,229,0.14)' }
      }
      aria-label="Instalar aplicativo"
      title="Instalar aplicativo"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v12m0-12 4 4m-4-4-4 4M5 14v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4" />
      </svg>
      <span className="hidden sm:inline">Instalar</span>
    </button>
  )
}

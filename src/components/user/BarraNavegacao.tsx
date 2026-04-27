'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const navItems = [
  {
    label: 'Início',
    href: '/dashboard',
    exact: true,
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    ),
  },
  {
    label: 'Campanhas',
    href: '/campanhas',
    exact: false,
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
    ),
  },
  // ── Central CTA — scan button ─────────────────────────────────────────────
  {
    label: 'Escanear',
    href: '/dashboard/scan',
    exact: false,
    cta: true,
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
    ),
  },
  {
    label: 'Prêmios',
    href: '/dashboard/premios',
    exact: false,
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
    ),
  },
  {
    label: 'Cupons',
    href: '/dashboard/meus-cupons',
    exact: false,
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    ),
  },
]

export default function BarraNavegacao() {
  const pathname = usePathname()

  const isActive = (href: string, exact: boolean) => {
    if (exact) return pathname === href
    return pathname.startsWith(href)
  }

  return (
    // md:hidden — desktop navigation is handled by SidebarUsuario
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 safe-area-bottom">
      <div className="flex justify-around items-end pb-2 pt-1">
        {navItems.map((item) => {
          const active = isActive(item.href, item.exact ?? false)

          // ── Central CTA button (Escanear) ─────────────────────────────────
          if ('cta' in item && item.cta) {
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-col items-center gap-0.5 -mt-5"
              >
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center shadow-lg border-[3px] border-white"
                  style={{
                    background: active
                      ? 'linear-gradient(135deg,var(--brand-primary),var(--brand-secondary))'
                      : 'linear-gradient(135deg,var(--brand-accent),var(--brand-accent-light))',
                  }}
                >
                  <svg className="w-6 h-6" fill="none" stroke="var(--brand-bg-from)" viewBox="0 0 24 24">
                    {item.icon}
                  </svg>
                </div>
                <span
                  className="text-[9px] font-bold"
                  style={{ color: active ? 'var(--brand-primary)' : '#6b7280' }}
                >
                  {item.label}
                </span>
              </Link>
            )
          }

          // ── Regular nav item ──────────────────────────────────────────────
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg transition ${
                active ? 'text-indigo-600' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {item.icon}
              </svg>
              <span className="text-[9px] font-medium">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

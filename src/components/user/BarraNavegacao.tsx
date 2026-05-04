'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const navItems = [
  {
    label: 'Início',
    href: '/dashboard',
    exact: true,
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0 7-7 7 7M5 10v10a1 1 0 0 0 1 1h3m10-11 2 2m-2-2v10a1 1 0 0 1-1 1h-3m-6 0a1 1 0 0 0 1-1v-4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v4a1 1 0 0 0 1 1m-6 0h6" />
    ),
  },
  {
    label: 'Campanhas',
    href: '/campanhas',
    exact: false,
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2m14 0V9a2 2 0 0 0-2-2M5 11V9a2 2 0 0 1 2-2m0 0V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v2M7 7h10" />
    ),
  },
  {
    label: 'Escanear',
    href: '/dashboard/scan',
    exact: false,
    cta: true,
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 9a2 2 0 0 1 2-2h.93a2 2 0 0 0 1.664-.89l.812-1.22A2 2 0 0 1 10.07 4h3.86a2 2 0 0 1 1.664.89l.812 1.22a2 2 0 0 0 1.664.89H19a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9z" />
    ),
  },
  {
    label: 'Sorteios',
    href: '/sorteios',
    exact: false,
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16.5 18.75h-9m9 0a3 3 0 0 1 3 3h-15a3 3 0 0 1 3-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871m-5.007 0h-.872c-.621 0-1.125.504-1.125 1.125v3.375m7.004-4.5a7.454 7.454 0 0 0 .982-3.172M9.497 14.25a7.454 7.454 0 0 1-.981-3.172M5.25 4.236V2.721A48.13 48.13 0 0 1 12 2.25c2.291 0 4.545.16 6.75.47v1.516" />
    ),
  },
  {
    label: 'Cupons',
    href: '/dashboard/meus-cupons',
    exact: false,
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5.586a1 1 0 0 1 .707.293l5.414 5.414a1 1 0 0 1 .293.707V19a2 2 0 0 1-2 2z" />
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
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 safe-area-bottom">
      <div className="flex justify-around items-end pb-2 pt-1">
        {navItems.map((item) => {
          const active = isActive(item.href, item.exact ?? false)

          if ('cta' in item && item.cta) {
            return (
              <Link key={item.href} href={item.href} className="flex flex-col items-center gap-0.5 -mt-5">
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
                <span className="text-[9px] font-bold" style={{ color: active ? 'var(--brand-primary)' : '#6b7280' }}>
                  {item.label}
                </span>
              </Link>
            )
          }

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

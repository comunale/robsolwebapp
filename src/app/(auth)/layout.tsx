import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Robsol VIP - Entrar',
  description: 'Entre ou cadastre-se para participar das campanhas de incentivo',
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="brand-auth-bg min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative ambient orbs — use CSS vars for brand consistency */}
      <div
        className="absolute top-1/4 -left-16 w-80 h-80 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, color-mix(in srgb, var(--brand-primary) 15%, transparent) 0%, transparent 70%)' }}
      />
      <div
        className="absolute bottom-1/4 -right-16 w-80 h-80 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, color-mix(in srgb, var(--brand-secondary) 15%, transparent) 0%, transparent 70%)' }}
      />
      <div
        className="absolute top-3/4 left-1/3 w-48 h-48 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, color-mix(in srgb, var(--brand-accent) 8%, transparent) 0%, transparent 70%)' }}
      />

      <div className="w-full max-w-md relative z-10">
        {children}
      </div>
    </div>
  )
}

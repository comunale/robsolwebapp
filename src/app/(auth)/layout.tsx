import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Robsol VIP - Entrar',
  description: 'Entre ou cadastre-se para participar das campanhas de incentivo',
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 40%, #4c1d95 80%, #2d1b69 100%)' }}
    >
      {/* Decorative ambient orbs */}
      <div
        className="absolute top-1/4 -left-16 w-80 h-80 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)' }}
      />
      <div
        className="absolute bottom-1/4 -right-16 w-80 h-80 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.15) 0%, transparent 70%)' }}
      />
      <div
        className="absolute top-3/4 left-1/3 w-48 h-48 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(212,175,55,0.08) 0%, transparent 70%)' }}
      />

      <div className="w-full max-w-md relative z-10">
        {children}
      </div>
    </div>
  )
}

'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { motion, useInView } from 'framer-motion'
import { useAuth } from '@/lib/hooks/useAuth'

// ─────────────────────────────────────────────────────────────────────────────
// LANDING PAGE DATA — edit all copy, features, and prizes here
// ─────────────────────────────────────────────────────────────────────────────
const LANDING_PAGE_DATA = {
  hero: {
    headline: 'Robsol: Onde suas vendas se tornam conquistas',
    subheadline:
      'Participe das campanhas, escaneie seus cupons e acumule pontos para conquistar prêmios exclusivos.',
    cta: 'Começar Agora — é grátis',
    lastPrize: {
      label: 'Último Prêmio Entregue',
      winner: 'Fernanda S.',
      prize: 'iPhone 15 Pro',
      points: '12.400 pts',
    },
  },

  steps: [
    {
      number: '01',
      title: 'Cadastre-se',
      description: 'Crie sua conta gratuita em menos de 1 minuto e acesse o painel VIP.',
      // Heroicons v2 — UserPlus
      icon: 'M18 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0ZM3 19.235v-.11a6.375 6.375 0 0 1 12.75 0v.109A12.318 12.318 0 0 1 9.374 21c-2.331 0-4.512-.645-6.374-1.766Z',
    },
    {
      number: '02',
      title: 'Escolha sua Campanha',
      description: 'Navegue pelas campanhas ativas das lojas parceiras e inscreva-se.',
      // Heroicons v2 — RectangleStack
      icon: 'M6.429 9.75 2.25 12l4.179 2.25m0-4.5 5.571 3 5.571-3m-11.142 0L2.25 7.5 12 2.25l9.75 5.25-4.179 2.25m0 0L21.75 12l-4.179 2.25m0 0 4.179 2.25L12 21.75 2.25 16.5l4.179-2.25m11.142 0-5.571 3-5.571-3',
    },
    {
      number: '03',
      title: 'Escaneie e Ganhe',
      description: 'Tire foto do cupom fiscal — nossa IA valida e credita seus pontos na hora.',
      // Heroicons v2 — QrCode
      icon: 'M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 3.75 9.375v-4.5ZM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 0 1-1.125-1.125v-4.5ZM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 13.5 9.375v-4.5ZM6.75 6.75h.75v.75h-.75v-.75ZM6.75 16.5h.75v.75h-.75v-.75ZM16.5 6.75h.75v.75h-.75v-.75ZM13.5 13.5h.75v.75h-.75v-.75ZM13.5 19.5h.75v.75h-.75v-.75ZM19.5 13.5h.75v.75h-.75v-.75ZM19.5 19.5h.75v.75h-.75v-.75ZM16.5 16.5h.75v.75h-.75v-.75Z',
    },
  ],

  features: [
    {
      icon: '⚡',
      title: 'Validação Instantânea por IA',
      description: 'Nossa inteligência artificial analisa e aprova seus cupons em segundos.',
    },
    {
      icon: '🏆',
      title: 'Ranking em Tempo Real',
      description: 'Acompanhe sua posição no ranking global e dispute os prêmios do topo.',
    },
    {
      icon: '🎯',
      title: 'Metas e Conquistas',
      description: 'Complete metas por campanha e desbloqueie bônus e números da sorte.',
    },
    {
      icon: '🔔',
      title: 'Notificações ao Vivo',
      description: 'Receba alertas instantâneos quando seus cupons forem aprovados ou recompensas liberadas.',
    },
  ],

  prizes: [
    {
      title: 'iPhone 15 Pro',
      subtitle: 'Tecnologia de ponta',
      points: '25.000 pts',
      // swap this path to your uploaded image in /public/prizes/
      image: '/prizes/iphone.png',
      color: 'from-slate-800 to-slate-600',
      badge: 'Top Prêmio',
    },
    {
      title: 'Final de Semana Surpresa',
      subtitle: 'Viagem + hospedagem para 2',
      points: '18.000 pts',
      image: '/prizes/weekend.png',
      color: 'from-indigo-700 to-purple-600',
      badge: 'Popular',
    },
    {
      title: 'Gift Card R$ 500',
      subtitle: 'Lojas parceiras selecionadas',
      points: '8.000 pts',
      image: '/prizes/giftcard.png',
      color: 'from-amber-600 to-yellow-500',
      badge: 'Mais Rápido',
    },
    {
      title: 'Smart TV 55"',
      subtitle: '4K QLED Ultra HD',
      points: '20.000 pts',
      image: '/prizes/tv.png',
      color: 'from-teal-700 to-cyan-600',
      badge: 'Novo',
    },
  ],

  footer: {
    description: 'A plataforma de fidelidade que transforma cada compra em uma conquista.',
    newsletter: { label: 'Fique por dentro das novidades', placeholder: 'Seu e-mail' },
    links: {
      Plataforma: [
        { label: 'Como Funciona', href: '#como-funciona' },
        { label: 'Prêmios', href: '#premios' },
        { label: 'Ranking', href: '#ranking' },
        { label: 'Entrar', href: '/login' },
      ],
      Suporte: [
        { label: 'Central de Ajuda', href: '#' },
        { label: 'Termos de Uso', href: '#' },
        { label: 'Privacidade', href: '#' },
        { label: 'Contato', href: '#' },
      ],
    },
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Animation helpers
// ─────────────────────────────────────────────────────────────────────────────
const EASE_OUT_EXPO = [0.22, 1, 0.36, 1] as [number, number, number, number]

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.55, ease: EASE_OUT_EXPO },
  }),
}

function FadeSection({ children, className = '', delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })
  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={inView ? 'visible' : 'hidden'}
      custom={delay}
      variants={fadeUp}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Top-5 ranking type
// ─────────────────────────────────────────────────────────────────────────────
interface RankUser { full_name: string; total_points: number }

const RANK_COLORS = [
  'text-yellow-400',  // 1st — gold
  'text-slate-300',   // 2nd — silver
  'text-amber-600',   // 3rd — bronze
  'text-indigo-300',
  'text-indigo-300',
]

const RANK_BADGES = ['🥇', '🥈', '🥉', '4º', '5º']

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────
export default function Home() {
  const { user, profile, loading } = useAuth()
  const router = useRouter()
  const [ranking, setRanking] = useState<RankUser[]>([])
  const [menuOpen, setMenuOpen] = useState(false)

  // Redirect logged-in users
  useEffect(() => {
    if (!loading && user && profile) {
      router.push(profile.role === 'admin' ? '/admin' : '/dashboard')
    }
  }, [user, profile, loading, router])

  // Fetch public ranking
  useEffect(() => {
    fetch('/api/landing/ranking')
      .then((r) => r.json())
      .then((d) => setRanking(d.ranking ?? []))
      .catch(() => {})
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#1e1b4b,#4c1d95)' }}>
        <div className="w-12 h-12 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (user) return null

  const { hero, steps, features, prizes, footer } = LANDING_PAGE_DATA

  return (
    <div className="min-h-screen text-white overflow-x-hidden" style={{ background: 'linear-gradient(160deg,#0f0c29 0%,#1e1b4b 35%,#312e81 65%,#4c1d95 100%)' }}>

      {/* ── AMBIENT ORBS ───────────────────────────────────────────────────── */}
      <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full opacity-20" style={{ background: 'radial-gradient(circle,#6366f1,transparent 70%)', filter: 'blur(60px)' }} />
        <div className="absolute top-1/3 -right-40 w-[500px] h-[500px] rounded-full opacity-15" style={{ background: 'radial-gradient(circle,#8b5cf6,transparent 70%)', filter: 'blur(60px)' }} />
        <div className="absolute bottom-20 left-1/4 w-[400px] h-[400px] rounded-full opacity-10" style={{ background: 'radial-gradient(circle,#d4af37,transparent 70%)', filter: 'blur(80px)' }} />
      </div>

      {/* ── STICKY NAV ─────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-white/10" style={{ backdropFilter: 'blur(20px)', background: 'rgba(15,12,41,0.7)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/logo.png"
              alt="Robsol VIP"
              width={120}
              height={32}
              className="h-8 w-auto object-contain"
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
              priority
            />
            <span className="font-black text-lg text-white tracking-tight hidden sm:inline">
              Robsol <span style={{ color: '#d4af37' }}>VIP</span>
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-white/70">
            <a href="#como-funciona" className="hover:text-white transition">Como Funciona</a>
            <a href="#recursos" className="hover:text-white transition">Recursos</a>
            <a href="#ranking" className="hover:text-white transition">Ranking</a>
            <a href="#premios" className="hover:text-white transition">Prêmios</a>
          </nav>

          {/* CTA buttons */}
          <div className="flex items-center gap-2">
            <Link href="/login" className="hidden sm:inline-flex items-center text-sm font-medium text-white/70 hover:text-white transition px-3 py-2">
              Entrar
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold text-white transition"
              style={{ background: 'linear-gradient(135deg,#d4af37,#f5c842)', color: '#1e1b4b' }}
            >
              Cadastre-se
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
              </svg>
            </Link>

            {/* Mobile hamburger */}
            <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden p-2 text-white/70 hover:text-white">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                {menuOpen
                  ? <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                  : <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <nav className="md:hidden border-t border-white/10 px-4 py-4 flex flex-col gap-3 text-sm font-medium" style={{ background: 'rgba(15,12,41,0.95)' }}>
            {[['#como-funciona', 'Como Funciona'], ['#recursos', 'Recursos'], ['#ranking', 'Ranking'], ['#premios', 'Prêmios']].map(([href, label]) => (
              <a key={href} href={href} onClick={() => setMenuOpen(false)} className="text-white/70 hover:text-white transition py-1">{label}</a>
            ))}
            <Link href="/login" onClick={() => setMenuOpen(false)} className="text-white/70 hover:text-white transition py-1">Entrar</Link>
          </nav>
        )}
      </header>

      {/* ── HERO ───────────────────────────────────────────────────────────── */}
      <section className="relative min-h-[92vh] flex flex-col items-center justify-center px-4 text-center pt-16 pb-24">

        {/* Floating last-prize badge */}
        <motion.div
          initial={{ opacity: 0, x: 60 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.8, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="absolute top-12 right-4 sm:right-12 z-10"
        >
          <div
            className="rounded-2xl px-4 py-3 text-left shadow-2xl border border-yellow-400/40"
            style={{ background: 'rgba(30,27,75,0.85)', backdropFilter: 'blur(16px)' }}
          >
            <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: '#d4af37' }}>
              {hero.lastPrize.label}
            </p>
            <p className="text-white font-bold text-sm">{hero.lastPrize.prize}</p>
            <p className="text-white/60 text-xs">{hero.lastPrize.winner} · {hero.lastPrize.points}</p>
          </div>
        </motion.div>

        {/* Badge pill */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <span
            className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full mb-8 border"
            style={{ color: '#d4af37', borderColor: 'rgba(212,175,55,0.4)', background: 'rgba(212,175,55,0.1)' }}
          >
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#d4af37' }} />
            Plataforma VIP de Fidelidade
          </span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black leading-tight max-w-4xl mx-auto mb-6"
        >
          {hero.headline.split('conquistas')[0]}
          <span style={{ background: 'linear-gradient(90deg,#d4af37,#f5c842)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            conquistas
          </span>
        </motion.h1>

        {/* Subheadline */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="text-white/60 text-lg sm:text-xl max-w-xl mx-auto mb-10"
        >
          {hero.subheadline}
        </motion.p>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.45, duration: 0.5 }}
          className="flex flex-col sm:flex-row items-center gap-3"
        >
          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl text-base font-black shadow-xl transition-transform hover:scale-105 active:scale-95"
            style={{ background: 'linear-gradient(135deg,#d4af37,#f5c842)', color: '#1e1b4b' }}
          >
            {hero.cta}
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
            </svg>
          </Link>
          <a
            href="#como-funciona"
            className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl text-sm font-semibold text-white/70 hover:text-white border border-white/20 hover:border-white/40 transition"
          >
            Como funciona
          </a>
        </motion.div>

        {/* Scroll caret */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
        >
          <div className="w-6 h-10 rounded-full border-2 border-white/20 flex items-start justify-center p-1.5">
            <motion.div
              animate={{ y: [0, 10, 0] }}
              transition={{ repeat: Infinity, duration: 1.6, ease: 'easeInOut' }}
              className="w-1 h-2 rounded-full bg-white/40"
            />
          </div>
        </motion.div>
      </section>

      {/* ── COMO FUNCIONA ──────────────────────────────────────────────────── */}
      <section id="como-funciona" className="py-24 px-4">
        <div className="max-w-6xl mx-auto">
          <FadeSection className="text-center mb-16">
            <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: '#d4af37' }}>Simples assim</p>
            <h2 className="text-3xl sm:text-4xl font-black text-white mb-4">Como Funciona</h2>
            <p className="text-white/50 max-w-md mx-auto">Em três passos você já está acumulando pontos e disputando prêmios incríveis.</p>
          </FadeSection>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {steps.map((step, i) => (
              <FadeSection key={step.number} delay={i} className="relative">
                {/* connector line (desktop) */}
                {i < steps.length - 1 && (
                  <div className="hidden md:block absolute top-10 left-full w-full h-px z-0" style={{ background: 'linear-gradient(90deg,rgba(212,175,55,0.4),transparent)' }} />
                )}
                <div
                  className="relative z-10 rounded-2xl p-7 h-full border border-white/10 hover:border-yellow-400/30 transition-colors"
                  style={{ background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(10px)' }}
                >
                  {/* Glow number */}
                  <span
                    className="inline-block text-5xl font-black mb-4 leading-none"
                    style={{ background: 'linear-gradient(135deg,#d4af37,#f5c842)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
                  >
                    {step.number}
                  </span>

                  {/* Icon */}
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                    style={{ background: 'rgba(212,175,55,0.12)', boxShadow: '0 0 20px rgba(212,175,55,0.2)' }}
                  >
                    <svg className="w-6 h-6" style={{ color: '#d4af37' }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d={step.icon} />
                    </svg>
                  </div>

                  <h3 className="text-lg font-bold text-white mb-2">{step.title}</h3>
                  <p className="text-white/50 text-sm leading-relaxed">{step.description}</p>
                </div>
              </FadeSection>
            ))}
          </div>
        </div>
      </section>

      {/* ── RECURSOS EXCLUSIVOS ────────────────────────────────────────────── */}
      <section id="recursos" className="py-24 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">

            {/* Left — Meu Painel preview card */}
            <FadeSection className="order-2 lg:order-1">
              <div
                className="rounded-3xl p-6 border border-white/10 shadow-2xl relative overflow-hidden"
                style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(20px)' }}
              >
                {/* Inner glow */}
                <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(circle at 30% 20%,rgba(212,175,55,0.08),transparent 60%)' }} />

                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <p className="text-xs text-white/40 uppercase tracking-widest mb-0.5">Meu Painel</p>
                    <p className="text-white font-bold text-lg">Bem-vindo(a), Lucas R.</p>
                  </div>
                  <div
                    className="w-11 h-11 rounded-full flex items-center justify-center text-lg font-black"
                    style={{ background: 'linear-gradient(135deg,#d4af37,#f5c842)', color: '#1e1b4b' }}
                  >
                    L
                  </div>
                </div>

                {/* Points */}
                <div
                  className="rounded-2xl p-5 mb-4"
                  style={{ background: 'linear-gradient(135deg,rgba(212,175,55,0.15),rgba(212,175,55,0.05))', border: '1px solid rgba(212,175,55,0.2)' }}
                >
                  <p className="text-xs text-white/50 mb-1">Pontuação Total</p>
                  <p className="text-4xl font-black" style={{ background: 'linear-gradient(90deg,#d4af37,#f5c842)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                    8.420 <span className="text-lg font-bold text-white/40">pts</span>
                  </p>
                </div>

                {/* Stats row */}
                <div className="grid grid-cols-3 gap-3 mb-4">
                  {[
                    { label: 'Cupons', value: '34', sub: 'enviados' },
                    { label: 'Aprovados', value: '28', sub: 'válidos' },
                    { label: 'Ranking', value: '#12', sub: 'global' },
                  ].map((s) => (
                    <div key={s.label} className="rounded-xl p-3 text-center" style={{ background: 'rgba(255,255,255,0.05)' }}>
                      <p className="text-white font-bold text-xl">{s.value}</p>
                      <p className="text-white/40 text-xs mt-0.5">{s.sub}</p>
                    </div>
                  ))}
                </div>

                {/* Progress bar */}
                <div>
                  <div className="flex justify-between text-xs text-white/40 mb-1.5">
                    <span>Próxima meta</span>
                    <span>8.420 / 10.000</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full"
                      style={{ width: '84%', background: 'linear-gradient(90deg,#d4af37,#f5c842)', boxShadow: '0 0 8px rgba(212,175,55,0.5)' }}
                    />
                  </div>
                </div>

                {/* Floating badge */}
                <div
                  className="absolute -bottom-3 -right-3 rounded-2xl px-4 py-2 text-xs font-bold shadow-xl border border-yellow-400/30"
                  style={{ background: 'rgba(30,27,75,0.95)', color: '#d4af37' }}
                >
                  🏆 Top 15 Ranking
                </div>
              </div>
            </FadeSection>

            {/* Right — feature list */}
            <div className="order-1 lg:order-2 space-y-4">
              <FadeSection>
                <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: '#d4af37' }}>Recursos Exclusivos</p>
                <h2 className="text-3xl sm:text-4xl font-black text-white mb-4 leading-tight">
                  Tudo que você precisa<br />para dominar o ranking
                </h2>
                <p className="text-white/50 mb-8">
                  Uma plataforma completa de fidelidade projetada para vendedores de alta performance.
                </p>
              </FadeSection>

              <div className="space-y-3">
                {features.map((f, i) => (
                  <FadeSection key={f.title} delay={i * 0.5}>
                    <div
                      className="flex items-start gap-4 rounded-2xl p-4 border border-white/10 hover:border-white/20 transition-colors"
                      style={{ background: 'rgba(255,255,255,0.04)' }}
                    >
                      <span className="text-2xl flex-shrink-0 mt-0.5">{f.icon}</span>
                      <div>
                        <p className="text-white font-semibold text-sm mb-0.5">{f.title}</p>
                        <p className="text-white/50 text-xs leading-relaxed">{f.description}</p>
                      </div>
                    </div>
                  </FadeSection>
                ))}
              </div>

              <FadeSection delay={4}>
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 mt-4 px-6 py-3 rounded-xl text-sm font-bold transition-transform hover:scale-105"
                  style={{ background: 'linear-gradient(135deg,#d4af37,#f5c842)', color: '#1e1b4b' }}
                >
                  Acessar meu painel
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                  </svg>
                </Link>
              </FadeSection>
            </div>
          </div>
        </div>
      </section>

      {/* ── RANKING ────────────────────────────────────────────────────────── */}
      <section id="ranking" className="py-24 px-4">
        <div className="max-w-3xl mx-auto">
          <FadeSection className="text-center mb-12">
            <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: '#d4af37' }}>Desempenho</p>
            <h2 className="text-3xl sm:text-4xl font-black text-white mb-4">Ranking de Performance</h2>
            <p className="text-white/50">Os campeões da semana. Você pode ser o próximo.</p>
          </FadeSection>

          <FadeSection>
            <div
              className="rounded-3xl overflow-hidden border border-white/10"
              style={{ background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(16px)' }}
            >
              {/* Table header */}
              <div className="grid grid-cols-12 px-6 py-3 text-xs font-bold uppercase tracking-widest text-white/30 border-b border-white/10">
                <span className="col-span-1">#</span>
                <span className="col-span-7">Participante</span>
                <span className="col-span-4 text-right">Pontos</span>
              </div>

              {ranking.length === 0 ? (
                // Skeleton while loading
                Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="grid grid-cols-12 px-6 py-4 border-b border-white/5 animate-pulse">
                    <div className="col-span-1"><div className="w-6 h-6 rounded-full bg-white/10" /></div>
                    <div className="col-span-7"><div className="h-4 w-32 rounded bg-white/10" /></div>
                    <div className="col-span-4 flex justify-end"><div className="h-4 w-16 rounded bg-white/10" /></div>
                  </div>
                ))
              ) : (
                ranking.map((user, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.08, duration: 0.4 }}
                    className={`grid grid-cols-12 items-center px-6 py-4 border-b border-white/5 last:border-0 ${i === 0 ? 'bg-yellow-400/5' : ''}`}
                  >
                    <span className={`col-span-1 text-xl font-black ${RANK_COLORS[i]}`}>
                      {RANK_BADGES[i]}
                    </span>
                    <div className="col-span-7 flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-black flex-shrink-0"
                        style={i === 0
                          ? { background: 'linear-gradient(135deg,#d4af37,#f5c842)', color: '#1e1b4b' }
                          : { background: 'rgba(255,255,255,0.1)', color: '#fff' }
                        }
                      >
                        {user.full_name?.[0]?.toUpperCase() ?? '?'}
                      </div>
                      <span className="text-white font-medium text-sm truncate">
                        {/* Show only first name + last initial for privacy */}
                        {(() => {
                          const parts = (user.full_name ?? '').split(' ')
                          return parts.length > 1
                            ? `${parts[0]} ${parts[parts.length - 1][0]}.`
                            : parts[0]
                        })()}
                      </span>
                    </div>
                    <div className="col-span-4 text-right">
                      <span
                        className="text-sm font-black"
                        style={i === 0 ? { color: '#d4af37' } : { color: 'rgba(255,255,255,0.7)' }}
                      >
                        {(user.total_points ?? 0).toLocaleString('pt-BR')}
                      </span>
                      <span className="text-white/30 text-xs ml-1">pts</span>
                    </div>
                  </motion.div>
                ))
              )}

              {/* Footer CTA */}
              <div className="px-6 py-4 text-center border-t border-white/10">
                <Link href="/login" className="text-sm font-semibold hover:underline" style={{ color: '#d4af37' }}>
                  Entrar e ver minha posição →
                </Link>
              </div>
            </div>
          </FadeSection>
        </div>
      </section>

      {/* ── PRÊMIOS ────────────────────────────────────────────────────────── */}
      <section id="premios" className="py-24 px-4">
        <div className="max-w-6xl mx-auto">
          <FadeSection className="text-center mb-14">
            <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: '#d4af37' }}>Recompensas</p>
            <h2 className="text-3xl sm:text-4xl font-black text-white mb-4">Prêmios em Destaque</h2>
            <p className="text-white/50 max-w-md mx-auto">Cada ponto acumulado é um passo para conquistar prêmios incríveis.</p>
          </FadeSection>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {prizes.map((prize, i) => (
              <FadeSection key={prize.title} delay={i * 0.5}>
                <div
                  className="rounded-2xl overflow-hidden border border-white/10 hover:border-yellow-400/30 transition-all hover:-translate-y-1 group cursor-default"
                  style={{ background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(10px)' }}
                >
                  {/* Image / gradient placeholder */}
                  <div className={`h-36 bg-gradient-to-br ${prize.color} relative flex items-center justify-center`}>
                    <Image
                      src={prize.image}
                      alt={prize.title}
                      fill
                      className="object-cover opacity-60 group-hover:opacity-80 transition-opacity"
                      onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
                    />
                    {/* Badge */}
                    <span
                      className="absolute top-3 left-3 text-xs font-bold px-2.5 py-1 rounded-full z-10"
                      style={{ background: 'rgba(212,175,55,0.9)', color: '#1e1b4b' }}
                    >
                      {prize.badge}
                    </span>
                  </div>

                  <div className="p-4">
                    <p className="text-white font-bold mb-0.5">{prize.title}</p>
                    <p className="text-white/40 text-xs mb-3">{prize.subtitle}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold px-2.5 py-1 rounded-full" style={{ background: 'rgba(212,175,55,0.12)', color: '#d4af37' }}>
                        {prize.points}
                      </span>
                      <Link href="/login" className="text-xs text-white/40 hover:text-white transition font-medium">
                        Quero este →
                      </Link>
                    </div>
                  </div>
                </div>
              </FadeSection>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA BANNER ───────────────────────────────────────────────── */}
      <section className="py-24 px-4">
        <div className="max-w-3xl mx-auto">
          <FadeSection>
            <div
              className="rounded-3xl p-10 text-center relative overflow-hidden border border-yellow-400/20"
              style={{ background: 'linear-gradient(135deg,rgba(212,175,55,0.12),rgba(99,102,241,0.12))', backdropFilter: 'blur(20px)' }}
            >
              <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(circle at 50% 0%,rgba(212,175,55,0.1),transparent 60%)' }} />
              <p className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: '#d4af37' }}>Comece hoje</p>
              <h2 className="text-3xl sm:text-4xl font-black text-white mb-4">
                Sua primeira conquista<br />começa agora
              </h2>
              <p className="text-white/50 mb-8 max-w-sm mx-auto">
                Junte-se a milhares de vendedores que já estão acumulando pontos e conquistando prêmios.
              </p>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 px-8 py-3.5 rounded-2xl text-base font-black shadow-xl transition-transform hover:scale-105"
                style={{ background: 'linear-gradient(135deg,#d4af37,#f5c842)', color: '#1e1b4b' }}
              >
                Cadastre-se Gratuitamente
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                </svg>
              </Link>
            </div>
          </FadeSection>
        </div>
      </section>

      {/* ── FOOTER ─────────────────────────────────────────────────────────── */}
      <footer className="border-t border-white/10 pt-16 pb-10 px-4" style={{ background: 'rgba(0,0,0,0.3)' }}>
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">

            {/* Brand column */}
            <div className="md:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <Image
                  src="/logo.png"
                  alt="Robsol VIP"
                  width={100}
                  height={28}
                  className="h-7 w-auto object-contain"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
                />
                <span className="font-black text-base text-white">
                  Robsol <span style={{ color: '#d4af37' }}>VIP</span>
                </span>
              </div>
              <p className="text-white/40 text-sm leading-relaxed max-w-xs mb-6">
                {footer.description}
              </p>

              {/* Newsletter */}
              <p className="text-xs font-semibold text-white/60 mb-2">{footer.newsletter.label}</p>
              <div className="flex gap-2">
                <input
                  type="email"
                  placeholder={footer.newsletter.placeholder}
                  className="flex-1 px-3 py-2 text-sm rounded-xl text-white placeholder-white/30 outline-none border border-white/15 focus:border-yellow-400/40 transition"
                  style={{ background: 'rgba(255,255,255,0.06)' }}
                />
                <button
                  className="px-4 py-2 rounded-xl text-sm font-bold transition hover:opacity-90"
                  style={{ background: 'linear-gradient(135deg,#d4af37,#f5c842)', color: '#1e1b4b' }}
                >
                  OK
                </button>
              </div>
            </div>

            {/* Link columns */}
            {Object.entries(footer.links).map(([section, links]) => (
              <div key={section}>
                <p className="text-xs font-bold uppercase tracking-widest text-white/30 mb-4">{section}</p>
                <ul className="space-y-2.5">
                  {links.map((link) => (
                    <li key={link.label}>
                      <a href={link.href} className="text-sm text-white/50 hover:text-white transition">
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Bottom bar */}
          <div className="border-t border-white/10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-white/30">
            <span>© {new Date().getFullYear()} Robsol VIP. Todos os direitos reservados.</span>
            <div className="flex items-center gap-4">
              <a href="#" className="hover:text-white/60 transition">Privacidade</a>
              <a href="#" className="hover:text-white/60 transition">Termos</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

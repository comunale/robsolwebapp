'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion, useInView } from 'framer-motion'
import { useAuth } from '@/lib/hooks/useAuth'
import { useBrand } from '@/components/shared/BrandProvider'
import PwaInstallButton from '@/components/shared/PwaInstallButton'

// ─────────────────────────────────────────────────────────────────────────────
// [gold]text[/gold] highlight renderer — uses brand accent gradient
// ─────────────────────────────────────────────────────────────────────────────
function GoldText({ text }: { text: string }) {
  const parts = text.split(/\[gold\](.*?)\[\/gold\]/g)
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <span
            key={i}
            style={{
              background: 'linear-gradient(90deg,var(--brand-accent),var(--brand-accent-light))',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            {part}
          </span>
        ) : (
          part
        )
      )}
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Static data that isn't CMS-managed (icons, prize images, platform links)
// ─────────────────────────────────────────────────────────────────────────────
const STEP_ICONS = [
  'M18 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0ZM3 19.235v-.11a6.375 6.375 0 0 1 12.75 0v.109A12.318 12.318 0 0 1 9.374 21c-2.331 0-4.512-.645-6.374-1.766Z',
  'M6.429 9.75 2.25 12l4.179 2.25m0-4.5 5.571 3 5.571-3m-11.142 0L2.25 7.5 12 2.25l9.75 5.25-4.179 2.25m0 0L21.75 12l-4.179 2.25m0 0 4.179 2.25L12 21.75 2.25 16.5l4.179-2.25m11.142 0-5.571 3-5.571-3',
  'M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 3.75 9.375v-4.5ZM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 0 1-1.125-1.125v-4.5ZM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 13.5 9.375v-4.5ZM6.75 6.75h.75v.75h-.75v-.75ZM16.5 6.75h.75v.75h-.75v-.75Z',
  'M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z',
  'M16.5 18.75h-9m9 0a3 3 0 0 1 3 3h-15a3 3 0 0 1 3-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 0 1-.982-3.172M9.497 14.25a7.454 7.454 0 0 0 .981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 0 0 7.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 0 0 2.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 0 1 2.916.52 6.003 6.003 0 0 1-5.395 4.972m0 0a6.726 6.726 0 0 1-2.749 1.35m0 0a6.772 6.772 0 0 1-3.044 0',
]

const FEATURE_ICONS = ['⚡', '🏆', '🎯', '🔔']

// Decorative per-slot gradient fallbacks for past prizes gallery
const PRIZE_COLORS = [
  'from-rose-800 to-pink-600',
  'from-indigo-700 to-purple-600',
  'from-amber-600 to-yellow-500',
  'from-teal-700 to-cyan-600',
]

const PLATFORM_LINKS = [
  { label: 'Como Funciona',    href: '#como-funciona' },
  { label: 'Prêmios Sorteados', href: '#premios' },
  { label: 'Ranking',          href: '#ranking' },
  { label: 'Entrar',           href: '/login' },
]

// ─────────────────────────────────────────────────────────────────────────────
// Animation helpers
// ─────────────────────────────────────────────────────────────────────────────
const EASE_OUT_EXPO = [0.22, 1, 0.36, 1] as [number, number, number, number]

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: EASE_OUT_EXPO },
  }),
}

function FadeSection({
  children,
  className = '',
  delay = 0,
}: {
  children: React.ReactNode
  className?: string
  delay?: number
}) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-60px' })
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
// Types
// ─────────────────────────────────────────────────────────────────────────────
interface RankUser { full_name: string; total_points: number }

const RANK_COLORS = ['text-yellow-400', 'text-slate-300', 'text-amber-600', 'text-indigo-300', 'text-indigo-300']
const RANK_BADGES = ['🥇', '🥈', '🥉', '4º', '5º']

// ─────────────────────────────────────────────────────────────────────────────
// Meu Painel Mockup — mirrors the real PainelUsuario layout
// ─────────────────────────────────────────────────────────────────────────────
function PainelMockup() {
  return (
    <div className="relative mx-auto" style={{ maxWidth: '360px' }}>
      {/* Outer glow */}
      <div className="absolute -inset-4 rounded-3xl pointer-events-none" style={{ background: 'radial-gradient(ellipse at 50% 50%,rgba(99,102,241,0.25),transparent 70%)' }} />

      {/* Phone shell */}
      <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-white/10" style={{ background: '#f3f4f6' }}>

        {/* ── App Header (mirrors CabecalhoUsuario) ── */}
        <div className="bg-white shadow-sm px-4 py-2.5 flex items-center justify-between border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            {/* Logo placeholder */}
            <div className="w-20 h-5 rounded bg-indigo-100 flex items-center justify-center">
              <span className="text-indigo-600 font-black text-xs">Robsol VIP</span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {/* Notification bell */}
            <div className="relative p-1.5 text-gray-500">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <span className="absolute top-0.5 right-0.5 w-2.5 h-2.5 bg-red-500 rounded-full flex items-center justify-center text-white font-bold" style={{ fontSize: '7px' }}>3</span>
            </div>
          </div>
        </div>

        {/* User greeting bar */}
        <div className="bg-white px-4 py-2 flex items-center justify-between border-b border-gray-100">
          <div>
            <p className="text-xs font-semibold text-gray-900">Olá, Lucas R.!</p>
            <p className="text-xs text-indigo-600 font-bold">8.420 pontos</p>
          </div>
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </div>

        {/* ── App body ── */}
        <div className="p-3 space-y-3">

          {/* Campaign card */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-gray-800">Campanha Verão 2025</p>
              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">Participando</span>
            </div>
            {/* Goal progress bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-gray-400">
                <span>Meta: 10 cupons</span>
                <span>7 / 10</span>
              </div>
              <div className="w-full h-1.5 bg-gray-100 rounded-full">
                <div className="h-full rounded-full bg-indigo-500" style={{ width: '70%' }} />
              </div>
            </div>
          </div>

          {/* ── Coupon stats (mirrors PainelUsuario grid) ── */}
          <div>
            <p className="text-xs font-semibold text-gray-600 mb-2 px-0.5">Meus Cupons</p>
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-2.5 text-center">
                <svg className="w-4 h-4 text-gray-400 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-base font-bold text-gray-800">34</p>
                <p className="text-xs text-gray-400">Enviados</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-2.5 text-center">
                <svg className="w-4 h-4 text-green-500 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-base font-bold text-green-700">28</p>
                <p className="text-xs text-gray-400">Válidos</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-2.5 text-center">
                <svg className="w-4 h-4 text-red-400 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-base font-bold text-red-600">4</p>
                <p className="text-xs text-gray-400">Recusados</p>
              </div>
            </div>
          </div>

          {/* ── Quick Actions (mirrors PainelUsuario 2x2 grid) ── */}
          <div>
            <p className="text-xs font-semibold text-gray-600 mb-2 px-0.5">Ações Rápidas</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Escanear Cupons', color: 'bg-indigo-100 text-indigo-600', icon: 'M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z M15 13a3 3 0 11-6 0 3 3 0 016 0z' },
                { label: 'Meus Cupons', color: 'bg-green-100 text-green-600', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
                { label: 'Ranking', color: 'bg-purple-100 text-purple-600', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
                { label: 'Nºs da Sorte', color: 'bg-amber-100 text-amber-600', icon: 'M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7' },
              ].map((a) => (
                <div key={a.label} className="bg-white rounded-xl p-2.5 border border-gray-100 shadow-sm flex items-center gap-2">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${a.color}`}>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d={a.icon} />
                    </svg>
                  </div>
                  <span className="text-xs font-medium text-gray-700 leading-tight">{a.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom nav bar (mirrors BarraNavegacao) */}
        <div className="bg-white border-t border-gray-100 px-4 py-2 flex justify-around items-center">
          {[
            { label: 'Início', active: true, icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
            { label: 'Escanear', active: false, icon: 'M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z M15 13a3 3 0 11-6 0 3 3 0 016 0z' },
            { label: 'Sorteios', active: false, icon: 'M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7' },
          ].map((tab) => (
            <div key={tab.label} className={`flex flex-col items-center gap-0.5 ${tab.active ? 'text-indigo-600' : 'text-gray-400'}`}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d={tab.icon} />
              </svg>
              <span style={{ fontSize: '9px' }} className="font-medium">{tab.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Floating rank badge */}
      <div
        className="absolute -top-4 -right-4 rounded-xl px-3 py-1.5 text-xs font-bold shadow-xl border border-yellow-400/30"
        style={{ background: 'rgba(30,27,75,0.95)', color: 'var(--brand-accent)' }}
      >
        🏆 #12 Ranking
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main page component
// ─────────────────────────────────────────────────────────────────────────────
export default function Home() {
  const { user, profile, loading } = useAuth()
  const brand = useBrand()
  const router = useRouter()
  const [ranking, setRanking] = useState<RankUser[]>([])
  const [menuOpen, setMenuOpen] = useState(false)
  const [siteSettings, setSiteSettings] = useState<Record<string, string>>({})
  const [scrolled, setScrolled] = useState(false)

  // Redirect logged-in users
  useEffect(() => {
    if (!loading && user && profile) {
      router.push(profile.role === 'admin' ? '/admin' : '/dashboard')
    }
  }, [user, profile, loading, router])

  // Scroll listener for nav glassmorphism
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Fetch public ranking + site settings in parallel
  useEffect(() => {
    Promise.all([
      fetch('/api/landing/ranking').then((r) => r.json()).catch(() => ({ ranking: [] })),
      fetch('/api/landing/settings').then((r) => r.json()).catch(() => ({ settings: {} })),
    ]).then(([rankData, settingsData]) => {
      setRanking(rankData.ranking ?? [])
      setSiteSettings(settingsData.settings ?? {})
    })
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center brand-page-bg">
        <div className="w-12 h-12 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (user) return null

  // CMS-driven copy from useBrand() (server-rendered via BrandProvider in layout)
  const hero = {
    headline:    brand.home_hero_title,
    subheadline: brand.home_hero_subtitle,
    cta:         brand.home_hero_cta,
  }

  const badge = {
    show:   brand.badge_show !== 'false',
    label:  brand.badge_label,
    winner: brand.badge_winner,
    prize:  brand.badge_prize,
    date:   brand.badge_date,
  }
  const steps = [
    { number: '01', title: brand.home_step_01_title, description: brand.home_step_01_desc, icon: STEP_ICONS[0] },
    { number: '02', title: brand.home_step_02_title, description: brand.home_step_02_desc, icon: STEP_ICONS[1] },
    { number: '03', title: brand.home_step_03_title, description: brand.home_step_03_desc, icon: STEP_ICONS[2] },
    { number: '04', title: brand.home_step_04_title, description: brand.home_step_04_desc, icon: STEP_ICONS[3] },
    { number: '05', title: brand.home_step_05_title, description: brand.home_step_05_desc, icon: STEP_ICONS[4] },
  ]
  const features = [
    { icon: FEATURE_ICONS[0], title: brand.home_feat_01_title, description: brand.home_feat_01_desc },
    { icon: FEATURE_ICONS[1], title: brand.home_feat_02_title, description: brand.home_feat_02_desc },
    { icon: FEATURE_ICONS[2], title: brand.home_feat_03_title, description: brand.home_feat_03_desc },
    { icon: FEATURE_ICONS[3], title: brand.home_feat_04_title, description: brand.home_feat_04_desc },
  ]
  const footer = { description: brand.home_footer_desc, platformLinks: PLATFORM_LINKS }
  const landingLogoW = Math.min(parseInt(brand.logo_landing_width || '120', 10) || 120, 300)

  const prizes = [
    { title: brand.prize_01_title, subtitle: brand.prize_01_subtitle, winner: brand.prize_01_winner, deliveredAt: brand.prize_01_date, color: PRIZE_COLORS[0], image: brand.prize_01_image_url },
    { title: brand.prize_02_title, subtitle: brand.prize_02_subtitle, winner: brand.prize_02_winner, deliveredAt: brand.prize_02_date, color: PRIZE_COLORS[1], image: brand.prize_02_image_url },
    { title: brand.prize_03_title, subtitle: brand.prize_03_subtitle, winner: brand.prize_03_winner, deliveredAt: brand.prize_03_date, color: PRIZE_COLORS[2], image: brand.prize_03_image_url },
    { title: brand.prize_04_title, subtitle: brand.prize_04_subtitle, winner: brand.prize_04_winner, deliveredAt: brand.prize_04_date, color: PRIZE_COLORS[3], image: brand.prize_04_image_url },
  ]

  // Support links — internal routes are canonical; WhatsApp and Contato from DB
  const contactHref = siteSettings.support_contact
  const showContact = !!contactHref && contactHref !== '#'
  const supportLinks = [
    { label: 'Central de Ajuda', href: '/ajuda' },
    { label: 'Termos de Uso', href: '/termos' },
    { label: 'Privacidade', href: '/privacidade' },
    ...(showContact ? [{ label: 'Contato', href: contactHref }] : []),
    {
      label: 'WhatsApp',
      href: siteSettings.support_whatsapp
        ? `https://wa.me/${siteSettings.support_whatsapp}`
        : '#',
    },
  ]

  // Social links — only shown when the admin sets a URL
  const socialLinks = [
    {
      key: 'instagram',
      href: siteSettings.social_instagram || '',
      label: 'Instagram',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4 h-4">
          <rect x="2" y="2" width="20" height="20" rx="5" />
          <circle cx="12" cy="12" r="4" />
          <circle cx="17.5" cy="6.5" r="0.75" fill="currentColor" strokeWidth={0} />
        </svg>
      ),
    },
    {
      key: 'facebook',
      href: siteSettings.social_facebook || '',
      label: 'Facebook',
      icon: (
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
      ),
    },
    {
      key: 'linkedin',
      href: siteSettings.social_linkedin || '',
      label: 'LinkedIn',
      icon: (
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
        </svg>
      ),
    },
    {
      key: 'whatsapp',
      href: siteSettings.social_whatsapp || '',
      label: 'WhatsApp',
      icon: (
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
        </svg>
      ),
    },
    {
      key: 'youtube',
      href: siteSettings.social_youtube || '',
      label: 'YouTube',
      icon: (
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
        </svg>
      ),
    },
  ].filter((s) => !!s.href)

  return (
    <div
      className="min-h-screen text-white overflow-x-hidden brand-page-bg"
    >
      {/* ── AMBIENT ORBS ─────────────────────────────────────────────────── */}
      <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle,var(--brand-primary),transparent 70%)', filter: 'blur(60px)' }} />
        <div className="absolute top-1/3 -right-40 w-[500px] h-[500px] rounded-full opacity-15"
          style={{ background: 'radial-gradient(circle,var(--brand-secondary),transparent 70%)', filter: 'blur(60px)' }} />
        <div className="absolute bottom-20 left-1/4 w-[400px] h-[400px] rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle,var(--brand-accent),transparent 70%)', filter: 'blur(80px)' }} />
      </div>

      {/* ── STICKY NAV ───────────────────────────────────────────────────── */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled || menuOpen ? 'border-b border-white/15 backdrop-blur-md' : 'border-b border-transparent'}`}
        style={{
          background: scrolled || menuOpen ? 'rgba(15,12,41,0.78)' : 'transparent',
          boxShadow: scrolled ? '0 4px 32px rgba(0,0,0,0.25)' : 'none',
          transition: 'background 0.3s ease, box-shadow 0.3s ease',
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={brand.logo_landing_url || brand.logo_login_url || '/logo.png'}
              alt="Robsol VIP"
              style={{ width: `${landingLogoW}px`, height: 'auto', maxWidth: '300px' }}
              className="object-contain"
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
            />
            {!(brand.logo_landing_url || brand.logo_login_url) && (
              <span className="font-black text-lg text-white tracking-tight hidden sm:inline">
                Robsol <span style={{ color: 'var(--brand-accent)' }}>VIP</span>
              </span>
            )}
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-white/70">
            <a href="#como-funciona" className="hover:text-white transition">Como Funciona</a>
            <a href="#recursos" className="hover:text-white transition">Recursos</a>
            <a href="#ranking" className="hover:text-white transition">Ranking</a>
            <a href="#premios" className="hover:text-white transition">Prêmios</a>
          </nav>

          <div className="flex items-center gap-2">
            <PwaInstallButton variant="dark" />
            {/* Desktop-only: Entrar + Cadastre-se — hidden on mobile (both live in burger menu) */}
            <Link href="/login"
              className="hidden md:inline-flex items-center text-sm font-medium text-white/70 hover:text-white transition px-3 py-2">
              Entrar
            </Link>
            <Link href="/register"
              className="hidden md:inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold transition hover:opacity-90"
              style={{ background: 'linear-gradient(135deg,var(--brand-accent),var(--brand-accent-light))', color: 'var(--brand-bg-from)' }}>
              Cadastre-se
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
              </svg>
            </Link>
            <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden p-2 text-white/70 hover:text-white">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                {menuOpen
                  ? <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                  : <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />}
              </svg>
            </button>
          </div>
        </div>

        {/* ── Mobile dropdown menu ────────────────────────────────────────── */}
        {menuOpen && (
          <nav className="md:hidden border-t border-white/10 px-4 pb-5 pt-3 flex flex-col"
            style={{ background: 'color-mix(in srgb, var(--brand-bg-from) 96%, transparent)', backdropFilter: 'blur(20px)' }}>

            {/* Nav links */}
            <div className="flex flex-col mb-4">
              {[['#como-funciona', 'Como Funciona'], ['#recursos', 'Recursos'], ['#ranking', 'Ranking'], ['#premios', 'Prêmios']].map(([href, label]) => (
                <a key={href} href={href} onClick={() => setMenuOpen(false)}
                  className="text-white/70 hover:text-white transition py-2.5 text-sm font-medium border-b border-white/5 last:border-0">
                  {label}
                </a>
              ))}
            </div>

            {/* CTA buttons */}
            <div className="flex flex-col gap-2.5 pt-1">
              <Link
                href="/login"
                onClick={() => setMenuOpen(false)}
                className="w-full flex items-center justify-center py-3 rounded-xl text-sm font-semibold border transition"
                style={{ borderColor: 'rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.85)' }}
              >
                Entrar
              </Link>
              <Link
                href="/register"
                onClick={() => setMenuOpen(false)}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-black transition hover:opacity-90 active:scale-95"
                style={{ background: 'linear-gradient(135deg,var(--brand-accent),var(--brand-accent-light))', color: 'var(--brand-bg-from)' }}
              >
                Cadastre-se
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                </svg>
              </Link>
            </div>
          </nav>
        )}
      </header>

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section className="relative min-h-[80vh] flex flex-col items-center justify-center px-4 text-center pt-24 sm:pt-28 pb-16">

        {/* Desktop badge — absolute right, hidden on mobile */}
        {badge.show && (
          <motion.div
            initial={{ opacity: 0, x: 60 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.8, duration: 0.6, ease: EASE_OUT_EXPO }}
            className="hidden sm:block absolute top-8 right-4 sm:right-12 z-10"
          >
            <div className="rounded-2xl px-4 py-3 text-left shadow-2xl border border-yellow-400/40"
              style={{ background: 'rgba(30,27,75,0.85)', backdropFilter: 'blur(16px)' }}>
              <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: 'var(--brand-accent)' }}>
                {badge.label}
              </p>
              <p className="text-white font-bold text-sm">{badge.prize}</p>
              <p className="text-white/60 text-xs">{badge.winner} · {badge.date}</p>
            </div>
          </motion.div>
        )}

        {/* ── VIP pill ── */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <span
            className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full mb-6 border"
            style={{ color: 'var(--brand-accent)', borderColor: 'color-mix(in srgb, var(--brand-accent) 40%, transparent)', background: 'color-mix(in srgb, var(--brand-accent) 10%, transparent)' }}
          >
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'var(--brand-accent)' }} />
            Plataforma VIP de Fidelidade
          </span>
        </motion.div>

        {/* ── Headline ── */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.7, ease: EASE_OUT_EXPO }}
          className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black leading-tight max-w-4xl mx-auto mb-5"
        >
          <GoldText text={hero.headline} />
        </motion.h1>

        {/* ── Subheadline ── */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="text-white/60 text-lg sm:text-xl max-w-xl mx-auto mb-6"
        >
          {hero.subheadline}
        </motion.p>

        {/* Mobile badge — inline, centered, visible only on mobile */}
        {badge.show && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.38, duration: 0.5 }}
            className="sm:hidden w-full max-w-xs mb-6"
          >
            <div
              className="rounded-2xl px-4 py-3 text-center border border-yellow-400/40 shadow-xl"
              style={{ background: 'rgba(30,27,75,0.85)', backdropFilter: 'blur(16px)' }}
            >
              <p className="text-xs font-semibold uppercase tracking-widest mb-0.5" style={{ color: 'var(--brand-accent)' }}>
                {badge.label}
              </p>
              <p className="text-white font-bold text-sm">{badge.prize}</p>
              <p className="text-white/50 text-xs mt-0.5">{badge.winner} · {badge.date}</p>
            </div>
          </motion.div>
        )}

        {/* ── CTAs ── */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.45, duration: 0.5 }}
          className="flex flex-col sm:flex-row items-center gap-3"
        >
          <Link href="/register"
            className="inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl text-base font-black shadow-xl transition-transform hover:scale-105 active:scale-95"
            style={{ background: 'linear-gradient(135deg,var(--brand-accent),var(--brand-accent-light))', color: 'var(--brand-bg-from)' }}>
            {hero.cta}
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
            </svg>
          </Link>
          <a href="#como-funciona"
            className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl text-sm font-semibold text-white/70 hover:text-white border border-white/20 hover:border-white/40 transition">
            Como funciona
          </a>
        </motion.div>

        {/* Scroll caret */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2 }}
          className="absolute bottom-6 left-1/2 -translate-x-1/2">
          <div className="w-6 h-10 rounded-full border-2 border-white/20 flex items-start justify-center p-1.5">
            <motion.div animate={{ y: [0, 10, 0] }} transition={{ repeat: Infinity, duration: 1.6, ease: 'easeInOut' }}
              className="w-1 h-2 rounded-full bg-white/40" />
          </div>
        </motion.div>
      </section>

      {/* ── COMO FUNCIONA ────────────────────────────────────────────────── */}
      <section id="como-funciona" className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <FadeSection className="text-center mb-10">
            <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--brand-accent)' }}>Simples assim</p>
            <h2 className="text-3xl sm:text-4xl font-black text-white mb-3">Como Funciona</h2>
            <p className="text-white/50 max-w-md mx-auto text-sm">Em cinco passos você já está acumulando pontos e disputando prêmios incríveis.</p>
          </FadeSection>

          <div className="flex flex-wrap justify-center gap-5">
            {steps.map((step, i) => (
              <FadeSection key={step.number} delay={i} className="w-full sm:w-[calc(50%-10px)] md:w-[calc(33.33%-14px)]">
                <div
                  className="rounded-2xl p-5 h-full border border-white/10 hover:border-yellow-400/30 transition-colors"
                  style={{ background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(10px)' }}
                >
                  {/* Top row: number left, icon right */}
                  <div className="flex items-center justify-between mb-4">
                    <span
                      className="text-4xl font-black leading-none"
                      style={{ background: 'linear-gradient(135deg,var(--brand-accent),var(--brand-accent-light))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
                    >
                      {step.number}
                    </span>
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: 'color-mix(in srgb, var(--brand-accent) 12%, transparent)', boxShadow: '0 0 18px color-mix(in srgb, var(--brand-accent) 18%, transparent)' }}
                    >
                      <svg className="w-5 h-5" style={{ color: 'var(--brand-accent)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d={step.icon} />
                      </svg>
                    </div>
                  </div>
                  <h3 className="text-base font-bold text-white mb-1.5">{step.title}</h3>
                  <p className="text-white/50 text-sm leading-relaxed">{step.description}</p>
                </div>
              </FadeSection>
            ))}
          </div>
        </div>
      </section>

      {/* ── RECURSOS EXCLUSIVOS ──────────────────────────────────────────── */}
      <section id="recursos" className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">

            {/* Left — Meu Painel mockup (mirrors real app) */}
            <FadeSection className="order-2 lg:order-1">
              <PainelMockup />
            </FadeSection>

            {/* Right — feature list */}
            <div className="order-1 lg:order-2 space-y-3">
              <FadeSection>
                <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--brand-accent)' }}>Recursos Exclusivos</p>
                <h2 className="text-3xl sm:text-4xl font-black text-white mb-3 leading-tight">
                  Tudo que você precisa<br />para dominar o ranking
                </h2>
                <p className="text-white/50 mb-6 text-sm">
                  Uma plataforma completa de fidelidade projetada para vendedores de alta performance.
                </p>
              </FadeSection>

              <div className="space-y-2.5">
                {features.map((f, i) => (
                  <FadeSection key={f.title} delay={i * 0.5}>
                    <div
                      className="flex items-start gap-3.5 rounded-xl p-3.5 border border-white/10 hover:border-white/20 transition-colors"
                      style={{ background: 'rgba(255,255,255,0.04)' }}
                    >
                      <span className="text-xl flex-shrink-0 mt-0.5">{f.icon}</span>
                      <div>
                        <p className="text-white font-semibold text-sm mb-0.5">{f.title}</p>
                        <p className="text-white/50 text-xs leading-relaxed">{f.description}</p>
                      </div>
                    </div>
                  </FadeSection>
                ))}
              </div>

              <FadeSection delay={4}>
                <Link href="/login"
                  className="inline-flex items-center gap-2 mt-3 px-6 py-3 rounded-xl text-sm font-bold transition-transform hover:scale-105"
                  style={{ background: 'linear-gradient(135deg,var(--brand-accent),var(--brand-accent-light))', color: 'var(--brand-bg-from)' }}>
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

      {/* ── RANKING ──────────────────────────────────────────────────────── */}
      <section id="ranking" className="py-16 px-4">
        <div className="max-w-3xl mx-auto">
          <FadeSection className="text-center mb-8">
            <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--brand-accent)' }}>Desempenho</p>
            <h2 className="text-3xl sm:text-4xl font-black text-white mb-3">Ranking de Performance</h2>
            <p className="text-white/50 text-sm">Os campeões da semana. Você pode ser o próximo.</p>
          </FadeSection>

          <FadeSection>
            <div className="rounded-3xl overflow-hidden border border-white/10"
              style={{ background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(16px)' }}>
              <div className="grid grid-cols-12 px-6 py-3 text-xs font-bold uppercase tracking-widest text-white/30 border-b border-white/10">
                <span className="col-span-1">#</span>
                <span className="col-span-7">Participante</span>
                <span className="col-span-4 text-right">Pontos</span>
              </div>

              {ranking.length === 0 ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="grid grid-cols-12 px-6 py-4 border-b border-white/5 animate-pulse">
                    <div className="col-span-1"><div className="w-6 h-6 rounded-full bg-white/10" /></div>
                    <div className="col-span-7"><div className="h-4 w-32 rounded bg-white/10" /></div>
                    <div className="col-span-4 flex justify-end"><div className="h-4 w-16 rounded bg-white/10" /></div>
                  </div>
                ))
              ) : (
                ranking.map((ru, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.08, duration: 0.4 }}
                    className={`grid grid-cols-12 items-center px-6 py-3.5 border-b border-white/5 last:border-0 ${i === 0 ? 'bg-yellow-400/5' : ''}`}
                  >
                    <span className={`col-span-1 text-lg font-black ${RANK_COLORS[i]}`}>{RANK_BADGES[i]}</span>
                    <div className="col-span-7 flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-black flex-shrink-0"
                        style={i === 0
                          ? { background: 'linear-gradient(135deg,var(--brand-accent),var(--brand-accent-light))', color: 'var(--brand-bg-from)' }
                          : { background: 'rgba(255,255,255,0.1)', color: '#fff' }
                        }
                      >
                        {ru.full_name?.[0]?.toUpperCase() ?? '?'}
                      </div>
                      <span className="text-white font-medium text-sm truncate">
                        {(() => {
                          const parts = (ru.full_name ?? '').split(' ')
                          return parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1][0]}.` : parts[0]
                        })()}
                      </span>
                    </div>
                    <div className="col-span-4 text-right">
                      <span className="text-sm font-black" style={i === 0 ? { color: 'var(--brand-accent)' } : { color: 'rgba(255,255,255,0.7)' }}>
                        {(ru.total_points ?? 0).toLocaleString('pt-BR')}
                      </span>
                      <span className="text-white/30 text-xs ml-1">pts</span>
                    </div>
                  </motion.div>
                ))
              )}

              <div className="px-6 py-3.5 text-center border-t border-white/10">
                <Link href="/login" className="text-sm font-semibold hover:underline" style={{ color: 'var(--brand-accent)' }}>
                  Entrar e ver minha posição →
                </Link>
              </div>
            </div>
          </FadeSection>
        </div>
      </section>

      {/* ── PRÊMIOS JÁ SORTEADOS ─────────────────────────────────────────── */}
      <section id="premios" className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <FadeSection className="text-center mb-10">
            <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--brand-accent)' }}>Prova Social</p>
            <h2 className="text-3xl sm:text-4xl font-black text-white mb-3">Veja o que já foi Sorteado</h2>
            <p className="text-white/50 max-w-md mx-auto text-sm">Prêmios reais, ganhadores reais. O programa funciona — e você pode ser o próximo.</p>
          </FadeSection>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {prizes.map((prize, i) => (
              <FadeSection key={prize.title} delay={i * 0.5}>
                <div
                  className="rounded-2xl overflow-hidden border border-white/10 hover:border-yellow-400/30 transition-all hover:-translate-y-1 group cursor-default"
                  style={{ background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(10px)' }}
                >
                  {/* Image / gradient — image overlays the gradient if uploaded */}
                  <div className={`h-32 bg-gradient-to-br ${prize.color} relative flex items-center justify-center overflow-hidden`}>
                    {prize.image && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={prize.image}
                        alt={prize.title}
                        className="absolute inset-0 w-full h-full object-cover opacity-70 group-hover:opacity-90 transition-opacity"
                        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
                      />
                    )}
                    {/* Entregue badge */}
                    <span
                      className="absolute top-2.5 left-2.5 text-xs font-bold px-2 py-0.5 rounded-full z-10 flex items-center gap-1"
                      style={{ background: 'rgba(22,163,74,0.9)', color: '#fff' }}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-white/80 inline-block" />
                      Sorteado
                    </span>
                  </div>

                  <div className="p-3.5">
                    <p className="text-white font-bold text-sm mb-0.5">{prize.title}</p>
                    <p className="text-white/40 text-xs mb-3">{prize.subtitle}</p>

                    {/* Social proof row */}
                    <div
                      className="flex items-center gap-2 rounded-lg px-2.5 py-2"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                    >
                      <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0"
                        style={{ background: 'linear-gradient(135deg,var(--brand-accent),var(--brand-accent-light))', color: 'var(--brand-bg-from)' }}>
                        {prize.winner[0]}
                      </div>
                      <div className="min-w-0">
                        <p className="text-white/80 text-xs font-semibold truncate">{prize.winner}</p>
                        <p className="text-white/30 text-xs">Entregue em {prize.deliveredAt}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </FadeSection>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA BANNER ─────────────────────────────────────────────── */}
      <section className="py-16 px-4">
        <div className="max-w-3xl mx-auto">
          <FadeSection>
            <div
              className="rounded-3xl p-8 text-center relative overflow-hidden border border-white/15"
              style={{ background: 'linear-gradient(135deg,color-mix(in srgb, var(--brand-accent) 12%, transparent),rgba(99,102,241,0.12))', backdropFilter: 'blur(20px)' }}
            >
              <div className="absolute inset-0 pointer-events-none"
                style={{ background: 'radial-gradient(circle at 50% 0%,color-mix(in srgb, var(--brand-accent) 10%, transparent),transparent 60%)' }} />
              <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--brand-accent)' }}>Comece hoje</p>
              <h2 className="text-3xl sm:text-4xl font-black text-white mb-3">
                Sua primeira conquista<br />começa agora
              </h2>
              <p className="text-white/50 mb-6 max-w-sm mx-auto text-sm">
                Junte-se a vendedores que já estão acumulando pontos e conquistando prêmios.
              </p>
              <Link href="/register"
                className="inline-flex items-center gap-2 px-8 py-3.5 rounded-2xl text-base font-black shadow-xl transition-transform hover:scale-105"
                style={{ background: 'linear-gradient(135deg,var(--brand-accent),var(--brand-accent-light))', color: 'var(--brand-bg-from)' }}>
                Cadastre-se Gratuitamente
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                </svg>
              </Link>
            </div>
          </FadeSection>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────────────── */}
      <footer className="border-t border-white/10 pt-8 pb-5 px-4" style={{ background: 'rgba(0,0,0,0.3)' }}>
        <div className="max-w-6xl mx-auto">

          {/* Main grid: full-width brand on mobile → 2-col links below; 3-col on desktop */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6 mb-6">

            {/* Brand column — spans both mobile cols */}
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-2.5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={brand.logo_landing_url || brand.logo_login_url || '/logo.png'}
                  alt="Robsol VIP"
                  style={{ width: `${landingLogoW}px`, height: 'auto', maxWidth: '200px' }}
                  className="object-contain"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
                />
                {!(brand.logo_landing_url || brand.logo_login_url) && (
                  <span className="font-black text-base text-white">
                    Robsol <span style={{ color: 'var(--brand-accent)' }}>VIP</span>
                  </span>
                )}
              </div>
              <p className="text-white/40 text-xs leading-relaxed mb-4 max-w-xs">
                {footer.description}
              </p>

              {/* Social icons — hidden when empty */}
              {socialLinks.length > 0 && (
                <div className="flex items-center gap-1.5">
                  {socialLinks.map((s) => (
                    <a
                      key={s.key}
                      href={s.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={s.label}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition"
                    >
                      {s.icon}
                    </a>
                  ))}
                </div>
              )}
            </div>

            {/* Plataforma links */}
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-white/30 mb-3">Plataforma</p>
              <ul className="space-y-2">
                {footer.platformLinks.map((link) => (
                  <li key={link.label}>
                    <a href={link.href} className="text-xs text-white/50 hover:text-white transition">{link.label}</a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Suporte links */}
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-white/30 mb-3">Suporte</p>
              <ul className="space-y-2">
                {supportLinks.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      target={link.href.startsWith('http') ? '_blank' : undefined}
                      rel={link.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                      className="text-xs text-white/50 hover:text-white transition"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="border-t border-white/10 pt-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-white/30">
            <span>© {new Date().getFullYear()} Robsol VIP. Todos os direitos reservados.</span>
            <div className="flex items-center gap-3">
              <a href="/privacidade" className="hover:text-white/60 transition">Privacidade</a>
              <a href="/termos" className="hover:text-white/60 transition">Termos</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

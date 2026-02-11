'use client'

import { useState, useEffect } from 'react'

interface BannerSlide {
  id: string
  title: string
  subtitle?: string
  gradient: string
}

interface CarrosselBannersProps {
  topUsers?: { full_name: string; total_points: number }[]
}

export default function CarrosselBanners({ topUsers }: CarrosselBannersProps) {
  const [current, setCurrent] = useState(0)

  const slides: BannerSlide[] = [
    {
      id: 'welcome',
      title: 'Robsol VIP',
      subtitle: 'Escaneie cupons, acumule pontos e concorra a premios!',
      gradient: 'from-indigo-600 to-purple-600',
    },
    ...(topUsers && topUsers.length > 0
      ? [{
          id: 'hall-of-fame',
          title: 'Hall da Fama',
          subtitle: topUsers.map((u, i) => `${i + 1}. ${u.full_name} — ${u.total_points} pts`).join(' | '),
          gradient: 'from-amber-500 to-orange-600',
        }]
      : []),
    {
      id: 'tips',
      title: 'Dica Rapida',
      subtitle: 'Tire fotos claras e bem iluminadas dos seus cupons para aprovacao mais rapida!',
      gradient: 'from-green-500 to-emerald-600',
    },
  ]

  useEffect(() => {
    if (slides.length <= 1) return
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % slides.length)
    }, 5000)
    return () => clearInterval(timer)
  }, [slides.length])

  return (
    <section className="mb-6">
      <div className="relative overflow-hidden rounded-xl">
        <div
          className="flex transition-transform duration-500 ease-in-out"
          style={{ transform: `translateX(-${current * 100}%)` }}
        >
          {slides.map((slide) => (
            <div
              key={slide.id}
              className={`w-full flex-shrink-0 bg-gradient-to-r ${slide.gradient} p-6 text-white min-h-[120px] flex flex-col justify-center`}
            >
              <h3 className="font-bold text-lg">{slide.title}</h3>
              {slide.subtitle && <p className="text-white/90 text-sm mt-1">{slide.subtitle}</p>}
            </div>
          ))}
        </div>

        {/* Dot Indicators */}
        {slides.length > 1 && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={`w-2 h-2 rounded-full transition ${
                  i === current ? 'bg-white' : 'bg-white/40'
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

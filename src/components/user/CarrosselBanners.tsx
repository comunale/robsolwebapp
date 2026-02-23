'use client'

import { useState, useEffect, useMemo } from 'react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'

interface MuralSlide {
  id: string
  title: string
  subtitle: string | null
  image_url: string | null
  bg_color: string
  text_color: string
}

const DEFAULT_SLIDE: MuralSlide = {
  id: 'default',
  title: 'Robsol VIP',
  subtitle: 'Escaneie cupons, acumule pontos e concorra a prêmios!',
  image_url: null,
  bg_color: 'linear-gradient(135deg, #6366f1, #9333ea)',
  text_color: '#ffffff',
}

export default function CarrosselBanners() {
  const [slides, setSlides] = useState<MuralSlide[]>([])
  const [current, setCurrent] = useState(0)
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    let mounted = true
    const fetchSlides = async () => {
      const { data } = await supabase
        .from('mural_slides')
        .select('id, title, subtitle, image_url, bg_color, text_color')
        .eq('is_active', true)
        .order('priority', { ascending: true })
      if (mounted && data && data.length > 0) {
        setSlides(data as MuralSlide[])
      }
    }
    void fetchSlides()
    return () => { mounted = false }
  }, [supabase])

  const activeSlides = slides.length > 0 ? slides : [DEFAULT_SLIDE]

  useEffect(() => {
    if (activeSlides.length <= 1) return
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % activeSlides.length)
    }, 5000)
    return () => clearInterval(timer)
  }, [activeSlides.length])

  // Reset to first slide when slides change
  useEffect(() => {
    setCurrent(0)
  }, [slides])

  return (
    <section className="mb-6">
      <div className="relative overflow-hidden rounded-xl">
        <div
          className="flex transition-transform duration-500 ease-in-out"
          style={{ transform: `translateX(-${current * 100}%)` }}
        >
          {activeSlides.map((slide) => (
            <div
              key={slide.id}
              className="w-full flex-shrink-0 min-h-[120px] flex flex-col justify-center relative overflow-hidden"
              style={{ background: slide.image_url ? '#1f2937' : slide.bg_color }}
            >
              {slide.image_url && (
                <Image
                  src={slide.image_url}
                  alt={slide.title}
                  fill
                  sizes="100vw"
                  className="object-cover opacity-70"
                />
              )}
              <div
                className="relative z-10 p-6"
                style={{ color: slide.text_color }}
              >
                <h3 className="font-bold text-lg leading-tight">{slide.title}</h3>
                {slide.subtitle && (
                  <p className="text-sm mt-1 opacity-90">{slide.subtitle}</p>
                )}
              </div>
            </div>
          ))}
        </div>

        {activeSlides.length > 1 && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
            {activeSlides.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={`w-2 h-2 rounded-full transition ${
                  i === current ? 'bg-white' : 'bg-white/40'
                }`}
                aria-label={`Slide ${i + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

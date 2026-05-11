function getYouTubeEmbedUrl(url: string): string | null {
  if (!url.trim()) return null
  if (url.includes('/embed/')) {
    const base = url.split('?')[0]
    return base.startsWith('http') ? base : `https://www.youtube.com${base}`
  }
  const watchMatch = url.match(/[?&]v=([a-zA-Z0-9_-]{11})/)
  if (watchMatch) return `https://www.youtube.com/embed/${watchMatch[1]}`
  const shortMatch = url.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/)
  if (shortMatch) return `https://www.youtube.com/embed/${shortMatch[1]}`
  return null
}

export default function HomeVideoPlayer({ url }: { url: string }) {
  const embedUrl = getYouTubeEmbedUrl(url)
  if (!embedUrl) return null

  return (
    <section className="mb-6">
      <div
        className="rounded-2xl overflow-hidden shadow-lg border border-white/10"
        style={{ background: 'linear-gradient(135deg, var(--brand-bg-from), var(--brand-bg-to))' }}
      >
        {/* Header bar */}
        <div className="px-4 pt-4 pb-3 flex items-center gap-2.5">
          <div
            className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, var(--brand-accent), var(--brand-accent-light))' }}
          >
            <svg
              className="w-3 h-3"
              fill="currentColor"
              viewBox="0 0 24 24"
              style={{ color: 'var(--brand-bg-from)' }}
            >
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
          <span
            className="text-xs font-bold uppercase tracking-widest"
            style={{ color: 'var(--brand-accent)' }}
          >
            Comece por Aqui
          </span>
        </div>

        {/* 16:9 responsive iframe */}
        <div className="relative w-full aspect-video">
          <iframe
            src={embedUrl}
            title="Vídeo de Apresentação"
            className="absolute inset-0 w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>
      </div>
    </section>
  )
}

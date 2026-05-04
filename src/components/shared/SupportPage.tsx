import Link from 'next/link'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { Components } from 'react-markdown'

// ── Icon helpers ─────────────────────────────────────────────────────────────

function WhatsAppIcon() {
  return (
    <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  )
}

function ExternalLinkIcon() {
  return (
    <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
    </svg>
  )
}

// ── Markdown component map ────────────────────────────────────────────────────
// All inline links use brand-primary.
// A paragraph that contains ONLY a link is upgraded to a gold CTA button.
// A blockquote is upgraded to a brand-tinted CTA card — admins use "> " prefix
// to mark the "Ainda tem dúvidas?" section.

export const mdComponents: Components = {

  h1: ({ children }) => (
    <h1 className="text-2xl font-bold text-gray-900 mb-4 mt-6 first:mt-0">{children}</h1>
  ),

  h2: ({ children }) => (
    <h2 className="text-xl font-bold text-gray-900 mb-3 mt-8 pt-6 border-t border-gray-100 first:mt-0 first:pt-0 first:border-0">
      {children}
    </h2>
  ),

  h3: ({ children }) => (
    <h3 className="text-base font-bold text-gray-800 mb-2 mt-5">{children}</h3>
  ),

  // Paragraph — detect solo links and render them as CTA buttons
  p: ({ children, node }) => {
    type HastChild = { type: string; tagName?: string; properties?: Record<string, unknown> }
    const nc = (node as { children?: HastChild[] } | undefined)?.children
    const isSoloLink =
      nc?.length === 1 &&
      nc[0]?.type === 'element' &&
      nc[0]?.tagName === 'a'

    if (isSoloLink) {
      const href = (nc![0]?.properties?.href ?? '#') as string
      const isWhatsApp = /wa\.me|whatsapp/i.test(href)
      return (
        <div className="mt-3 mb-5">
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2.5 px-5 py-3 rounded-xl font-semibold text-sm transition-all duration-200 shadow-sm hover:shadow-md hover:brightness-105 active:scale-[0.98]"
            style={{
              background: 'linear-gradient(135deg, var(--brand-accent), var(--brand-accent-light))',
              color: 'var(--brand-bg-from)',
              fontFamily: 'var(--font-montserrat), sans-serif',
            }}
          >
            {isWhatsApp ? <WhatsAppIcon /> : <ExternalLinkIcon />}
            {children}
          </a>
        </div>
      )
    }

    return <p className="text-gray-700 mb-4 leading-relaxed">{children}</p>
  },

  ul: ({ children }) => (
    <ul className="list-disc list-inside mb-4 space-y-1.5 text-gray-700">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="list-decimal list-inside mb-4 space-y-1.5 text-gray-700">{children}</ol>
  ),
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,

  strong: ({ children }) => (
    <strong className="font-semibold text-gray-900">{children}</strong>
  ),
  em: ({ children }) => <em className="italic">{children}</em>,

  // Inline link — brand primary colour, visible underline, Montserrat
  a: ({ href, children }) => (
    <a
      href={href ?? '#'}
      target="_blank"
      rel="noopener noreferrer"
      className="font-semibold underline underline-offset-2 decoration-1 transition-colors duration-150 hover:opacity-80"
      style={{
        color: 'var(--brand-primary)',
        textDecorationColor: 'var(--brand-primary)',
        fontFamily: 'var(--font-montserrat), sans-serif',
      }}
    >
      {children}
    </a>
  ),

  hr: () => <hr className="border-gray-200 my-6" />,

  // Blockquote → branded CTA card (used for "Ainda tem dúvidas?" sections)
  blockquote: ({ children }) => (
    <div
      className="my-6 p-5 rounded-2xl border"
      style={{
        background: 'color-mix(in srgb, var(--brand-primary) 5%, white)',
        borderColor: 'color-mix(in srgb, var(--brand-primary) 18%, white)',
      }}
    >
      {children}
    </div>
  ),

  code: ({ children }) => (
    <code className="bg-gray-100 text-gray-800 px-1.5 py-0.5 rounded text-sm font-mono">
      {children}
    </code>
  ),
  pre: ({ children }) => (
    <pre className="bg-gray-100 text-gray-800 p-4 rounded-xl overflow-x-auto mb-4 text-sm">
      {children}
    </pre>
  ),

  table: ({ children }) => (
    <div className="overflow-x-auto mb-4">
      <table className="w-full text-sm border-collapse">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-gray-50">{children}</thead>,
  th: ({ children }) => (
    <th className="px-3 py-2 text-left font-semibold text-gray-700 border border-gray-200">{children}</th>
  ),
  td: ({ children }) => (
    <td className="px-3 py-2 text-gray-700 border border-gray-200">{children}</td>
  ),
}

// ── Page wrapper ──────────────────────────────────────────────────────────────

interface Props {
  title: string
  content: string
  backHref?: string
  /** Slot rendered below the markdown content inside the card */
  children?: React.ReactNode
}

export default function SupportPage({ title, content, backHref = '/', children }: Props) {
  const hasContent = content.trim().length > 0
  const showFallback = !hasContent && !children

  return (
    <div className="min-h-screen brand-auth-bg">
      <div className="max-w-2xl mx-auto px-4 py-8">

        {/* Back link */}
        <div className="mb-5">
          <Link
            href={backHref}
            className="inline-flex items-center gap-1.5 text-white/70 hover:text-white transition text-sm font-medium"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Voltar
          </Link>
        </div>

        {/* Content card */}
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl overflow-hidden">
          <div className="h-1 w-full brand-accent-bar" />

          <div className="p-6 md:p-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-6 pb-4 border-b border-gray-100">
              {title}
            </h1>

            {hasContent && (
              <div className="text-base leading-relaxed">
                <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
                  {content}
                </ReactMarkdown>
              </div>
            )}

            {showFallback && (
              <div className="text-center py-12">
                <p className="text-4xl mb-3">📄</p>
                <p className="text-gray-700 font-semibold">Conteúdo em breve</p>
                <p className="text-sm text-gray-400 mt-1.5">
                  Esta página será atualizada em breve pelo administrador.
                </p>
              </div>
            )}

            {children}
          </div>
        </div>

        {/* Footer back */}
        <div className="mt-6 text-center">
          <Link href={backHref} className="text-white/50 hover:text-white text-sm transition">
            ← Voltar ao início
          </Link>
        </div>

      </div>
    </div>
  )
}

import Link from 'next/link'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { Components } from 'react-markdown'

// Tailwind-styled component map — no @tailwindcss/typography needed
export const mdComponents: Components = {
  h1: ({ children }) => <h1 className="text-2xl font-bold text-gray-900 mb-4 mt-6 first:mt-0">{children}</h1>,
  h2: ({ children }) => <h2 className="text-xl font-bold text-gray-800 mb-3 mt-6">{children}</h2>,
  h3: ({ children }) => <h3 className="text-base font-bold text-gray-800 mb-2 mt-4">{children}</h3>,
  p:  ({ children }) => <p className="text-gray-700 mb-4 leading-relaxed">{children}</p>,
  ul: ({ children }) => <ul className="list-disc list-inside mb-4 space-y-1.5 text-gray-700">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal list-inside mb-4 space-y-1.5 text-gray-700">{children}</ol>,
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  strong: ({ children }) => <strong className="font-semibold text-gray-900">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  a: ({ href, children }) => (
    <a href={href ?? '#'} className="text-[var(--brand-primary)] hover:underline" target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  ),
  hr: () => <hr className="border-gray-200 my-6" />,
  blockquote: ({ children }) => (
    <blockquote className="border-l-4 border-[var(--brand-accent)] pl-4 italic text-gray-600 my-4 bg-gray-50 py-2 rounded-r-lg">
      {children}
    </blockquote>
  ),
  code: ({ children }) => (
    <code className="bg-gray-100 text-gray-800 px-1.5 py-0.5 rounded text-sm font-mono">{children}</code>
  ),
  pre: ({ children }) => (
    <pre className="bg-gray-100 text-gray-800 p-4 rounded-xl overflow-x-auto mb-4 text-sm">{children}</pre>
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

interface Props {
  title: string
  content: string
  backHref?: string
  /** Optional slot rendered below the markdown content inside the card */
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

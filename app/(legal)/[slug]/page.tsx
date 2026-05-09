import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getPublishedLegalPage } from '@/lib/actions/admin'

const VALID_SLUGS = ['terms', 'privacy', 'cookies', 'gdpr']

// Force dynamic rendering — legal pages are DB-driven
export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params
  const page = await getPublishedLegalPage(slug)
  if (!page) return { title: 'Not Found — InvoiceForge UK' }
  return { title: `${page.title} — InvoiceForge UK` }
}

export default async function LegalPage({ params }: Props) {
  const { slug } = await params
  if (!VALID_SLUGS.includes(slug)) notFound()
  const page = await getPublishedLegalPage(slug)
  if (!page) notFound()

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-background">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2 font-bold tracking-tight">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground text-xs font-black">
              IF
            </span>
            InvoiceForge UK
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Back to home
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          ← Back to InvoiceForge
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">{page.title}</h1>
        <div
          className="prose prose-gray dark:prose-invert mt-8 max-w-none"
          dangerouslySetInnerHTML={{ __html: page.content }}
        />
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-background">
        <div className="mx-auto max-w-7xl px-4 py-6 text-center text-xs text-muted-foreground sm:px-6 lg:px-8">
          <p>© {new Date().getFullYear()} InvoiceForge UK Ltd. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
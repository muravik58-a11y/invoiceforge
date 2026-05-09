import { getLegalPages } from '@/lib/actions/admin'
import { LegalPagesManager } from '@/components/admin/legal-pages-manager'

export const metadata = { title: 'Legal Pages — InvoiceForge Admin' }

export default async function AdminLegalPage() {
  const pages = await getLegalPages()

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Legal Pages</h1>
        <p className="mt-1 text-sm text-gray-400">
          Edit your Terms of Service, Privacy Policy, Cookie Policy, and GDPR pages.
          Published pages are publicly accessible at <code className="text-gray-300">/{'{'}slug{'}'}</code>.
        </p>
      </div>
      <LegalPagesManager initialPages={pages} />
    </>
  )
}
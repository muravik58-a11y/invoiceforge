import { getAdminOrgs } from '@/lib/actions/admin'
import { AdminPanel } from '@/components/admin/admin-panel'

export const metadata = { title: 'Overview — InvoiceForge Admin' }

export default async function AdminOverviewPage() {
  const orgs = await getAdminOrgs()
  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Platform Overview</h1>
        <p className="mt-1 text-sm text-gray-400">All organisations on InvoiceForge UK</p>
      </div>
      <AdminPanel orgs={orgs} />
    </>
  )
}

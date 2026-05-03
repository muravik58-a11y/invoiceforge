import { getSiteConfig } from '@/lib/actions/admin'
import { SiteSettingsForm } from '@/components/admin/site-settings-form'

export const metadata = { title: 'App Settings — InvoiceForge Admin' }

export default async function AdminSettingsPage() {
  const config = await getSiteConfig()

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">App Settings</h1>
        <p className="mt-1 text-sm text-gray-400">
          Landing page copy and global app controls
        </p>
      </div>
      <SiteSettingsForm config={config} />
    </>
  )
}

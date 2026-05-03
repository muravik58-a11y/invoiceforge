import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'

import { getOrganizationByClerkId } from '@/lib/actions/organization'
import { SettingsLayout } from '@/components/settings/settings-layout'
import { TemplatePicker } from '@/components/settings/template-picker'

export const metadata = {
  title: 'Invoice Templates — InvoiceForge UK',
  description: 'Choose the PDF template for your invoices.',
}

export const dynamic = 'force-dynamic'

export default async function AppearanceSettingsPage() {
  const { orgId: clerkOrgId } = await auth()

  if (!clerkOrgId) redirect('/sign-in')

  const org = await getOrganizationByClerkId(clerkOrgId)
  if (!org) redirect('/onboarding')

  const isPro = org.planId !== 'FREE'
  const template = (org.preferredTemplate ?? 'modern') as 'modern' | 'classic' | 'branded'

  return (
    <SettingsLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold">Invoice Templates</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Choose how your PDF invoices look when downloaded or emailed to clients.
          </p>
        </div>

        <TemplatePicker
          orgId={org.id}
          current={template}
          brandColor={org.brandColor ?? '#2563EB'}
          isPro={isPro}
        />
      </div>
    </SettingsLayout>
  )
}

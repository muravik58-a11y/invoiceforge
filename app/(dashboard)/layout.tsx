import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'

import { DashboardSidebar } from '@/components/dashboard/sidebar'
import { DashboardHeader } from '@/components/dashboard/header'
import { getOrganizationByClerkId } from '@/lib/actions/organization'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { userId, orgId: clerkOrgId } = await auth()

  if (!userId) {
    redirect('/sign-in')
  }

  // User is authenticated but has no org — send to onboarding to create one
  if (!clerkOrgId) {
    redirect('/onboarding')
  }

  const org = await getOrganizationByClerkId(clerkOrgId)

  // Org exists in Clerk but not yet in our DB — trigger onboarding
  if (!org) {
    redirect('/onboarding')
  }

  const plan = (org.planId?.toLowerCase() ?? 'free') as 'free' | 'pro' | 'enterprise'

  return (
    <div className="relative min-h-screen bg-background">
      {/* ── Fixed sidebar (desktop) ── */}
      <div className="hidden lg:block">
        <DashboardSidebar plan={plan} />
      </div>

      {/* ── Main content area ── */}
      <div className="flex min-h-screen flex-col lg:ml-64">
        {/* Sticky top header */}
        <DashboardHeader />

        {/* Page content */}
        <main className="flex-1 p-4 sm:p-6" id="main-content">
          {children}
        </main>
      </div>
    </div>
  )
}

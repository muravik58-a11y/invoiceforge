import { getSiteConfig, getPlanPrices } from '@/lib/actions/admin'
import { PlanLimitsForm } from '@/components/admin/plan-limits-form'
import { PlanPricingForm } from '@/components/admin/plan-pricing-form'
import type { PlanLimits } from '@/lib/constants'

export const metadata = { title: 'Plan Limits — InvoiceForge Admin' }

const DEFAULT: PlanLimits = {
  invoices: 0,
  clients: 0,
  products: 0,
  members: 0,
  apiAccess: false,
  customTemplates: false,
  recurringInvoices: false,
}

function parseLimits(raw: unknown): PlanLimits {
  if (!raw || typeof raw !== 'object') return DEFAULT
  const r = raw as Record<string, unknown>
  return {
    invoices: typeof r.invoices === 'number' ? r.invoices : 0,
    clients: typeof r.clients === 'number' ? r.clients : 0,
    products: typeof r.products === 'number' ? r.products : 0,
    members: typeof r.members === 'number' ? r.members : 0,
    apiAccess: Boolean(r.apiAccess),
    customTemplates: Boolean(r.customTemplates),
    recurringInvoices: Boolean(r.recurringInvoices),
  }
}

export default async function AdminPlansPage() {
  const config = await getSiteConfig()
  const prices = await getPlanPrices()

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Plan Configuration</h1>
        <p className="mt-1 text-sm text-gray-400">
          Configure pricing and what each subscription tier can access. -1 means unlimited.
        </p>
      </div>

      {/* ── Pricing ── */}
      <div className="mb-10 rounded-xl border border-gray-800 bg-gray-950 p-6">
        <PlanPricingForm prices={prices} />
      </div>

      {/* ── Limits ── */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-white">Plan Limits</h2>
      </div>
      <PlanLimitsForm
        free={parseLimits(config.planLimitsFree)}
        pro={parseLimits(config.planLimitsPro)}
        enterprise={parseLimits(config.planLimitsEnterprise)}
      />
    </>
  )
}

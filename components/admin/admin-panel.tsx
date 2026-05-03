'use client'

import * as React from 'react'
import { Loader2Icon, UsersIcon, FileTextIcon, TrendingUpIcon } from 'lucide-react'
import type { SubscriptionPlan } from '@prisma/client'
import { adminSetPlan } from '@/lib/actions/admin'

type Org = {
  id: string
  name: string
  clerkOrgId: string
  planId: SubscriptionPlan
  subscriptionStatus: string | null
  stripeCustomerId: string | null
  createdAt: string
  _count: { invoices: number; clients: number }
}

const PLANS: SubscriptionPlan[] = ['FREE', 'PRO', 'ENTERPRISE']

const PLAN_STYLES: Record<SubscriptionPlan, string> = {
  FREE: 'bg-gray-800 text-gray-300 ring-gray-700',
  PRO: 'bg-blue-900/60 text-blue-300 ring-blue-700',
  ENTERPRISE: 'bg-purple-900/60 text-purple-300 ring-purple-700',
}

const PLAN_BTN: Record<SubscriptionPlan, string> = {
  FREE: 'border-gray-600 text-gray-300 hover:bg-gray-800',
  PRO: 'border-blue-700 text-blue-300 hover:bg-blue-900/40',
  ENTERPRISE: 'border-purple-700 text-purple-300 hover:bg-purple-900/40',
}

export function AdminPanel({ orgs: initialOrgs }: { orgs: Org[] }) {
  const [orgs, setOrgs] = React.useState(initialOrgs)
  const [loading, setLoading] = React.useState<string | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  const totalInvoices = orgs.reduce((s, o) => s + o._count.invoices, 0)
  const totalClients = orgs.reduce((s, o) => s + o._count.clients, 0)
  const proCount = orgs.filter((o) => o.planId !== 'FREE').length

  async function handleSetPlan(orgId: string, plan: SubscriptionPlan) {
    const key = `${orgId}-${plan}`
    setLoading(key)
    setError(null)
    try {
      await adminSetPlan(orgId, plan)
      setOrgs((prev) => prev.map((o) => (o.id === orgId ? { ...o, planId: plan } : o)))
    } catch {
      setError('Failed to update plan — check server logs')
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: 'Organisations', value: orgs.length, icon: UsersIcon },
          { label: 'Paid Plans', value: proCount, icon: TrendingUpIcon },
          { label: 'Total Invoices', value: totalInvoices, icon: FileTextIcon },
          { label: 'Total Clients', value: totalClients, icon: UsersIcon },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-xl border border-gray-800 bg-gray-900 p-4">
            <div className="flex items-center gap-2 text-gray-400 mb-2">
              <Icon className="size-4" />
              <span className="text-xs font-medium">{label}</span>
            </div>
            <p className="text-2xl font-bold tabular-nums text-white">{value}</p>
          </div>
        ))}
      </div>

      {error && (
        <div className="rounded-lg border border-red-800 bg-red-900/30 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* Orgs table */}
      <div className="rounded-xl border border-gray-800 bg-gray-900 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-800">
          <h2 className="font-semibold text-white">Organisations</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 bg-gray-900/60">
                {['Organisation', 'Plan', 'Sub Status', 'Invoices', 'Clients', 'Joined', 'Change Plan'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-400 whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {orgs.map((org) => (
                <tr key={org.id} className="border-b border-gray-800/60 last:border-0 hover:bg-gray-800/30 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-white">{org.name}</p>
                    <p className="text-xs text-gray-500 font-mono mt-0.5">{org.id}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${PLAN_STYLES[org.planId]}`}>
                      {org.planId}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400">
                    {org.subscriptionStatus ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-gray-300">{org._count.invoices}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-gray-300">{org._count.clients}</td>
                  <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
                    {new Date(org.createdAt).toLocaleDateString('en-GB')}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1.5 flex-wrap">
                      {PLANS.filter((p) => p !== org.planId).map((plan) => {
                        const key = `${org.id}-${plan}`
                        return (
                          <button
                            key={plan}
                            disabled={loading === key}
                            onClick={() => handleSetPlan(org.id, plan)}
                            className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-50 ${PLAN_BTN[plan]}`}
                          >
                            {loading === key ? <Loader2Icon className="size-3 animate-spin" /> : null}
                            {plan}
                          </button>
                        )
                      })}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

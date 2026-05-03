'use client'

import { useState, useTransition } from 'react'
import { CheckCircle2 } from 'lucide-react'
import { updatePlanLimits } from '@/lib/actions/admin'
import type { PlanLimits } from '@/lib/constants'
import type { SubscriptionPlan } from '@prisma/client'

interface Props {
  free: PlanLimits
  pro: PlanLimits
  enterprise: PlanLimits
}

type PlanKey = 'FREE' | 'PRO' | 'ENTERPRISE'

const PLAN_META: Record<PlanKey, { label: string; color: string; ring: string }> = {
  FREE: { label: 'Free', color: 'text-gray-300', ring: 'ring-gray-700' },
  PRO: { label: 'Pro', color: 'text-blue-300', ring: 'ring-blue-700' },
  ENTERPRISE: { label: 'Enterprise', color: 'text-purple-300', ring: 'ring-purple-700' },
}

const NUM_ROWS: { key: keyof PlanLimits; label: string; hint: string }[] = [
  { key: 'invoices', label: 'Invoices / month', hint: '-1 = unlimited' },
  { key: 'clients', label: 'Clients', hint: '-1 = unlimited' },
  { key: 'products', label: 'Products', hint: '-1 = unlimited' },
  { key: 'members', label: 'Team members', hint: '-1 = unlimited' },
]

const BOOL_ROWS: { key: keyof PlanLimits; label: string }[] = [
  { key: 'apiAccess', label: 'API access' },
  { key: 'customTemplates', label: 'Custom PDF templates' },
  { key: 'recurringInvoices', label: 'Recurring invoices' },
]

function PlanColumn({
  planKey,
  limits,
  onChange,
  onSave,
  saving,
  saved,
  error,
}: {
  planKey: PlanKey
  limits: PlanLimits
  onChange: (k: keyof PlanLimits, v: number | boolean) => void
  onSave: () => void
  saving: boolean
  saved: boolean
  error: string | null
}) {
  const meta = PLAN_META[planKey]

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className={`inline-flex self-start items-center rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${meta.color} ${meta.ring} bg-transparent`}>
        {meta.label}
      </div>

      {/* Numeric fields */}
      <div className="space-y-3">
        {NUM_ROWS.map(({ key, label, hint }) => (
          <div key={key}>
            <label className="mb-1 block text-xs font-medium text-gray-400">{label}</label>
            <input
              type="number"
              value={(limits[key] as number)}
              onChange={(e) => onChange(key, Number(e.target.value))}
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm text-gray-100 tabular-nums outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
            />
            <p className="mt-0.5 text-[11px] text-gray-600">{hint}</p>
          </div>
        ))}
      </div>

      {/* Boolean toggles */}
      <div className="space-y-2.5">
        {BOOL_ROWS.map(({ key, label }) => (
          <label key={key} className="flex cursor-pointer items-center gap-2.5">
            <input
              type="checkbox"
              checked={limits[key] as boolean}
              onChange={(e) => onChange(key, e.target.checked)}
              className="h-4 w-4 rounded border-gray-600 bg-gray-800 accent-red-600"
            />
            <span className="text-xs text-gray-400">{label}</span>
          </label>
        ))}
      </div>

      {/* Save */}
      <div className="space-y-1.5 pt-1">
        <button
          onClick={onSave}
          disabled={saving}
          className="w-full rounded-lg bg-gray-800 px-3 py-2 text-xs font-semibold text-gray-200 transition-colors hover:bg-gray-700 disabled:opacity-60 border border-gray-700"
        >
          {saving ? 'Saving…' : `Save ${meta.label}`}
        </button>
        {saved && (
          <p className="flex items-center gap-1 text-[11px] text-green-400">
            <CheckCircle2 className="h-3 w-3" /> Saved
          </p>
        )}
        {error && <p className="text-[11px] text-red-400">{error}</p>}
      </div>
    </div>
  )
}

export function PlanLimitsForm({ free, pro, enterprise }: Props) {
  const [limits, setLimits] = useState<Record<PlanKey, PlanLimits>>({
    FREE: free,
    PRO: pro,
    ENTERPRISE: enterprise,
  })
  const [saving, setSaving] = useState<PlanKey | null>(null)
  const [saved, setSaved] = useState<PlanKey | null>(null)
  const [errors, setErrors] = useState<Record<PlanKey, string | null>>({
    FREE: null,
    PRO: null,
    ENTERPRISE: null,
  })
  const [, startTransition] = useTransition()

  function handleChange(plan: PlanKey, key: keyof PlanLimits, value: number | boolean) {
    setLimits((prev) => ({
      ...prev,
      [plan]: { ...prev[plan], [key]: value },
    }))
  }

  function handleSave(plan: PlanKey) {
    setSaving(plan)
    setSaved(null)
    setErrors((e) => ({ ...e, [plan]: null }))
    startTransition(async () => {
      try {
        await updatePlanLimits(plan as SubscriptionPlan, limits[plan])
        setSaved(plan)
        setTimeout(() => setSaved(null), 3000)
      } catch {
        setErrors((e) => ({ ...e, [plan]: 'Save failed.' }))
      } finally {
        setSaving(null)
      }
    })
  }

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
      <div className="grid gap-8 sm:grid-cols-3">
        {(['FREE', 'PRO', 'ENTERPRISE'] as PlanKey[]).map((plan) => (
          <PlanColumn
            key={plan}
            planKey={plan}
            limits={limits[plan]}
            onChange={(k, v) => handleChange(plan, k, v)}
            onSave={() => handleSave(plan)}
            saving={saving === plan}
            saved={saved === plan}
            error={errors[plan]}
          />
        ))}
      </div>

      <p className="mt-6 border-t border-gray-800 pt-4 text-xs text-gray-600">
        Changes apply to new limit checks immediately. Existing over-quota users are not affected until their next action.
      </p>
    </div>
  )
}

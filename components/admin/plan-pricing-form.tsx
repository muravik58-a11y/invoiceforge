'use client'

import { useState, useTransition } from 'react'
import { RefreshCwIcon, SaveIcon, CheckCircle2Icon } from 'lucide-react'
import { syncPricesFromStripe, updatePlanPrices } from '@/lib/actions/admin'
import type { PlanPrices } from '@/lib/actions/admin'
import { Button } from '@/components/ui/button'

interface Props {
  prices: PlanPrices
}

function penceToPounds(pence: number): string {
  if (pence < 0) return 'Custom'
  return `£${(pence / 100).toFixed(0)}`
}

function poundsToPence(pounds: string): number {
  const num = parseFloat(pounds)
  if (isNaN(num)) return 0
  return Math.round(num * 100)
}

export function PlanPricingForm({ prices: initial }: Props) {
  const [prices, setPrices] = useState<PlanPrices>(initial)
  const [saving, setSaving] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave() {
    setSaving(true)
    setError(null)
    setSaved(false)
    try {
      await updatePlanPrices(prices)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch {
      setError('Failed to save prices')
    } finally {
      setSaving(false)
    }
  }

  async function handleSync() {
    setSyncing(true)
    setError(null)
    try {
      const synced = await syncPricesFromStripe()
      setPrices(synced)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch {
      setError('Failed to sync from Stripe — check server logs')
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Plan Pricing</h2>
          <p className="mt-1 text-sm text-gray-400">
            Prices in GBP per month. Enter the amount in pounds (e.g. 12 for £12/mo).
            Use -1 for &quot;Contact us&quot; pricing.
          </p>
        </div>
        <Button
          onClick={handleSync}
          disabled={syncing}
          variant="outline"
          size="sm"
          className="border-gray-700 text-gray-300 hover:bg-gray-800"
        >
          <RefreshCwIcon className={`mr-2 size-4 ${syncing ? 'animate-spin' : ''}`} />
          {syncing ? 'Syncing…' : 'Sync from Stripe'}
        </Button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-800 bg-red-900/30 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* Free */}
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-4 space-y-3">
          <div className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset text-gray-300 ring-gray-700 bg-transparent">
            Free
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-400">Price (£/mo)</label>
            <input
              type="number"
              value={prices.FREE === -1 ? -1 : prices.FREE / 100}
              onChange={(e) => setPrices((p) => ({ ...p, FREE: poundsToPence(e.target.value) }))}
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm text-gray-100 tabular-nums outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
            />
            <p className="mt-0.5 text-[11px] text-gray-600">Display: {penceToPounds(prices.FREE)}/mo</p>
          </div>
        </div>

        {/* Pro */}
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-4 space-y-3">
          <div className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset text-blue-300 ring-blue-700 bg-transparent">
            Pro
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-400">Price (£/mo)</label>
            <input
              type="number"
              value={prices.PRO === -1 ? -1 : prices.PRO / 100}
              onChange={(e) => setPrices((p) => ({ ...p, PRO: poundsToPence(e.target.value) }))}
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm text-gray-100 tabular-nums outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
            />
            <p className="mt-0.5 text-[11px] text-gray-600">Display: {penceToPounds(prices.PRO)}/mo</p>
          </div>
        </div>

        {/* Enterprise */}
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-4 space-y-3">
          <div className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset text-purple-300 ring-purple-700 bg-transparent">
            Enterprise
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-400">Price (£/mo)</label>
            <input
              type="number"
              value={prices.ENTERPRISE === -1 ? -1 : prices.ENTERPRISE / 100}
              onChange={(e) => setPrices((p) => ({ ...p, ENTERPRISE: poundsToPence(e.target.value) }))}
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm text-gray-100 tabular-nums outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
            />
            <p className="mt-0.5 text-[11px] text-gray-600">Display: {penceToPounds(prices.ENTERPRISE)}/mo</p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-red-600 hover:bg-red-700 text-white"
        >
          {saving ? (
            <RefreshCwIcon className="mr-2 size-4 animate-spin" />
          ) : saved ? (
            <CheckCircle2Icon className="mr-2 size-4" />
          ) : (
            <SaveIcon className="mr-2 size-4" />
          )}
          {saving ? 'Saving…' : saved ? 'Saved!' : 'Save prices'}
        </Button>
      </div>
    </div>
  )
}
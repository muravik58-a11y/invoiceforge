'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import {
  CheckIcon,
  ZapIcon,
  ShieldCheckIcon,
  BuildingIcon,
  ExternalLinkIcon,
  CreditCardIcon,
  Loader2Icon,
} from 'lucide-react'
import type { Organization } from '@prisma/client'

import { formatCurrency } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress, ProgressLabel, ProgressValue } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'

// ---------------------------------------------------------------------------
// Plan data
// ---------------------------------------------------------------------------

interface Plan {
  id: 'free' | 'pro' | 'enterprise'
  name: string
  price: number | null
  priceLabel: string
  description: string
  icon: React.ElementType
  badgeClass: string
  features: string[]
  limits: {
    invoices: number | null
    clients: number | null
    teamMembers: number | null
  }
  stripePriceId?: string
}

const PLANS: Plan[] = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    priceLabel: '£0/mo',
    description: 'For freelancers just getting started',
    icon: ZapIcon,
    badgeClass: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
    features: [
      'Up to 5 invoices per month',
      'Up to 3 clients',
      'PDF download',
      'Basic email sending',
      'VAT invoicing',
    ],
    limits: { invoices: 5, clients: 3, teamMembers: 1 },
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 1200,
    priceLabel: '£12/mo',
    description: 'For growing businesses and sole traders',
    icon: ShieldCheckIcon,
    badgeClass: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    features: [
      'Unlimited invoices',
      'Unlimited clients',
      'Recurring invoices',
      'Payment reminders',
      'VAT reports & MTD export',
      'Up to 5 team members',
      'Branded PDF templates',
      'Priority support',
    ],
    limits: { invoices: null, clients: null, teamMembers: 5 },
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: null,
    priceLabel: 'Custom',
    description: 'For agencies and accountancy firms',
    icon: BuildingIcon,
    badgeClass: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
    features: [
      'Everything in Pro',
      'Unlimited team members',
      'Multiple organisations',
      'Custom invoice templates',
      'Dedicated account manager',
      'SLA & uptime guarantee',
      'API access',
    ],
    limits: { invoices: null, clients: null, teamMembers: null },
  },
]

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface BillingSettingsProps {
  org: Organization
  currentPlan?: 'free' | 'pro' | 'enterprise'
  invoicesUsed?: number
  clientsUsed?: number
  stripePortalUrl?: string
}

// ---------------------------------------------------------------------------
// Usage meter
// ---------------------------------------------------------------------------

function UsageMeter({
  label,
  used,
  limit,
}: {
  label: string
  used: number
  limit: number | null
}) {
  const pct = limit == null ? 0 : Math.min(100, Math.round((used / limit) * 100))
  const isUnlimited = limit === null
  const isNearLimit = !isUnlimited && pct >= 80
  const isAtLimit = !isUnlimited && pct >= 100

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm mb-1">
        <span className={isAtLimit ? 'text-destructive' : isNearLimit ? 'text-amber-600 dark:text-amber-400' : ''}>
          {label}
        </span>
        <span className="text-muted-foreground text-xs">
          {isUnlimited ? 'Unlimited' : `${used} / ${limit}`}
        </span>
      </div>
      <Progress value={isUnlimited ? 0 : pct} className="h-2 w-full" />
      {isAtLimit && (
        <p className="text-xs text-destructive">Limit reached — upgrade to continue</p>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Plan feature list
// ---------------------------------------------------------------------------

function PlanFeatureList({ features }: { features: string[] }) {
  return (
    <ul className="space-y-1.5">
      {features.map((f) => (
        <li key={f} className="flex items-start gap-2 text-sm">
          <CheckIcon className="size-4 shrink-0 text-green-500 mt-0.5" />
          <span className="text-muted-foreground">{f}</span>
        </li>
      ))}
    </ul>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function BillingSettings({
  org,
  currentPlan = 'free',
  invoicesUsed = 0,
  clientsUsed = 0,
  stripePortalUrl,
}: BillingSettingsProps) {
  const router = useRouter()
  const [upgrading, setUpgrading] = React.useState<string | null>(null)
  const activePlan = PLANS.find((p) => p.id === currentPlan) ?? PLANS[0]!

  async function handleUpgrade(planId: string) {
    setUpgrading(planId)
    try {
      const res = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: planId.toUpperCase() }),
      })
      const data = await res.json()
      if (!res.ok || !data.url) {
        console.error('Checkout error:', data)
        alert(data.error ?? 'Failed to start checkout. Please try again.')
        return
      }
      router.push(data.url)
    } catch (err) {
      console.error(err)
      alert('Network error. Please try again.')
    } finally {
      setUpgrading(null)
    }
  }

  return (
    <div className="space-y-6">

      {/* ── Current plan ── */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle>Current Plan</CardTitle>
              <CardDescription className="mt-0.5">
                Your subscription for <strong>{org.name}</strong>
              </CardDescription>
            </div>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold ${activePlan.badgeClass}`}
            >
              <activePlan.icon className="size-4" />
              {activePlan.name}
            </span>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex flex-wrap items-center gap-4">
            <div>
              <p className="text-3xl font-bold tabular-nums">{activePlan.priceLabel}</p>
              <p className="text-sm text-muted-foreground mt-0.5">{activePlan.description}</p>
            </div>
            <div className="ml-auto flex gap-2">
              {stripePortalUrl && currentPlan !== 'free' && (
                <Button
                  variant="outline"
                  size="sm"
                  nativeButton={false} render={<a href={stripePortalUrl} target="_blank" rel="noopener noreferrer" />}
                >
                  <CreditCardIcon className="size-3.5" />
                  Manage Subscription
                  <ExternalLinkIcon className="size-3 opacity-60" />
                </Button>
              )}
              {currentPlan === 'free' && (
                <Button size="sm" onClick={() => handleUpgrade('pro')} disabled={upgrading === 'pro'}>
                  {upgrading === 'pro' ? <Loader2Icon className="size-3.5 animate-spin" /> : <ZapIcon className="size-3.5" />}
                  Upgrade to Pro
                </Button>
              )}
            </div>
          </div>

          <Separator />

          {/* ── Usage meters ── */}
          <div>
            <h3 className="text-sm font-semibold mb-3">Usage This Month</h3>
            <div className="space-y-4">
              <UsageMeter
                label="Invoices"
                used={invoicesUsed}
                limit={activePlan.limits.invoices}
              />
              <UsageMeter
                label="Clients"
                used={clientsUsed}
                limit={activePlan.limits.clients}
              />
              <UsageMeter
                label="Team Members"
                used={1}
                limit={activePlan.limits.teamMembers}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Plan comparison ── */}
      <Card>
        <CardHeader>
          <CardTitle>All Plans</CardTitle>
          <CardDescription>Compare plans and upgrade at any time</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {PLANS.map((plan) => {
              const isActive = plan.id === currentPlan
              return (
                <div
                  key={plan.id}
                  className={`rounded-xl border p-5 space-y-4 transition-colors ${
                    isActive
                      ? 'border-primary bg-primary/5'
                      : 'border-border bg-card hover:border-border/80'
                  }`}
                >
                  {/* Plan header */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${plan.badgeClass}`}
                      >
                        <plan.icon className="size-3" />
                        {plan.name}
                      </span>
                      {isActive && (
                        <Badge variant="default" className="text-xs">
                          Current
                        </Badge>
                      )}
                    </div>
                    <p className="text-2xl font-bold tabular-nums">{plan.priceLabel}</p>
                    <p className="text-xs text-muted-foreground mt-1">{plan.description}</p>
                  </div>

                  <Separator />

                  {/* Features */}
                  <PlanFeatureList features={plan.features} />

                  {/* CTA */}
                  {!isActive && (
                    <div className="pt-2">
                      {plan.id === 'enterprise' ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full"
                          nativeButton={false} render={<a href="mailto:sales@invoiceforge.uk" />}
                        >
                          Contact Sales
                        </Button>
                      ) : plan.id === 'free' ? (
                        <Button variant="outline" size="sm" className="w-full" disabled>
                          Downgrade
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          className="w-full"
                          onClick={() => handleUpgrade(plan.id)}
                          disabled={upgrading === plan.id}
                        >
                          {upgrading === plan.id
                            ? <Loader2Icon className="size-3.5 animate-spin" />
                            : null}
                          Upgrade to {plan.name}
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* ── Invoice history placeholder ── */}
      <Card>
        <CardHeader>
          <CardTitle>Billing History</CardTitle>
          <CardDescription>Your past subscription invoices from Stripe</CardDescription>
        </CardHeader>
        <CardContent>
          {currentPlan === 'free' ? (
            <div className="flex flex-col items-center justify-center py-10 text-muted-foreground text-sm gap-2">
              <CreditCardIcon className="size-8 opacity-40" />
              <p>No billing history — you are on the Free plan.</p>
              <p className="text-xs">Upgrade to Pro to start receiving invoices.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {/* Stripe invoice list would be rendered here via API */}
              <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3 text-sm">
                <div>
                  <p className="font-medium">Pro Plan — Monthly</p>
                  <p className="text-xs text-muted-foreground">1 Apr 2026</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-muted-foreground tabular-nums">{formatCurrency(12)}</span>
                  <Badge variant="secondary" className="text-xs">Paid</Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    nativeButton={false} render={<a href="#" download />}
                  >
                    <ExternalLinkIcon className="size-3.5" />
                  </Button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground text-center pt-2">
                Full billing history available in the{' '}
                {stripePortalUrl ? (
                  <a href={stripePortalUrl} className="underline hover:text-foreground" target="_blank" rel="noopener noreferrer">
                    Stripe Customer Portal
                  </a>
                ) : (
                  'Stripe Customer Portal'
                )}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

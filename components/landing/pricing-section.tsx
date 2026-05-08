'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Check } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface PricingTier {
  name: string
  price: string
  period: string
  tagline: string
  features: string[]
  cta: string
  highlighted: boolean
  href: string
}

interface PlanPrices {
  FREE: number
  PRO: number
  ENTERPRISE: number
}

function formatPrice(pence: number): string {
  if (pence < 0) return 'Custom'
  return `£${(pence / 100).toFixed(0)}`
}

const DEFAULT_PRICES: PlanPrices = { FREE: 0, PRO: 1200, ENTERPRISE: 4900 }

export function PricingSection() {
  const [prices, setPrices] = useState<PlanPrices>(DEFAULT_PRICES)

  useEffect(() => {
    fetch('/api/prices')
      .then((r) => r.json())
      .then((data) => setPrices(data))
      .catch(() => {/* use defaults */})
  }, [])

  const pricingTiers: PricingTier[] = [
    {
      name: 'Free',
      price: '£0',
      period: '/mo',
      tagline: 'Perfect for sole traders just getting started.',
      features: [
        '5 invoices per month',
        '1 user',
        'PDF generation',
        'UK VAT calculations',
        'Client management (up to 10)',
        'Email support',
      ],
      cta: 'Get started free',
      highlighted: false,
      href: '/sign-up',
    },
    {
      name: 'Pro',
      price: formatPrice(prices.PRO),
      period: '/mo',
      tagline: 'Everything a growing UK business needs.',
      features: [
        '100 invoices per month',
        '3 users',
        'Recurring invoices',
        'Inventory management',
        'Client CRM (unlimited)',
        'Financial reports',
        'Making Tax Digital export',
        'Priority email & chat support',
      ],
      cta: 'Start 14-day free trial',
      highlighted: true,
      href: '/sign-up',
    },
    {
      name: 'Enterprise',
      price: formatPrice(prices.ENTERPRISE),
      period: '/mo',
      tagline: 'Unlimited power for established UK businesses.',
      features: [
        'Unlimited invoices',
        'Unlimited users',
        'Everything in Pro',
        'Multi-company support',
        'Custom branding & domain',
        'API access',
        'Dedicated account manager',
        'Phone support',
      ],
      cta: prices.ENTERPRISE < 0 ? 'Contact sales' : 'Start 14-day free trial',
      highlighted: false,
      href: '/sign-up',
    },
  ]

  return (
    <section id="pricing" className="py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Honest pricing, no surprises
          </h2>
          <p className="mt-4 text-muted-foreground max-w-xl mx-auto">
            All prices include UK VAT. Downgrade or cancel any time — no lock-in contracts.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3 lg:items-start">
          {pricingTiers.map((tier) => (
            <Card
              key={tier.name}
              className={tier.highlighted ? 'ring-2 ring-primary shadow-xl shadow-primary/10 relative' : ''}
            >
              {tier.highlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-0.5 text-xs font-semibold text-primary-foreground shadow">
                  Most popular
                </div>
              )}
              <CardHeader className="pb-0">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-extrabold">{tier.price}</span>
                  <span className="text-muted-foreground text-sm">{tier.period}</span>
                </div>
                <CardTitle className="text-xl mt-1">{tier.name}</CardTitle>
                <CardDescription>{tier.tagline}</CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <ul className="space-y-2.5 mb-6">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  nativeButton={false} render={<Link href={tier.href} />}
                  className="w-full"
                  variant={tier.highlighted ? 'default' : 'outline'}
                >
                  {tier.cta}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <p className="mt-8 text-center text-xs text-muted-foreground">
          All plans include a 14-day money-back guarantee. Prices shown exclusive of VAT.
        </p>
      </div>
    </section>
  )
}
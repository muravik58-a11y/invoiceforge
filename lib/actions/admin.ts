'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import type { SubscriptionPlan } from '@prisma/client'
import {
  getAdminSession,
  makeSessionToken,
  setAdminSession,
  clearAdminSession,
} from '@/lib/admin-session'
import type { PlanLimits } from '@/lib/constants'

// ── Auth guard ────────────────────────────────────────────────────────────────

async function requireAdmin() {
  const session = await getAdminSession()
  if (!session) throw new Error('Unauthorized')
  return session.username
}

// ── Default plan limits ───────────────────────────────────────────────────────

const DEFAULT_LIMITS: Record<SubscriptionPlan, PlanLimits> = {
  FREE: {
    invoices: 5,
    clients: 5,
    products: 10,
    members: 1,
    apiAccess: false,
    customTemplates: false,
    recurringInvoices: false,
  },
  PRO: {
    invoices: 100,
    clients: 50,
    products: 200,
    members: 5,
    apiAccess: true,
    customTemplates: true,
    recurringInvoices: true,
  },
  ENTERPRISE: {
    invoices: -1,
    clients: -1,
    products: -1,
    members: -1,
    apiAccess: true,
    customTemplates: true,
    recurringInvoices: true,
  },
}

// ── Login / logout ────────────────────────────────────────────────────────────

export async function adminLogin(
  _prev: { error: string } | null,
  formData: FormData,
): Promise<{ error: string }> {
  const username = (formData.get('username') as string | null)?.trim() ?? ''
  const password = (formData.get('password') as string | null) ?? ''

  const validUsername = process.env.ADMIN_USERNAME
  const validPassword = process.env.ADMIN_PASSWORD

  if (!validUsername || !validPassword) {
    return { error: 'Admin credentials are not configured on the server.' }
  }
  if (username !== validUsername || password !== validPassword) {
    return { error: 'Invalid username or password.' }
  }

  const token = makeSessionToken(username)
  await setAdminSession(token)
  redirect('/admin/overview')
}

export async function adminLogout() {
  await clearAdminSession()
  redirect('/admin/login')
}

// ── Organisations ─────────────────────────────────────────────────────────────

export async function getAdminOrgs() {
  await requireAdmin()
  const orgs = await prisma.organization.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      clerkOrgId: true,
      planId: true,
      subscriptionStatus: true,
      stripeCustomerId: true,
      createdAt: true,
      _count: { select: { invoices: true, clients: true } },
    },
  })
  return orgs.map((o) => ({ ...o, createdAt: o.createdAt.toISOString() }))
}

export async function adminSetPlan(orgId: string, plan: SubscriptionPlan) {
  await requireAdmin()
  await prisma.organization.update({
    where: { id: orgId },
    data: {
      planId: plan,
      ...(plan === 'FREE' ? { subscriptionStatus: null, subscriptionId: null } : {}),
    },
  })
  revalidatePath('/', 'layout')
}

// ── Site config ───────────────────────────────────────────────────────────────

export async function getSiteConfig() {
  await requireAdmin()
  return prisma.siteConfig.upsert({
    where: { id: 'default' },
    create: {
      id: 'default',
      planLimitsFree: DEFAULT_LIMITS.FREE as object,
      planLimitsPro: DEFAULT_LIMITS.PRO as object,
      planLimitsEnterprise: DEFAULT_LIMITS.ENTERPRISE as object,
    },
    update: {},
  })
}

export interface SiteConfigUpdate {
  heroHeadline?: string
  heroSubheadline?: string
  maintenanceMode?: boolean
  newSignupsEnabled?: boolean
}

export async function updateSiteConfig(data: SiteConfigUpdate) {
  await requireAdmin()
  await prisma.siteConfig.upsert({
    where: { id: 'default' },
    create: {
      id: 'default',
      ...data,
      planLimitsFree: DEFAULT_LIMITS.FREE as object,
      planLimitsPro: DEFAULT_LIMITS.PRO as object,
      planLimitsEnterprise: DEFAULT_LIMITS.ENTERPRISE as object,
    },
    update: data,
  })
  revalidatePath('/')
  revalidatePath('/admin/settings')
}

export async function updatePlanLimits(plan: SubscriptionPlan, limits: PlanLimits) {
  await requireAdmin()
  const field =
    plan === 'FREE'
      ? 'planLimitsFree'
      : plan === 'PRO'
        ? 'planLimitsPro'
        : 'planLimitsEnterprise'

  await prisma.siteConfig.upsert({
    where: { id: 'default' },
    create: {
      id: 'default',
      planLimitsFree: DEFAULT_LIMITS.FREE as object,
      planLimitsPro: DEFAULT_LIMITS.PRO as object,
      planLimitsEnterprise: DEFAULT_LIMITS.ENTERPRISE as object,
      [field]: limits as object,
    },
    update: { [field]: limits as object },
  })
  revalidatePath('/admin/plans')
}

// ── Plan pricing ──────────────────────────────────────────────────────────────

export interface PlanPrices {
  /** Price in pence per month. 0 = free, -1 = custom/contact */
  FREE: number
  PRO: number
  ENTERPRISE: number
}

const DEFAULT_PRICES: PlanPrices = {
  FREE: 0,
  PRO: 1200, // £12/mo
  ENTERPRISE: 4900, // £49/mo
}

/**
 * Fetch the current plan prices from SiteConfig.
 * Falls back to defaults if not yet set.
 */
export async function getPlanPrices(): Promise<PlanPrices> {
  const config = await prisma.siteConfig.findUnique({ where: { id: 'default' } })
  if (config?.planPrices && typeof config.planPrices === 'object') {
    const p = config.planPrices as Record<string, unknown>
    return {
      FREE: typeof p.FREE === 'number' ? p.FREE : 0,
      PRO: typeof p.PRO === 'number' ? p.PRO : DEFAULT_PRICES.PRO,
      ENTERPRISE: typeof p.ENTERPRISE === 'number' ? p.ENTERPRISE : DEFAULT_PRICES.ENTERPRISE,
    }
  }
  return DEFAULT_PRICES
}

/**
 * Manually update plan prices (admin override).
 */
export async function updatePlanPrices(prices: PlanPrices) {
  await requireAdmin()
  await prisma.siteConfig.upsert({
    where: { id: 'default' },
    create: {
      id: 'default',
      planLimitsFree: DEFAULT_LIMITS.FREE as object,
      planLimitsPro: DEFAULT_LIMITS.PRO as object,
      planLimitsEnterprise: DEFAULT_LIMITS.ENTERPRISE as object,
      planPrices: prices as object,
    },
    update: { planPrices: prices as object },
  })
  revalidatePath('/admin/plans')
  revalidatePath('/')
  revalidatePath('/settings/billing')
}

/**
 * Sync plan prices from Stripe.
 * Reads the active price for each configured price ID and stores the amount in pence.
 */
export async function syncPricesFromStripe(): Promise<PlanPrices> {
  await requireAdmin()

  const { getStripe, PRICE_IDS } = await import('@/lib/stripe')
  const stripe = getStripe()

  const prices: PlanPrices = { FREE: 0, PRO: 0, ENTERPRISE: 0 }

  for (const plan of ['PRO', 'ENTERPRISE'] as const) {
    const priceId = PRICE_IDS[plan]
    if (!priceId) {
      prices[plan] = plan === 'PRO' ? DEFAULT_PRICES.PRO : DEFAULT_PRICES.ENTERPRISE
      continue
    }

    try {
      const price = await stripe.prices.retrieve(priceId)
      // Stripe stores amount in smallest currency unit (pence for GBP)
      prices[plan] = price.unit_amount ?? 0
    } catch (err) {
      console.error(`[syncPricesFromStripe] Failed to fetch price for ${plan}:`, err)
      prices[plan] = plan === 'PRO' ? DEFAULT_PRICES.PRO : DEFAULT_PRICES.ENTERPRISE
    }
  }

  // Save to DB
  await prisma.siteConfig.upsert({
    where: { id: 'default' },
    create: {
      id: 'default',
      planLimitsFree: DEFAULT_LIMITS.FREE as object,
      planLimitsPro: DEFAULT_LIMITS.PRO as object,
      planLimitsEnterprise: DEFAULT_LIMITS.ENTERPRISE as object,
      planPrices: prices as object,
    },
    update: { planPrices: prices as object },
  })

  revalidatePath('/admin/plans')
  revalidatePath('/')
  revalidatePath('/settings/billing')

  return prices
}

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

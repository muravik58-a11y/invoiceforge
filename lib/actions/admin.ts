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
  heroBadgeText?: string
  features?: object
  testimonials?: object
  faqs?: object
  ctaHeadline?: string
  ctaSubheadline?: string
  footerText?: string
  footerLinks?: object // JSON array of { label, href }[]
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

// ── Legal pages ───────────────────────────────────────────────────────────────

export interface LegalPageData {
  slug: string
  title: string
  content: string
  isPublished: boolean
}

const DEFAULT_LEGAL_PAGES: LegalPageData[] = [
  {
    slug: 'terms',
    title: 'Terms of Service',
    content: `<h2>1. Acceptance of Terms</h2>
<p>By accessing and using InvoiceForge UK ("Service"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, you may not access or use the Service.</p>

<h2>2. Description of Service</h2>
<p>InvoiceForge UK provides online invoicing, inventory management, and financial reporting tools designed for UK businesses. We reserve the right to modify, suspend, or discontinue any part of the Service at any time.</p>

<h2>3. User Accounts</h2>
<p>You must register for an account to use the Service. You are responsible for maintaining the confidentiality of your login credentials and for all activities that occur under your account. You must notify us immediately of any unauthorised use of your account.</p>

<h2>4. Acceptable Use</h2>
<p>You agree not to use the Service for any unlawful purpose, or in any way that could damage, disable, or impair the Service. You must not attempt to gain unauthorised access to any part of the Service or its related systems.</p>

<h2>5. Data &amp; Ownership</h2>
<p>You retain full ownership of all data you input into the Service. InvoiceForge UK does not claim any ownership rights over your invoices, client data, or financial records. We process your data in accordance with our Privacy Policy and applicable UK data protection laws.</p>

<h2>6. Billing &amp; Payments</h2>
<p>Paid plans are billed monthly or annually in advance. All prices are in GBP and include VAT where applicable. You may cancel your subscription at any time; access will continue until the end of the current billing period. Refunds are provided at our discretion.</p>

<h2>7. Termination</h2>
<p>We may suspend or terminate your access to the Service at any time for breach of these Terms. Upon termination, you may export your data within 30 days, after which we may delete your account data.</p>

<h2>8. Limitation of Liability</h2>
<p>InvoiceForge UK provides the Service "as is" without warranties of any kind. To the fullest extent permitted by law, we shall not be liable for any indirect, incidental, or consequential damages arising from your use of the Service.</p>

<h2>9. Governing Law</h2>
<p>These Terms are governed by the laws of England and Wales. Any disputes shall be subject to the exclusive jurisdiction of the courts of England and Wales.</p>`,
    isPublished: false,
  },
  {
    slug: 'privacy',
    title: 'Privacy Policy',
    content: `<h2>1. Introduction</h2>
<p>InvoiceForge UK ("we", "us", "our") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our Service.</p>

<h2>2. Information We Collect</h2>
<p>We collect information that you provide directly to us, including:</p>
<ul>
<li>Account information (name, email address, password)</li>
<li>Business information (company name, address, VAT number)</li>
<li>Financial data (invoices, payment records, client details)</li>
<li>Usage data (how you interact with the Service)</li>
</ul>

<h2>3. How We Use Your Information</h2>
<p>We use your information to provide, maintain, and improve the Service, process transactions, send you technical notices and support messages, and respond to your comments and questions.</p>

<h2>4. Data Storage &amp; Security</h2>
<p>Your data is stored on secure servers within the EU/UK region. We implement industry-standard security measures including encryption at rest and in transit, regular security audits, and access controls.</p>

<h2>5. Data Sharing</h2>
<p>We do not sell your personal data. We may share your data with: service providers who assist in our operations (e.g., payment processors), law enforcement when required by law, and professional advisors.</p>

<h2>6. Your Rights</h2>
<p>Under UK GDPR and the Data Protection Act 2018, you have the right to access, correct, delete, and port your personal data. You may also object to or restrict certain processing activities. To exercise these rights, contact us at privacy@invoiceforge.co.uk.</p>

<h2>7. Data Retention</h2>
<p>We retain your personal data for as long as your account is active or as needed to provide you services. Upon account deletion, we will remove your data within 30 days, except where we are required to retain it by law.</p>

<h2>8. Contact</h2>
<p>If you have questions about this Privacy Policy, please contact us at privacy@invoiceforge.co.uk.</p>`,
    isPublished: false,
  },
  {
    slug: 'cookies',
    title: 'Cookie Policy',
    content: `<h2>1. What Are Cookies?</h2>
<p>Cookies are small text files stored on your device when you visit our website. They help us provide you with a better experience by remembering your preferences and understanding how you use our Service.</p>

<h2>2. How We Use Cookies</h2>
<p>We use cookies for the following purposes:</p>
<ul>
<li><strong>Essential cookies:</strong> Required for the Service to function (e.g., authentication, security)</li>
<li><strong>Analytics cookies:</strong> Help us understand how users interact with the Service (e.g., page views, feature usage)</li>
<li><strong>Preference cookies:</strong> Remember your settings and customisations (e.g., theme, language)</li>
</ul>

<h2>3. Third-Party Cookies</h2>
<p>We may use third-party services that set their own cookies, including payment processors (Stripe) and analytics providers. These third parties have their own cookie policies.</p>

<h2>4. Managing Cookies</h2>
<p>You can control and manage cookies through your browser settings. Most browsers allow you to block or delete cookies. Please note that disabling certain cookies may affect the functionality of the Service.</p>

<h2>5. Updates</h2>
<p>We may update this Cookie Policy from time to time. Any changes will be posted on this page with an updated revision date.</p>`,
    isPublished: false,
  },
  {
    slug: 'gdpr',
    title: 'GDPR Compliance',
    content: `<h2>1. Our Commitment to GDPR</h2>
<p>InvoiceForge UK is fully committed to compliance with the General Data Protection Regulation (GDPR) and the UK Data Protection Act 2018. We have implemented comprehensive measures to protect your personal data.</p>

<h2>2. Lawful Basis for Processing</h2>
<p>We process your personal data only where we have a lawful basis, including:</p>
<ul>
<li><strong>Contractual necessity:</strong> To provide the invoicing and business management services you have signed up for</li>
<li><strong>Legal obligation:</strong> To comply with UK tax and financial regulations</li>
<li><strong>Legitimate interest:</strong> To improve our Service and communicate with you about your account</li>
<li><strong>Consent:</strong> Where you have given explicit consent for specific processing activities</li>
</ul>

<h2>3. Data Protection Officer</h2>
<p>We have appointed a Data Protection Officer who oversees our data protection practices. You can contact them at dpo@invoiceforge.co.uk.</p>

<h2>4. Data Processing Agreement</h2>
<p>For business customers who require a Data Processing Agreement (DPA), we provide a standard DPA that meets GDPR requirements. Contact us at legal@invoiceforge.co.uk to request a DPA.</p>

<h2>5. International Transfers</h2>
<p>Your data is stored and processed within the EU/UK. We do not transfer personal data outside the EEA unless adequate safeguards are in place, such as Standard Contractual Clauses approved by the European Commission.</p>

<h2>6. Breach Notification</h2>
<p>In the event of a personal data breach, we will notify the ICO and affected data subjects within 72 hours as required by GDPR Article 33 and Article 34.</p>

<h2>7. Your Rights</h2>
<p>Under GDPR, you have the following rights:</p>
<ul>
<li>Right of access (Article 15)</li>
<li>Right to rectification (Article 16)</li>
<li>Right to erasure (Article 17)</li>
<li>Right to restrict processing (Article 18)</li>
<li>Right to data portability (Article 20)</li>
<li>Right to object (Article 21)</li>
<li>Rights regarding automated decision-making (Article 22)</li>
</ul>
<p>To exercise any of these rights, contact us at privacy@invoiceforge.co.uk.</p>`,
    isPublished: false,
  },
]

export async function getLegalPages(): Promise<LegalPageData[]> {
  await requireAdmin()
  let pages = await prisma.legalPage.findMany({ orderBy: { slug: 'asc' } })

  // Seed default pages if none exist
  if (pages.length === 0) {
    await prisma.legalPage.createMany({
      data: DEFAULT_LEGAL_PAGES.map((p) => ({ ...p, siteConfigId: 'default' })),
    })
    pages = await prisma.legalPage.findMany({ orderBy: { slug: 'asc' } })
  }

  return pages.map((p) => ({
    slug: p.slug,
    title: p.title,
    content: p.content,
    isPublished: p.isPublished,
  }))
}

export async function getLegalPageBySlug(slug: string): Promise<LegalPageData | null> {
  const page = await prisma.legalPage.findUnique({ where: { slug } })
  if (!page) return null
  return {
    slug: page.slug,
    title: page.title,
    content: page.content,
    isPublished: page.isPublished,
  }
}

export async function getPublishedLegalPage(slug: string) {
  const page = await prisma.legalPage.findUnique({ where: { slug } })
  if (!page || !page.isPublished) return null
  return {
    slug: page.slug,
    title: page.title,
    content: page.content,
  }
}

export async function upsertLegalPage(data: LegalPageData) {
  await requireAdmin()
  await prisma.legalPage.upsert({
    where: { slug: data.slug },
    create: {
      slug: data.slug,
      title: data.title,
      content: data.content,
      isPublished: data.isPublished,
      siteConfigId: 'default',
    },
    update: {
      title: data.title,
      content: data.content,
      isPublished: data.isPublished,
    },
  })
  revalidatePath(`/admin/legal`)
  revalidatePath(`/${data.slug}`)
  revalidatePath('/')
}

export async function deleteLegalPage(slug: string) {
  await requireAdmin()
  await prisma.legalPage.delete({ where: { slug } })
  revalidatePath('/admin/legal')
  revalidatePath(`/${slug}`)
  revalidatePath('/')
}

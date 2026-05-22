import { LandingPage, type FooterData, type LandingContent } from '@/components/landing/landing-page'
import { prisma } from '@/lib/prisma'

// Force dynamic rendering — all content is DB-driven
export const dynamic = 'force-dynamic'

const DEFAULT_FOOTER: FooterData = {
  footerText: 'Registered in England & Wales · ICO registered · GDPR compliant',
  linkGroups: [
    {
      title: 'Product',
      links: [
        { label: 'Features', href: '#features' },
        { label: 'Pricing', href: '#pricing' },
      ],
    },
    {
      title: 'Company',
      links: [
        { label: 'About', href: '#' },
        { label: 'Contact', href: '#' },
      ],
    },
  ],
  legalLinks: [
    { label: 'Privacy Policy', href: '/privacy' },
    { label: 'Terms of Service', href: '/terms' },
    { label: 'Cookie Policy', href: '/cookies' },
    { label: 'GDPR', href: '/gdpr' },
  ],
}

export default async function Page() {
  let footer = DEFAULT_FOOTER
  let landingContent: LandingContent | undefined

  try {
    const config = await prisma.siteConfig.findUnique({ where: { id: 'default' } })
    if (config) {
      if (config.footerText) {
        footer = { ...footer, footerText: config.footerText }
      }
      if (config.footerLinks && typeof config.footerLinks === 'object' && Array.isArray(config.footerLinks)) {
        const links = config.footerLinks as { title: string; links: { label: string; href: string }[] }[]
        if (links.length > 0) {
          footer = { ...footer, linkGroups: links }
        }
      }
      // Build landing content from DB config
      if (config.heroHeadline || config.features || config.testimonials || config.faqs) {
        landingContent = {
          heroBadgeText: config.heroBadgeText ?? 'HMRC-ready · Making Tax Digital compliant',
          heroHeadline: config.heroHeadline ?? 'Simple, compliant invoicing + inventory for UK businesses',
          heroSubheadline: config.heroSubheadline ?? 'Send professional, VAT-compliant invoices in minutes. Manage stock, chase late payers, and export HMRC-ready reports — all in one place built for the UK market.',
          features: config.features && typeof config.features === 'object' && Array.isArray(config.features)
            ? config.features as unknown as LandingContent['features']
            : undefined as unknown as LandingContent['features'],
          testimonials: config.testimonials && typeof config.testimonials === 'object' && Array.isArray(config.testimonials)
            ? config.testimonials as unknown as LandingContent['testimonials']
            : undefined as unknown as LandingContent['testimonials'],
          faqs: config.faqs && typeof config.faqs === 'object' && Array.isArray(config.faqs)
            ? config.faqs as unknown as LandingContent['faqs']
            : undefined as unknown as LandingContent['faqs'],
          ctaHeadline: config.ctaHeadline ?? 'Ready to take control of your invoicing?',
          ctaSubheadline: config.ctaSubheadline ?? 'Join thousands of UK businesses saving hours every month. Get started free — upgrade when you need to.',
        }
      }
    }

    // Fetch published legal pages for footer links
    const legalPages = await prisma.legalPage.findMany({
      where: { isPublished: true },
      select: { slug: true, title: true },
      orderBy: { title: 'asc' },
    })
    if (legalPages.length > 0) {
      footer = {
        ...footer,
        legalLinks: legalPages.map((p) => ({ label: p.title, href: `/${p.slug}` })),
      }
    }
  } catch {
    // Use defaults if DB not available
  }

  return <LandingPage footer={footer} content={landingContent} />
}
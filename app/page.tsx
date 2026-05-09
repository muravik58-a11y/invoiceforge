import { LandingPage, type FooterData } from '@/components/landing/landing-page'
import { prisma } from '@/lib/prisma'

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

  try {
    const config = await prisma.siteConfig.findUnique({ where: { id: 'default' } })
    if (config) {
      if (config.footerText) {
        footer = { ...footer, footerText: config.footerText }
      }
      if (config.footerLinks && typeof config.footerLinks === 'object') {
        const links = config.footerLinks as { title: string; links: { label: string; href: string }[] }[]
        if (Array.isArray(links) && links.length > 0) {
          footer = { ...footer, linkGroups: links }
        }
      }
    }
  } catch {
    // Use defaults if DB not available
  }

  return <LandingPage footer={footer} />
}
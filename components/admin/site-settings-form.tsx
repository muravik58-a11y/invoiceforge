'use client'

import { useState, useTransition } from 'react'
import { CheckCircle2, Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import { updateSiteConfig } from '@/lib/actions/admin'
import type { SiteConfig } from '@prisma/client'

interface FooterLinkGroup {
  title: string
  links: { label: string; href: string }[]
}

interface FeatureItem {
  icon: string
  title: string
  description: string
}

interface TestimonialItem {
  quote: string
  author: string
  role: string
  location: string
  stars: number
}

interface FaqItem {
  question: string
  answer: string
}

const ICON_OPTIONS = [
  'ShieldCheck', 'FileText', 'RefreshCcw', 'Users', 'Package', 'BarChart3',
  'Zap', 'Star', 'Heart', 'Globe', 'Lock', 'Clock',
]

interface Props {
  config: SiteConfig
}

function Toggle({
  id,
  checked,
  onChange,
  label,
  description,
}: {
  id: string
  checked: boolean
  onChange: (v: boolean) => void
  label: string
  description: string
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <label htmlFor={id} className="text-sm font-medium text-gray-200">
          {label}
        </label>
        <p className="mt-0.5 text-xs text-gray-500">{description}</p>
      </div>
      <button
        id={id}
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative mt-0.5 inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors ${
          checked ? 'bg-red-600' : 'bg-gray-700'
        }`}
      >
        <span
          className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
            checked ? 'translate-x-4' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  )
}

function Field({
  id,
  label,
  hint,
  children,
}: {
  id: string
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-gray-300">
        {label}
      </label>
      {children}
      {hint && <p className="mt-1.5 text-xs text-gray-600">{hint}</p>}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900">
      <div className="border-b border-gray-800 px-5 py-4">
        <h2 className="font-semibold text-white">{title}</h2>
      </div>
      <div className="space-y-5 p-5">{children}</div>
    </div>
  )
}

function CollapsibleSection({ title, defaultOpen = false, children }: { title: string; defaultOpen?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between border-b border-gray-800 px-5 py-4 text-left hover:bg-gray-800/50 transition-colors"
      >
        <h2 className="font-semibold text-white">{title}</h2>
        {open ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
      </button>
      {open && <div className="space-y-5 p-5">{children}</div>}
    </div>
  )
}

export function SiteSettingsForm({ config }: Props) {
  const [heroHeadline, setHeroHeadline] = useState(config.heroHeadline)
  const [heroSubheadline, setHeroSubheadline] = useState(config.heroSubheadline)
  const [heroBadgeText, setHeroBadgeText] = useState(config.heroBadgeText ?? 'HMRC-ready · Making Tax Digital compliant')

  // Features
  const defaultFeatures: FeatureItem[] = [
    { icon: 'ShieldCheck', title: 'UK VAT Compliant', description: 'Automatically calculate VAT at 20%, 5%, or 0% rates. Generate HMRC-ready VAT returns and stay fully compliant with Making Tax Digital requirements.' },
    { icon: 'FileText', title: 'Professional PDFs', description: 'Send beautifully branded invoices as PDFs in seconds. Customise with your logo, payment terms, and bank details — all formatted to UK standards.' },
    { icon: 'RefreshCcw', title: 'Recurring Invoices', description: 'Automate billing for retainer clients. Set up weekly, monthly, or custom schedules and let InvoiceForge handle the paperwork while you focus on work.' },
    { icon: 'Users', title: 'Client CRM', description: 'Keep all your client details, contact history, and outstanding balances in one place. Never chase a late payment without the full picture again.' },
    { icon: 'Package', title: 'Inventory Management', description: 'Track stock levels, set reorder alerts, and tie inventory directly to invoices. Perfect for product-based UK businesses of any size.' },
    { icon: 'BarChart3', title: 'Financial Reports', description: 'Profit & loss, aged debtors, VAT summaries, and cash-flow forecasts — all exportable to CSV for your accountant or HMRC submission.' },
  ]
  const [features, setFeatures] = useState<FeatureItem[]>(
    config.features && typeof config.features === 'object' && Array.isArray(config.features)
      ? (config.features as unknown as FeatureItem[])
      : defaultFeatures
  )

  // Testimonials
  const defaultTestimonials: TestimonialItem[] = [
    { quote: "InvoiceForge has completely transformed how I handle billing. The VAT calculations are spot-on and my accountant loves the MTD exports. Switched from spreadsheets six months ago and haven't looked back.", author: 'Sarah Mitchell', role: 'Freelance Graphic Designer', location: 'Manchester', stars: 5 },
    { quote: "We run a small plumbing company with five engineers and InvoiceForge handles everything — invoicing on-site from a tablet, inventory for parts, and the aged debtors report has genuinely improved our cash flow.", author: 'James Thornton', role: 'Director, Thornton & Sons Plumbing Ltd', location: 'Bristol', stars: 5 },
    { quote: "The recurring invoices feature alone saves me at least two hours a week. As a London-based marketing consultant with a mix of retainer and project clients, the flexibility of InvoiceForge is exactly what I needed.", author: 'Priya Kapoor', role: 'Marketing Consultant', location: 'London', stars: 5 },
  ]
  const [testimonials, setTestimonials] = useState<TestimonialItem[]>(
    config.testimonials && typeof config.testimonials === 'object' && Array.isArray(config.testimonials)
      ? (config.testimonials as unknown as TestimonialItem[])
      : defaultTestimonials
  )

  // FAQs
  const defaultFaqs: FaqItem[] = [
    { question: 'Is InvoiceForge UK Making Tax Digital (MTD) compliant?', answer: 'Yes. InvoiceForge UK is built with MTD for VAT in mind. You can export your VAT data in the HMRC-compatible format and submit directly through our MTD-bridging integration.' },
    { question: 'How does VAT calculation work?', answer: 'InvoiceForge automatically applies the correct UK VAT rate — 20% standard, 5% reduced, or 0% zero-rated — to each line item on your invoice. VAT summaries are included on every invoice.' },
    { question: 'Can I use InvoiceForge for both products and services?', answer: 'Absolutely. InvoiceForge supports mixed invoices containing both service line items and product lines drawn from your inventory.' },
    { question: 'Is my data stored securely in the UK?', answer: "Yes. All customer data is stored in EU/UK-region data centres and we are fully GDPR-compliant. Your invoices, client records, and financial data belong to you." },
    { question: 'Can I try InvoiceForge before paying?', answer: 'Yes. Our Free plan lets you send up to 5 invoices per month with no time limit. The Pro plan comes with a 14-day free trial with full access — no credit card required.' },
    { question: 'Does InvoiceForge integrate with accounting software?', answer: 'We offer CSV and PDF exports compatible with Xero, QuickBooks, Sage, and FreeAgent. A direct Xero API integration is on our roadmap for Q3 2026.' },
  ]
  const [faqs, setFaqs] = useState<FaqItem[]>(
    config.faqs && typeof config.faqs === 'object' && Array.isArray(config.faqs)
      ? (config.faqs as unknown as FaqItem[])
      : defaultFaqs
  )

  // CTA
  const [ctaHeadline, setCtaHeadline] = useState(config.ctaHeadline ?? 'Ready to take control of your invoicing?')
  const [ctaSubheadline, setCtaSubheadline] = useState(config.ctaSubheadline ?? 'Join thousands of UK businesses saving hours every month. Get started free — upgrade when you need to.')

  // Footer
  const [footerText, setFooterText] = useState(config.footerText ?? '')
  const [footerLinks, setFooterLinks] = useState<FooterLinkGroup[]>(
    config.footerLinks && typeof config.footerLinks === 'object' && Array.isArray(config.footerLinks)
      ? (config.footerLinks as unknown as FooterLinkGroup[])
      : [
          { title: 'Product', links: [{ label: 'Features', href: '#features' }, { label: 'Pricing', href: '#pricing' }] },
          { title: 'Company', links: [{ label: 'About', href: '#' }, { label: 'Contact', href: '#' }] },
        ],
  )
  const [maintenanceMode, setMaintenanceMode] = useState(config.maintenanceMode)
  const [newSignupsEnabled, setNewSignupsEnabled] = useState(config.newSignupsEnabled)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSave() {
    setError(null)
    setSaved(false)
    startTransition(async () => {
      try {
        await updateSiteConfig({
          heroHeadline,
          heroSubheadline,
          heroBadgeText,
          features: features as unknown as object,
          testimonials: testimonials as unknown as object,
          faqs: faqs as unknown as object,
          ctaHeadline,
          ctaSubheadline,
          footerText,
          footerLinks: footerLinks as unknown as object,
          maintenanceMode,
          newSignupsEnabled,
        })
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
      } catch {
        setError('Save failed — check server logs.')
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* Hero section */}
      <Section title="Hero Section">
        <Field
          id="heroBadgeText"
          label="Hero badge text"
          hint="Small label shown above the headline, e.g. &quot;HMRC-ready · Making Tax Digital compliant&quot;"
        >
          <input
            id="heroBadgeText"
            value={heroBadgeText}
            onChange={(e) => setHeroBadgeText(e.target.value)}
            className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
          />
        </Field>

        <Field
          id="heroHeadline"
          label="Hero headline"
          hint="Shown as the main H1 on the homepage."
        >
          <input
            id="heroHeadline"
            value={heroHeadline}
            onChange={(e) => setHeroHeadline(e.target.value)}
            className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
          />
        </Field>

        <Field
          id="heroSubheadline"
          label="Hero subheadline"
          hint="Shown beneath the headline — keep under 180 characters."
        >
          <textarea
            id="heroSubheadline"
            rows={3}
            value={heroSubheadline}
            onChange={(e) => setHeroSubheadline(e.target.value)}
            className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
          />
        </Field>
      </Section>

      {/* Features */}
      <CollapsibleSection title="Features" defaultOpen={false}>
        <p className="text-xs text-gray-600 mb-3">Each feature card has an icon, title, and description. Icons use Lucide icon names.</p>
        <div className="space-y-4">
          {features.map((f, i) => (
            <div key={i} className="rounded-lg border border-gray-700 bg-gray-800/50 p-3">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs text-gray-500 w-6">{i + 1}.</span>
                <select
                  value={f.icon}
                  onChange={(e) => {
                    const updated = [...features]
                    updated[i] = { ...updated[i], icon: e.target.value }
                    setFeatures(updated)
                  }}
                  className="rounded border border-gray-600 bg-gray-800 px-2 py-1 text-xs text-gray-100 outline-none focus:border-red-500"
                >
                  {ICON_OPTIONS.map((icon) => (
                    <option key={icon} value={icon}>{icon}</option>
                  ))}
                </select>
                <input
                  value={f.title}
                  onChange={(e) => {
                    const updated = [...features]
                    updated[i] = { ...updated[i], title: e.target.value }
                    setFeatures(updated)
                  }}
                  placeholder="Feature title"
                  className="flex-1 rounded border border-gray-600 bg-gray-800 px-2 py-1 text-sm text-gray-100 outline-none focus:border-red-500"
                />
                <button
                  onClick={() => setFeatures(features.filter((_, j) => j !== i))}
                  className="flex h-7 w-7 items-center justify-center rounded text-gray-500 hover:bg-red-900/30 hover:text-red-400"
                  title="Remove feature"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
              <textarea
                value={f.description}
                onChange={(e) => {
                  const updated = [...features]
                  updated[i] = { ...updated[i], description: e.target.value }
                  setFeatures(updated)
                }}
                rows={2}
                placeholder="Feature description"
                className="w-full rounded border border-gray-600 bg-gray-800 px-2 py-1 text-xs text-gray-100 outline-none focus:border-red-500"
              />
            </div>
          ))}
          <button
            onClick={() => setFeatures([...features, { icon: 'Zap', title: '', description: '' }])}
            className="flex items-center gap-1.5 rounded-lg border border-dashed border-gray-700 px-3 py-2 text-xs text-gray-500 hover:border-gray-500 hover:text-gray-300"
          >
            <Plus className="h-3.5 w-3.5" /> Add feature
          </button>
        </div>
      </CollapsibleSection>

      {/* Testimonials */}
      <CollapsibleSection title="Testimonials" defaultOpen={false}>
        <p className="text-xs text-gray-600 mb-3">Customer testimonials shown on the landing page.</p>
        <div className="space-y-4">
          {testimonials.map((t, i) => (
            <div key={i} className="rounded-lg border border-gray-700 bg-gray-800/50 p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-500">Testimonial {i + 1}</span>
                <button
                  onClick={() => setTestimonials(testimonials.filter((_, j) => j !== i))}
                  className="flex h-7 w-7 items-center justify-center rounded text-gray-500 hover:bg-red-900/30 hover:text-red-400"
                  title="Remove testimonial"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
              <textarea
                value={t.quote}
                onChange={(e) => {
                  const updated = [...testimonials]
                  updated[i] = { ...updated[i], quote: e.target.value }
                  setTestimonials(updated)
                }}
                rows={3}
                placeholder="Quote"
                className="w-full rounded border border-gray-600 bg-gray-800 px-2 py-1 text-xs text-gray-100 outline-none focus:border-red-500 mb-2"
              />
              <div className="grid grid-cols-3 gap-2">
                <input
                  value={t.author}
                  onChange={(e) => {
                    const updated = [...testimonials]
                    updated[i] = { ...updated[i], author: e.target.value }
                    setTestimonials(updated)
                  }}
                  placeholder="Author name"
                  className="rounded border border-gray-600 bg-gray-800 px-2 py-1 text-xs text-gray-100 outline-none focus:border-red-500"
                />
                <input
                  value={t.role}
                  onChange={(e) => {
                    const updated = [...testimonials]
                    updated[i] = { ...updated[i], role: e.target.value }
                    setTestimonials(updated)
                  }}
                  placeholder="Role"
                  className="rounded border border-gray-600 bg-gray-800 px-2 py-1 text-xs text-gray-100 outline-none focus:border-red-500"
                />
                <input
                  value={t.location}
                  onChange={(e) => {
                    const updated = [...testimonials]
                    updated[i] = { ...updated[i], location: e.target.value }
                    setTestimonials(updated)
                  }}
                  placeholder="Location"
                  className="rounded border border-gray-600 bg-gray-800 px-2 py-1 text-xs text-gray-100 outline-none focus:border-red-500"
                />
              </div>
            </div>
          ))}
          <button
            onClick={() => setTestimonials([...testimonials, { quote: '', author: '', role: '', location: '', stars: 5 }])}
            className="flex items-center gap-1.5 rounded-lg border border-dashed border-gray-700 px-3 py-2 text-xs text-gray-500 hover:border-gray-500 hover:text-gray-300"
          >
            <Plus className="h-3.5 w-3.5" /> Add testimonial
          </button>
        </div>
      </CollapsibleSection>

      {/* FAQs */}
      <CollapsibleSection title="FAQ" defaultOpen={false}>
        <p className="text-xs text-gray-600 mb-3">Frequently asked questions shown on the landing page.</p>
        <div className="space-y-4">
          {faqs.map((faq, i) => (
            <div key={i} className="rounded-lg border border-gray-700 bg-gray-800/50 p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-500">Q{i + 1}</span>
                <button
                  onClick={() => setFaqs(faqs.filter((_, j) => j !== i))}
                  className="flex h-7 w-7 items-center justify-center rounded text-gray-500 hover:bg-red-900/30 hover:text-red-400"
                  title="Remove FAQ"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
              <input
                value={faq.question}
                onChange={(e) => {
                  const updated = [...faqs]
                  updated[i] = { ...updated[i], question: e.target.value }
                  setFaqs(updated)
                }}
                placeholder="Question"
                className="w-full rounded border border-gray-600 bg-gray-800 px-2 py-1 text-sm text-gray-100 outline-none focus:border-red-500 mb-2"
              />
              <textarea
                value={faq.answer}
                onChange={(e) => {
                  const updated = [...faqs]
                  updated[i] = { ...updated[i], answer: e.target.value }
                  setFaqs(updated)
                }}
                rows={2}
                placeholder="Answer"
                className="w-full rounded border border-gray-600 bg-gray-800 px-2 py-1 text-xs text-gray-100 outline-none focus:border-red-500"
              />
            </div>
          ))}
          <button
            onClick={() => setFaqs([...faqs, { question: '', answer: '' }])}
            className="flex items-center gap-1.5 rounded-lg border border-dashed border-gray-700 px-3 py-2 text-xs text-gray-500 hover:border-gray-500 hover:text-gray-300"
          >
            <Plus className="h-3.5 w-3.5" /> Add FAQ
          </button>
        </div>
      </CollapsibleSection>

      {/* CTA section */}
      <CollapsibleSection title="CTA Banner" defaultOpen={false}>
        <Field
          id="ctaHeadline"
          label="CTA headline"
          hint="The main heading on the call-to-action banner at the bottom of the page."
        >
          <input
            id="ctaHeadline"
            value={ctaHeadline}
            onChange={(e) => setCtaHeadline(e.target.value)}
            className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
          />
        </Field>

        <Field
          id="ctaSubheadline"
          label="CTA subheadline"
          hint="Supporting text beneath the headline."
        >
          <textarea
            id="ctaSubheadline"
            rows={2}
            value={ctaSubheadline}
            onChange={(e) => setCtaSubheadline(e.target.value)}
            className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
          />
        </Field>
      </CollapsibleSection>

      {/* Footer */}
      <Section title="Footer">
        <Field
          id="footerText"
          label="Footer text"
          hint="Extra text shown below the footer links, e.g. company registration details."
        >
          <textarea
            id="footerText"
            rows={3}
            value={footerText}
            onChange={(e) => setFooterText(e.target.value)}
            placeholder="Registered in England & Wales · ICO registered · GDPR compliant"
            className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
          />
        </Field>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-300">Footer link columns</label>
          <p className="mb-3 text-xs text-gray-600">Each column appears in the site footer. Legal links (Terms, Privacy, etc.) are managed separately on the Legal Pages screen.</p>
          <div className="space-y-4">
            {footerLinks.map((group, gi) => (
              <div key={gi} className="rounded-lg border border-gray-700 bg-gray-800/50 p-3">
                <div className="flex items-center gap-2 mb-2">
                  <input
                    value={group.title}
                    onChange={(e) => {
                      const updated = [...footerLinks]
                      updated[gi] = { ...updated[gi], title: e.target.value }
                      setFooterLinks(updated)
                    }}
                    placeholder="Column title"
                    className="flex-1 rounded border border-gray-600 bg-gray-800 px-2 py-1 text-sm text-gray-100 outline-none focus:border-red-500"
                  />
                  <button
                    onClick={() => setFooterLinks(footerLinks.filter((_, i) => i !== gi))}
                    className="flex h-7 w-7 items-center justify-center rounded text-gray-500 hover:bg-red-900/30 hover:text-red-400"
                    title="Remove column"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                {group.links.map((link, li) => (
                  <div key={li} className="flex items-center gap-2 ml-2 mb-1.5">
                    <input
                      value={link.label}
                      onChange={(e) => {
                        const updated = [...footerLinks]
                        updated[gi] = {
                          ...updated[gi],
                          links: updated[gi].links.map((l, i) => i === li ? { ...l, label: e.target.value } : l),
                        }
                        setFooterLinks(updated)
                      }}
                      placeholder="Label"
                      className="w-28 rounded border border-gray-600 bg-gray-800 px-2 py-1 text-xs text-gray-100 outline-none focus:border-red-500"
                    />
                    <input
                      value={link.href}
                      onChange={(e) => {
                        const updated = [...footerLinks]
                        updated[gi] = {
                          ...updated[gi],
                          links: updated[gi].links.map((l, i) => i === li ? { ...l, href: e.target.value } : l),
                        }
                        setFooterLinks(updated)
                      }}
                      placeholder="URL (#features, /terms, https://...)"
                      className="flex-1 rounded border border-gray-600 bg-gray-800 px-2 py-1 text-xs text-gray-100 outline-none focus:border-red-500"
                    />
                    <button
                      onClick={() => {
                        const updated = [...footerLinks]
                        updated[gi] = {
                          ...updated[gi],
                          links: updated[gi].links.filter((_, i) => i !== li),
                        }
                        setFooterLinks(updated)
                      }}
                      className="flex h-6 w-6 items-center justify-center rounded text-gray-500 hover:bg-red-900/30 hover:text-red-400"
                      title="Remove link"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => {
                    const updated = [...footerLinks]
                    updated[gi] = {
                      ...updated[gi],
                      links: [...updated[gi].links, { label: '', href: '' }],
                    }
                    setFooterLinks(updated)
                  }}
                  className="ml-2 mt-1 flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300"
                >
                  <Plus className="h-3 w-3" /> Add link
                </button>
              </div>
            ))}
            <button
              onClick={() => setFooterLinks([...footerLinks, { title: '', links: [] }])}
              className="flex items-center gap-1.5 rounded-lg border border-dashed border-gray-700 px-3 py-2 text-xs text-gray-500 hover:border-gray-500 hover:text-gray-300"
            >
              <Plus className="h-3.5 w-3.5" /> Add column
            </button>
          </div>
        </div>
      </Section>

      {/* App controls */}
      <Section title="App Controls">
        <Toggle
          id="maintenanceMode"
          checked={maintenanceMode}
          onChange={setMaintenanceMode}
          label="Maintenance mode"
          description="When enabled, show a maintenance notice to non-admin visitors."
        />

        <div className="border-t border-gray-800" />

        <Toggle
          id="newSignupsEnabled"
          checked={newSignupsEnabled}
          onChange={setNewSignupsEnabled}
          label="New signups enabled"
          description="Allow new users to create accounts. Disable during incidents."
        />
      </Section>

      {/* Footer actions */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={isPending}
          className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-60"
        >
          {isPending ? 'Saving…' : 'Save changes'}
        </button>

        {saved && (
          <span className="flex items-center gap-1.5 text-sm text-green-400">
            <CheckCircle2 className="h-4 w-4" />
            Saved
          </span>
        )}

        {error && <span className="text-sm text-red-400">{error}</span>}
      </div>
    </div>
  )
}

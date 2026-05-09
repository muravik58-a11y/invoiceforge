'use client'

import { useState, useTransition } from 'react'
import { CheckCircle2, Plus, Trash2 } from 'lucide-react'
import { updateSiteConfig } from '@/lib/actions/admin'
import type { SiteConfig } from '@prisma/client'

interface FooterLinkGroup {
  title: string
  links: { label: string; href: string }[]
}

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

export function SiteSettingsForm({ config }: Props) {
  const [heroHeadline, setHeroHeadline] = useState(config.heroHeadline)
  const [heroSubheadline, setHeroSubheadline] = useState(config.heroSubheadline)
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
          footerText,
          footerLinks,
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
      {/* Landing page */}
      <Section title="Landing Page">
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

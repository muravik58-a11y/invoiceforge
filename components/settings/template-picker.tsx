'use client'

import { useState, useTransition } from 'react'
import { CheckCircle2, Lock, Sparkles } from 'lucide-react'
import Link from 'next/link'
import { updateOrgTemplate } from '@/lib/actions/organization'

type Template = 'modern' | 'classic' | 'branded'

interface Props {
  orgId: string
  current: Template
  brandColor: string
  isPro: boolean
}

// ── Visual mini-preview of each template ─────────────────────────────────────

function TemplateMiniPreview({ template, brandColor }: { template: Template; brandColor: string }) {
  const colour =
    template === 'classic'
      ? '#1C1C1C'
      : template === 'branded'
        ? (brandColor?.match(/^#[0-9A-Fa-f]{6}$/) ? brandColor : '#2563EB')
        : '#2563EB'

  return (
    <div className="h-32 w-full overflow-hidden rounded-lg border border-border bg-white p-2 font-mono text-[5px] leading-tight text-gray-800 shadow-sm">
      {/* Header bar */}
      <div className="mb-1.5 flex items-start justify-between">
        <div className="space-y-0.5">
          <div className="h-1.5 w-12 rounded-sm" style={{ backgroundColor: colour, opacity: 0.15 }} />
          <div className="h-1 w-8 rounded-sm bg-gray-200" />
          <div className="h-1 w-6 rounded-sm bg-gray-200" />
        </div>
        <div className="space-y-0.5 text-right">
          <div className="text-[6px] font-bold" style={{ color: colour }}>INVOICE</div>
          <div className="h-1 w-10 rounded-sm bg-gray-300" />
        </div>
      </div>

      {/* Divider */}
      <div className="mb-1.5 h-[1.5px] w-full" style={{ backgroundColor: colour }} />

      {/* Address boxes */}
      <div className="mb-1.5 flex gap-1">
        {[0, 1].map((i) => (
          <div
            key={i}
            className="flex-1 rounded p-1"
            style={{ backgroundColor: `${colour}12`, borderLeft: `2px solid ${colour}` }}
          >
            <div className="mb-0.5 h-0.5 w-6 rounded-sm" style={{ backgroundColor: colour }} />
            <div className="h-0.5 w-8 rounded-sm bg-gray-300" />
            <div className="h-0.5 w-5 rounded-sm bg-gray-200 mt-0.5" />
          </div>
        ))}
      </div>

      {/* Table header */}
      <div className="mb-0.5 flex gap-0.5 rounded px-1 py-0.5" style={{ backgroundColor: colour }}>
        {[3, 1, 1, 1].map((w, i) => (
          <div key={i} className="rounded-sm bg-white/40" style={{ flex: w, height: 3 }} />
        ))}
      </div>

      {/* Table rows */}
      {[1, 2].map((r) => (
        <div key={r} className="mb-0.5 flex gap-0.5 px-1 py-0.5" style={{ backgroundColor: r % 2 === 0 ? '#F9FAFB' : 'transparent' }}>
          {[3, 1, 1, 1].map((w, i) => (
            <div key={i} className="rounded-sm bg-gray-200" style={{ flex: w, height: 3 }} />
          ))}
        </div>
      ))}

      {/* Total row */}
      <div className="mt-1 ml-auto flex w-16 items-center justify-between rounded px-1 py-0.5" style={{ backgroundColor: colour }}>
        <div className="h-1.5 w-5 rounded-sm bg-white/60" />
        <div className="h-1.5 w-5 rounded-sm bg-white/60" />
      </div>
    </div>
  )
}

// ── Template card ─────────────────────────────────────────────────────────────

const TEMPLATES: { id: Template; label: string; description: string; proOnly: boolean }[] = [
  {
    id: 'modern',
    label: 'Modern',
    description: 'Clean blue accents with a structured layout. Works great for any business.',
    proOnly: false,
  },
  {
    id: 'classic',
    label: 'Classic',
    description: 'Minimal black & grey palette. Timeless and highly professional.',
    proOnly: true,
  },
  {
    id: 'branded',
    label: 'Branded',
    description: 'Uses your brand colour from Company Profile. Fully on-brand invoices.',
    proOnly: true,
  },
]

export function TemplatePicker({ orgId, current, brandColor, isPro }: Props) {
  const [selected, setSelected] = useState<Template>(current)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSave() {
    setError(null)
    setSaved(false)
    startTransition(async () => {
      try {
        await updateOrgTemplate(orgId, selected)
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
      } catch {
        setError('Failed to save — please try again.')
      }
    })
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        {TEMPLATES.map(({ id, label, description, proOnly }) => {
          const locked = proOnly && !isPro
          const isSelected = selected === id

          return (
            <button
              key={id}
              type="button"
              disabled={locked}
              onClick={() => !locked && setSelected(id)}
              className={[
                'relative flex flex-col gap-3 rounded-xl border-2 p-4 text-left transition-all',
                locked
                  ? 'cursor-not-allowed opacity-60'
                  : 'cursor-pointer hover:border-primary/50',
                isSelected && !locked
                  ? 'border-primary bg-primary/5 shadow-sm shadow-primary/10'
                  : 'border-border bg-card',
              ].join(' ')}
            >
              {/* Pro badge */}
              {proOnly && (
                <span className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                  {locked ? <Lock className="h-2.5 w-2.5" /> : <Sparkles className="h-2.5 w-2.5" />}
                  Pro
                </span>
              )}

              {/* Preview */}
              <TemplateMiniPreview template={id} brandColor={brandColor} />

              {/* Label */}
              <div>
                <p className="font-semibold text-foreground">{label}</p>
                <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">{description}</p>
              </div>

              {/* Selected tick */}
              {isSelected && !locked && (
                <CheckCircle2 className="absolute bottom-3 right-3 h-4 w-4 text-primary" />
              )}
            </button>
          )
        })}
      </div>

      {/* Upgrade nudge for Free users */}
      {!isPro && (
        <div className="flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 dark:border-blue-900 dark:bg-blue-950/30">
          <Sparkles className="h-4 w-4 shrink-0 text-blue-600" />
          <p className="text-sm text-blue-800 dark:text-blue-300">
            Classic and Branded templates are available on the{' '}
            <Link href="/settings/billing" className="font-semibold underline underline-offset-2">
              Pro plan
            </Link>
            .
          </p>
        </div>
      )}

      {/* Save */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={isPending || selected === current}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {isPending ? 'Saving…' : 'Save template'}
        </button>

        {saved && (
          <span className="flex items-center gap-1.5 text-sm text-green-600 dark:text-green-400">
            <CheckCircle2 className="h-4 w-4" />
            Saved
          </span>
        )}
        {error && <span className="text-sm text-destructive">{error}</span>}
      </div>
    </div>
  )
}

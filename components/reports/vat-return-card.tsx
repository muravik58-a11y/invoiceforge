import * as React from 'react'
import { cn } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface VatReturnCardProps {
  boxNumber: string
  label: string
  amount: number | null
  note?: string
  isManual?: boolean
  isHighlighted?: boolean
  className?: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatGBP(amount: number | null): string {
  if (amount === null) return '—'
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function VatReturnCard({
  boxNumber,
  label,
  amount,
  note,
  isManual = false,
  isHighlighted = false,
  className,
}: VatReturnCardProps) {
  return (
    <div
      className={cn(
        'rounded-xl border p-4 transition-colors',
        isHighlighted
          ? 'border-primary/30 bg-primary/5'
          : 'border-border bg-card',
        className,
      )}
    >
      {/* ── Box number badge ── */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <span
          className={cn(
            'inline-flex items-center justify-center rounded-md px-2 py-0.5 text-xs font-bold tabular-nums',
            isHighlighted
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground',
          )}
        >
          Box {boxNumber}
        </span>

        {isManual && (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
            Manual Entry
          </span>
        )}
      </div>

      {/* ── Label ── */}
      <p className="text-sm text-muted-foreground leading-snug mb-2">{label}</p>

      {/* ── Amount ── */}
      <p
        className={cn(
          'text-2xl font-bold tabular-nums tracking-tight',
          isHighlighted ? 'text-primary' : 'text-foreground',
          amount === null && 'text-muted-foreground text-xl',
        )}
      >
        {formatGBP(amount)}
      </p>

      {/* ── Note ── */}
      {note && (
        <p className="mt-2 text-xs text-muted-foreground leading-relaxed border-t border-border pt-2">
          {note}
        </p>
      )}
    </div>
  )
}

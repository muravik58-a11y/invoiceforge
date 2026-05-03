'use client'

import * as React from 'react'
import {
  startOfMonth,
  endOfMonth,
  subMonths,
  startOfQuarter,
  endOfQuarter,
  subQuarters,
  startOfYear,
  endOfYear,
  format,
  isValid,
  parseISO,
} from 'date-fns'
import { CalendarIcon, ChevronDownIcon } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Separator } from '@/components/ui/separator'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DateRange {
  from: Date
  to: Date
}

export type PresetKey =
  | 'this_month'
  | 'last_month'
  | 'this_quarter'
  | 'last_quarter'
  | 'this_year'
  | 'custom'

interface Preset {
  key: PresetKey
  label: string
  getRange: () => DateRange
}

interface DateRangePickerProps {
  value: DateRange
  onChange: (range: DateRange) => void
  className?: string
}

// ---------------------------------------------------------------------------
// Presets
// ---------------------------------------------------------------------------

const PRESETS: Preset[] = [
  {
    key: 'this_month',
    label: 'This Month',
    getRange: () => ({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) }),
  },
  {
    key: 'last_month',
    label: 'Last Month',
    getRange: () => {
      const last = subMonths(new Date(), 1)
      return { from: startOfMonth(last), to: endOfMonth(last) }
    },
  },
  {
    key: 'this_quarter',
    label: 'This Quarter',
    getRange: () => ({ from: startOfQuarter(new Date()), to: endOfQuarter(new Date()) }),
  },
  {
    key: 'last_quarter',
    label: 'Last Quarter',
    getRange: () => {
      const last = subQuarters(new Date(), 1)
      return { from: startOfQuarter(last), to: endOfQuarter(last) }
    },
  },
  {
    key: 'this_year',
    label: 'This Year',
    getRange: () => ({ from: startOfYear(new Date()), to: endOfYear(new Date()) }),
  },
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function detectPreset(range: DateRange): PresetKey {
  for (const preset of PRESETS) {
    const presetRange = preset.getRange()
    if (
      format(range.from, 'yyyy-MM-dd') === format(presetRange.from, 'yyyy-MM-dd') &&
      format(range.to, 'yyyy-MM-dd') === format(presetRange.to, 'yyyy-MM-dd')
    ) {
      return preset.key
    }
  }
  return 'custom'
}

function formatDisplayRange(range: DateRange): string {
  return `${format(range.from, 'd MMM yyyy')} – ${format(range.to, 'd MMM yyyy')}`
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function DateRangePicker({ value, onChange, className }: DateRangePickerProps) {
  const [open, setOpen] = React.useState(false)
  const [activePreset, setActivePreset] = React.useState<PresetKey>(() => detectPreset(value))
  const [customFrom, setCustomFrom] = React.useState(format(value.from, 'yyyy-MM-dd'))
  const [customTo, setCustomTo] = React.useState(format(value.to, 'yyyy-MM-dd'))

  // Keep local state in sync with external value
  React.useEffect(() => {
    setActivePreset(detectPreset(value))
    setCustomFrom(format(value.from, 'yyyy-MM-dd'))
    setCustomTo(format(value.to, 'yyyy-MM-dd'))
  }, [value])

  function handlePresetClick(preset: Preset) {
    const range = preset.getRange()
    setActivePreset(preset.key)
    setCustomFrom(format(range.from, 'yyyy-MM-dd'))
    setCustomTo(format(range.to, 'yyyy-MM-dd'))
    onChange(range)
    setOpen(false)
  }

  function handleCustomApply() {
    const from = parseISO(customFrom)
    const to = parseISO(customTo)
    if (isValid(from) && isValid(to) && from <= to) {
      setActivePreset('custom')
      onChange({ from, to })
      setOpen(false)
    }
  }

  const displayLabel =
    activePreset === 'custom'
      ? formatDisplayRange(value)
      : (PRESETS.find((p) => p.key === activePreset)?.label ?? formatDisplayRange(value))

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger render={<Button variant="outline" className={cn('min-w-[220px] justify-between font-normal', className)} />}>
        <CalendarIcon className="size-4 text-muted-foreground" />
        <span className="flex-1 text-left">{displayLabel}</span>
        <ChevronDownIcon className="size-4 text-muted-foreground" />
      </PopoverTrigger>

      <PopoverContent className="w-80 p-0" align="start">
        {/* ── Presets ── */}
        <div className="p-2">
          <p className="px-2 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Quick Select
          </p>
          <div className="grid grid-cols-2 gap-1 mt-1">
            {PRESETS.map((preset) => (
              <button
                key={preset.key}
                onClick={() => handlePresetClick(preset)}
                className={cn(
                  'rounded-md px-3 py-1.5 text-sm text-left transition-colors hover:bg-muted',
                  activePreset === preset.key
                    ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                    : 'text-foreground',
                )}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        <Separator />

        {/* ── Custom range ── */}
        <div className="p-3 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Custom Range
          </p>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">From</Label>
              <Input
                type="date"
                value={customFrom}
                onChange={(e) => {
                  setCustomFrom(e.target.value)
                  setActivePreset('custom')
                }}
                className="h-7 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">To</Label>
              <Input
                type="date"
                value={customTo}
                onChange={(e) => {
                  setCustomTo(e.target.value)
                  setActivePreset('custom')
                }}
                className="h-7 text-xs"
              />
            </div>
          </div>
          <Button size="sm" className="w-full" onClick={handleCustomApply}>
            Apply Custom Range
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}

// ---------------------------------------------------------------------------
// Default range helper (exported for convenience)
// ---------------------------------------------------------------------------

export function getDefaultDateRange(): DateRange {
  return {
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  }
}

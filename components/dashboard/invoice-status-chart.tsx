'use client'

import React from 'react'
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'
import { INVOICE_STATUSES } from '@/lib/constants'

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export interface StatusBreakdown {
  status: string
  count: number
}

interface InvoiceStatusChartProps {
  data: StatusBreakdown[]
  /** Total invoice count (for centre label) */
  total: number
}

// ─────────────────────────────────────────────
// Colour map
// ─────────────────────────────────────────────

const STATUS_HEX: Record<string, string> = {
  PAID:      '#16a34a', // green-600
  SENT:      '#2563eb', // blue-600
  OVERDUE:   '#dc2626', // red-600
  DRAFT:     '#9ca3af', // gray-400
  PARTIAL:   '#d97706', // amber-600
  CANCELLED: '#94a3b8', // slate-400
}

// ─────────────────────────────────────────────
// Custom tooltip
// ─────────────────────────────────────────────

interface StatusTooltipEntry {
  name?: string
  value?: number
}

interface StatusTooltipProps {
  active?: boolean
  payload?: StatusTooltipEntry[]
}

function StatusTooltip({ active, payload }: StatusTooltipProps) {
  if (!active || !payload || payload.length === 0) return null

  const entry = payload[0]
  const statusKey = entry.name as string
  const meta = INVOICE_STATUSES[statusKey as keyof typeof INVOICE_STATUSES]

  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-xl text-sm">
      <p className="font-semibold text-foreground">{meta?.label ?? statusKey}</p>
      <p className="text-muted-foreground">
        <span className="font-medium text-foreground tabular-nums">{entry.value}</span>{' '}
        invoice{entry.value !== 1 ? 's' : ''}
      </p>
    </div>
  )
}

// (Centre label rendered as absolute-positioned overlay — see component below)

// ─────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────

export function InvoiceStatusChart({ data, total }: InvoiceStatusChartProps) {
  // Filter zero-count statuses from chart (keep for legend)
  const chartData = data.filter((d) => d.count > 0)

  if (chartData.length === 0) {
    return (
      <div className="flex h-[260px] items-center justify-center">
        <p className="text-sm text-muted-foreground">No invoice data yet</p>
      </div>
    )
  }

  return (
    <div className="w-full">
      {/* Donut chart with absolute-positioned centre label */}
      <div className="relative h-[220px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              dataKey="count"
              nameKey="status"
              cx="50%"
              cy="50%"
              innerRadius="58%"
              outerRadius="78%"
              paddingAngle={3}
              strokeWidth={0}
              labelLine={false}
            >
              {chartData.map((entry) => (
                <Cell
                  key={entry.status}
                  fill={STATUS_HEX[entry.status] ?? '#94a3b8'}
                />
              ))}
            </Pie>

            <Tooltip
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              content={(props: any) => <StatusTooltip {...props} />}
            />
          </PieChart>
        </ResponsiveContainer>

        {/* Centre label overlay */}
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-extrabold tabular-nums leading-none text-foreground">
            {total}
          </span>
          <span className="mt-1 text-[11px] text-muted-foreground">Total</span>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2 px-2">
        {data.map((item) => {
          const meta = INVOICE_STATUSES[item.status as keyof typeof INVOICE_STATUSES]
          if (!meta) return null
          const pct = total > 0 ? Math.round((item.count / total) * 100) : 0

          return (
            <div key={item.status} className="flex items-center justify-between gap-2 text-xs">
              <span className="flex items-center gap-1.5 text-muted-foreground truncate">
                <span
                  className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: STATUS_HEX[item.status] ?? '#94a3b8' }}
                />
                {meta.label}
              </span>
              <span className="tabular-nums font-medium text-foreground shrink-0">
                {item.count}
                <span className="text-muted-foreground font-normal ml-1">
                  ({pct}%)
                </span>
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

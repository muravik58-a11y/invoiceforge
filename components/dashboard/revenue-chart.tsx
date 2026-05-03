'use client'

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts'
import type { MonthlyRevenue } from '@/types'
import { formatCurrency } from '@/lib/utils'

// ─────────────────────────────────────────────
// Custom tooltip
// ─────────────────────────────────────────────

interface TooltipEntry {
  name?: string
  value?: number
  color?: string
}

interface RevenueTooltipProps {
  active?: boolean
  payload?: TooltipEntry[]
  label?: string
}

function RevenueTooltip({ active, payload, label }: RevenueTooltipProps) {
  if (!active || !payload || payload.length === 0) return null

  return (
    <div className="rounded-lg border border-border bg-card px-4 py-3 shadow-xl text-sm min-w-[180px]">
      <p className="font-semibold text-foreground mb-2">{label}</p>
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center justify-between gap-4 py-0.5">
          <span className="flex items-center gap-1.5 text-muted-foreground capitalize">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            {entry.name === 'paid' ? 'Paid' : 'Outstanding'}
          </span>
          <span className="font-medium tabular-nums text-foreground">
            {formatCurrency(entry.value ?? 0)}
          </span>
        </div>
      ))}
      {payload.length === 2 && (
        <div className="mt-2 flex items-center justify-between border-t border-border pt-2 font-semibold">
          <span className="text-muted-foreground">Total</span>
          <span className="tabular-nums text-foreground">
            {formatCurrency((payload[0]?.value ?? 0) + (payload[1]?.value ?? 0))}
          </span>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────
// Custom legend
// ─────────────────────────────────────────────

function RevenueChartLegend() {
  return (
    <div className="flex items-center justify-center gap-6 text-xs text-muted-foreground mt-1">
      <span className="flex items-center gap-1.5">
        <span className="inline-block h-2.5 w-2.5 rounded-full bg-blue-500" />
        Paid
      </span>
      <span className="flex items-center gap-1.5">
        <span className="inline-block h-2.5 w-2.5 rounded-full bg-amber-400" />
        Outstanding
      </span>
    </div>
  )
}

// ─────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────

interface RevenueChartProps {
  data: MonthlyRevenue[]
}

export function RevenueChart({ data }: RevenueChartProps) {
  // Shorten month labels (e.g. "Apr 2026" → "Apr") for readability on mobile
  const chartData = data.map((d) => ({
    ...d,
    label: d.month.split(' ')[0], // abbreviated month only
  }))

  return (
    <div className="w-full">
      <RevenueChartLegend />
      <div className="mt-3 h-[260px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartData}
            margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
          >
            {/* ── Gradient defs ── */}
            <defs>
              <linearGradient id="gradPaid" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="gradOutstanding" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#f59e0b" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.02} />
              </linearGradient>
            </defs>

            <CartesianGrid
              strokeDasharray="3 3"
              stroke="hsl(var(--border))"
              vertical={false}
              opacity={0.5}
            />

            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              axisLine={false}
              tickLine={false}
              dy={8}
            />

            <YAxis
              tickFormatter={(v: number) =>
                v >= 1000 ? `£${(v / 1000).toFixed(0)}k` : `£${v}`
              }
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              axisLine={false}
              tickLine={false}
              width={48}
            />

            <Tooltip
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              content={(props: any) => <RevenueTooltip {...props} />}
              cursor={{ stroke: 'hsl(var(--border))', strokeWidth: 1 }}
            />

            {/* Outstanding area (behind paid) */}
            <Area
              type="monotone"
              dataKey="outstanding"
              name="outstanding"
              stroke="#f59e0b"
              strokeWidth={2}
              fill="url(#gradOutstanding)"
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0 }}
            />

            {/* Paid area (on top) */}
            <Area
              type="monotone"
              dataKey="paid"
              name="paid"
              stroke="#3b82f6"
              strokeWidth={2}
              fill="url(#gradPaid)"
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

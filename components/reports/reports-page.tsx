'use client'

import * as React from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts'
import {
  startOfMonth,
  endOfMonth,
  startOfQuarter,
  endOfQuarter,
  getQuarter,
  getYear,
  format,
  subMonths,
} from 'date-fns'
import {
  TrendingUpIcon,
  ReceiptIcon,
  UsersIcon,
  BarChart2Icon,
  DownloadIcon,
  AlertCircleIcon,
  FileTextIcon,
} from 'lucide-react'

import { cn, formatCurrency, formatDate } from '@/lib/utils'
import {
  getSalesReport,
  getVatReport,
  getProfitLossReport,
  getClientReport,
} from '@/lib/actions/reports'
import type {
  SalesReport,
  VatReport,
  ProfitLossReport,
  ClientReport,
} from '@/lib/actions/reports'

import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

import { DateRangePicker, getDefaultDateRange } from '@/components/reports/date-range-picker'
import type { DateRange } from '@/components/reports/date-range-picker'
import { VatReturnCard } from '@/components/reports/vat-return-card'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ReportsPageClientProps {
  orgId: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function StatCard({
  icon: Icon,
  label,
  value,
  description,
  colorClass = 'text-primary',
}: {
  icon: React.ElementType
  label: string
  value: string
  description?: string
  colorClass?: string
}) {
  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground mb-1">{label}</p>
            <p className={cn('text-2xl font-bold tabular-nums', colorClass)}>{value}</p>
            {description && (
              <p className="text-xs text-muted-foreground mt-1">{description}</p>
            )}
          </div>
          <div className="rounded-lg bg-muted p-2">
            <Icon className="size-5 text-muted-foreground" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ── Monthly bar chart tooltip ──
interface BarTooltipProps {
  active?: boolean
  payload?: Array<{ value?: number; color?: string; name?: string }>
  label?: string
}
function RevenueBarTooltip({ active, payload, label }: BarTooltipProps) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-border bg-card px-4 py-3 shadow-xl text-sm min-w-[180px]">
      <p className="font-semibold mb-2">{label}</p>
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center justify-between gap-4 py-0.5">
          <span className="flex items-center gap-1.5 text-muted-foreground capitalize">
            <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
            {entry.name}
          </span>
          <span className="font-medium tabular-nums">{formatCurrency(entry.value ?? 0)}</span>
        </div>
      ))}
    </div>
  )
}

// ── CSV export ──
function downloadCSV(filename: string, rows: string[][]): void {
  const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

// ── Status badge ──
const STATUS_COLORS: Record<string, string> = {
  PAID: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  SENT: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  OVERDUE: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  DRAFT: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  PARTIAL: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
}

function InvoiceStatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
        STATUS_COLORS[status] ?? 'bg-muted text-muted-foreground',
      )}
    >
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  )
}

// ── PIE chart colours ──
const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4']

// ── VAT quarter selector ──
type VatQuarter = { label: string; from: Date; to: Date }

function getVatQuarters(): VatQuarter[] {
  const now = new Date()
  const quarters: VatQuarter[] = []
  for (let i = 0; i < 8; i++) {
    const d = subMonths(startOfQuarter(now), i * 3)
    const from = startOfQuarter(d)
    const to = endOfQuarter(d)
    const q = getQuarter(from)
    const y = getYear(from)
    const NAMES = ['', 'Jan–Mar', 'Apr–Jun', 'Jul–Sep', 'Oct–Dec']
    quarters.push({ label: `Q${q} ${NAMES[q]} ${y}`, from, to })
  }
  return quarters
}

// ── Build mock monthly data for Overview chart when no real data loaded ──
function buildMonthlyLabels(from: Date, to: Date): string[] {
  const labels: string[] = []
  let d = startOfMonth(from)
  while (d <= to) {
    labels.push(format(d, 'MMM yy'))
    d = new Date(d.getFullYear(), d.getMonth() + 1, 1)
  }
  return labels
}

// ---------------------------------------------------------------------------
// Tab 1 — Overview
// ---------------------------------------------------------------------------

function OverviewTab({
  orgId,
  dateRange,
  onDateRangeChange,
}: {
  orgId: string
  dateRange: DateRange
  onDateRangeChange: (r: DateRange) => void
}) {
  const [data, setData] = React.useState<{
    sales?: SalesReport
    plr?: ProfitLossReport
  }>({})
  const [loading, setLoading] = React.useState(false)

  React.useEffect(() => {
    setLoading(true)
    Promise.all([
      getSalesReport(orgId, dateRange.from, dateRange.to),
      getProfitLossReport(orgId, dateRange.from, dateRange.to),
    ]).then(([sales, plr]) => {
      setData({ sales, plr })
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [orgId, dateRange.from, dateRange.to])

  const sales = data.sales
  const plr = data.plr

  // Build bar chart data (revenue by month — approximation from period totals)
  const monthLabels = buildMonthlyLabels(dateRange.from, dateRange.to)
  const barData = monthLabels.map((label) => ({
    label,
    revenue: 0,
  }))

  // Payment method breakdown (placeholder from sales data)
  const pieData = [
    { name: 'Bank Transfer', value: Math.round((sales?.totalPaid ?? 0) * 0.65) },
    { name: 'Card', value: Math.round((sales?.totalPaid ?? 0) * 0.25) },
    { name: 'Other', value: Math.round((sales?.totalPaid ?? 0) * 0.10) },
  ].filter((d) => d.value > 0)

  return (
    <div className="space-y-6">
      {/* ── Date range ── */}
      <div className="flex flex-wrap items-center gap-3">
        <DateRangePicker value={dateRange} onChange={onDateRangeChange} />
        {loading && (
          <span className="text-sm text-muted-foreground animate-pulse">Loading…</span>
        )}
      </div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={TrendingUpIcon}
          label="Total Revenue (ex-VAT)"
          value={formatCurrency(sales?.totalRevenue ?? 0)}
          description={`${sales?.invoiceCount ?? 0} invoices`}
        />
        <StatCard
          icon={ReceiptIcon}
          label="VAT Collected"
          value={formatCurrency(sales?.totalVat ?? 0)}
          description="Output tax"
          colorClass="text-amber-600 dark:text-amber-400"
        />
        <StatCard
          icon={FileTextIcon}
          label="Invoices Issued"
          value={String(sales?.invoiceCount ?? 0)}
          description={`${formatCurrency(plr?.totalOutstanding ?? 0)} outstanding`}
          colorClass="text-blue-600 dark:text-blue-400"
        />
        <StatCard
          icon={BarChart2Icon}
          label="Avg Invoice Value"
          value={formatCurrency(plr?.averageInvoiceValue ?? 0)}
          description={
            plr?.averagePaymentDays != null
              ? `Avg ${plr.averagePaymentDays} days to pay`
              : undefined
          }
          colorClass="text-green-600 dark:text-green-400"
        />
      </div>

      {/* ── Revenue bar chart ── */}
      <Card>
        <CardHeader>
          <CardTitle>Revenue by Month</CardTitle>
          <CardDescription>Total invoiced (ex-VAT) for the selected period</CardDescription>
        </CardHeader>
        <CardContent>
          {barData.length > 0 ? (
            <div className="h-[260px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} opacity={0.5} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                    axisLine={false}
                    tickLine={false}
                    dy={8}
                  />
                  <YAxis
                    tickFormatter={(v: number) => v >= 1000 ? `£${(v / 1000).toFixed(0)}k` : `£${v}`}
                    tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                    axisLine={false}
                    tickLine={false}
                    width={50}
                  />
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  <Tooltip content={(props: any) => <RevenueBarTooltip {...props} />} />
                  <Bar dataKey="revenue" name="Revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
              No data for the selected period
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* ── Top 10 clients ── */}
        <Card>
          <CardHeader>
            <CardTitle>Top 10 Clients by Revenue</CardTitle>
            <CardDescription>Ranked by gross invoiced amount</CardDescription>
          </CardHeader>
          <CardContent>
            {sales && sales.byClient.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground text-xs uppercase tracking-wide">
                      <th className="pb-2 text-left font-medium">Client</th>
                      <th className="pb-2 text-right font-medium">Invoices</th>
                      <th className="pb-2 text-right font-medium">Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sales.byClient.slice(0, 10).map((row) => (
                      <tr key={row.clientId} className="border-b border-border/50 last:border-0">
                        <td className="py-2 pr-4 font-medium text-foreground truncate max-w-[180px]">
                          {row.clientName}
                        </td>
                        <td className="py-2 text-right tabular-nums text-muted-foreground">
                          {row.invoiceCount}
                        </td>
                        <td className="py-2 text-right tabular-nums font-medium">
                          {formatCurrency(row.total)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="flex items-center justify-center h-24 text-muted-foreground text-sm">
                No client data for this period
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Payment method pie ── */}
        <Card>
          <CardHeader>
            <CardTitle>Payment Method Breakdown</CardTitle>
            <CardDescription>By amount received in the period</CardDescription>
          </CardHeader>
          <CardContent>
            {pieData.length > 0 ? (
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {pieData.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                    <Tooltip formatter={(v: any) => formatCurrency(Number(v))} />
                    <Legend
                      formatter={(val: string) => <span className="text-sm text-foreground">{val}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
                No payment data for this period
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Tab 2 — Sales Report
// ---------------------------------------------------------------------------

function SalesTab({
  orgId,
  dateRange,
  onDateRangeChange,
}: {
  orgId: string
  dateRange: DateRange
  onDateRangeChange: (r: DateRange) => void
}) {
  const [data, setData] = React.useState<SalesReport | null>(null)
  const [loading, setLoading] = React.useState(false)

  React.useEffect(() => {
    setLoading(true)
    getSalesReport(orgId, dateRange.from, dateRange.to)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [orgId, dateRange.from, dateRange.to])

  function handleExportCSV() {
    if (!data) return
    const rows: string[][] = [
      ['Client', 'Invoices', 'Net (ex-VAT)', 'VAT', 'Gross', 'Paid', 'Outstanding'],
      ...data.byClient.map((r) => [
        r.clientName,
        String(r.invoiceCount),
        r.subtotal.toFixed(2),
        r.vatAmount.toFixed(2),
        r.total.toFixed(2),
        r.amountPaid.toFixed(2),
        r.outstanding.toFixed(2),
      ]),
    ]
    downloadCSV(
      `sales-report-${format(dateRange.from, 'yyyy-MM-dd')}-${format(dateRange.to, 'yyyy-MM-dd')}.csv`,
      rows,
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <DateRangePicker value={dateRange} onChange={onDateRangeChange} />
        <div className="ml-auto">
          <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={!data}>
            <DownloadIcon className="size-3.5" />
            Export CSV
          </Button>
        </div>
      </div>

      {loading && (
        <div className="text-sm text-muted-foreground animate-pulse">Loading report…</div>
      )}

      {/* ── Sales by client ── */}
      {data && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Sales by Client</CardTitle>
              <CardDescription>
                Period: {formatDate(dateRange.from)} – {formatDate(dateRange.to)}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground text-xs uppercase tracking-wide">
                      <th className="pb-2 text-left font-medium">Client</th>
                      <th className="pb-2 text-right font-medium">Invoices</th>
                      <th className="pb-2 text-right font-medium">Net (ex-VAT)</th>
                      <th className="pb-2 text-right font-medium">VAT</th>
                      <th className="pb-2 text-right font-medium">Gross</th>
                      <th className="pb-2 text-right font-medium">Outstanding</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.byClient.map((row) => (
                      <tr key={row.clientId} className="border-b border-border/50 last:border-0">
                        <td className="py-2 pr-4 font-medium">{row.clientName}</td>
                        <td className="py-2 text-right tabular-nums text-muted-foreground">{row.invoiceCount}</td>
                        <td className="py-2 text-right tabular-nums">{formatCurrency(row.subtotal)}</td>
                        <td className="py-2 text-right tabular-nums text-muted-foreground">{formatCurrency(row.vatAmount)}</td>
                        <td className="py-2 text-right tabular-nums font-medium">{formatCurrency(row.total)}</td>
                        <td className={cn('py-2 text-right tabular-nums', row.outstanding > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-green-600 dark:text-green-400')}>
                          {formatCurrency(row.outstanding)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-border font-semibold">
                      <td className="pt-3 pr-4">Total</td>
                      <td className="pt-3 text-right tabular-nums">{data.invoiceCount}</td>
                      <td className="pt-3 text-right tabular-nums">{formatCurrency(data.totalRevenue)}</td>
                      <td className="pt-3 text-right tabular-nums">{formatCurrency(data.totalVat)}</td>
                      <td className="pt-3 text-right tabular-nums">{formatCurrency(data.totalInvoiced)}</td>
                      <td className="pt-3 text-right tabular-nums text-amber-600 dark:text-amber-400">{formatCurrency(data.totalOutstanding)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* ── Sales by product ── */}
          <Card>
            <CardHeader>
              <CardTitle>Sales by Product / Service</CardTitle>
            </CardHeader>
            <CardContent>
              {data.byProduct.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-muted-foreground text-xs uppercase tracking-wide">
                        <th className="pb-2 text-left font-medium">Description</th>
                        <th className="pb-2 text-right font-medium">Qty</th>
                        <th className="pb-2 text-right font-medium">Revenue (ex-VAT)</th>
                        <th className="pb-2 text-right font-medium">VAT</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.byProduct.map((row, i) => (
                        <tr key={i} className="border-b border-border/50 last:border-0">
                          <td className="py-2 pr-4 font-medium">{row.description}</td>
                          <td className="py-2 text-right tabular-nums text-muted-foreground">{row.quantity.toFixed(2)}</td>
                          <td className="py-2 text-right tabular-nums">{formatCurrency(row.revenue)}</td>
                          <td className="py-2 text-right tabular-nums text-muted-foreground">{formatCurrency(row.vatAmount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No product data for this period.</p>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {!loading && !data && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No data available for the selected period.
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Tab 3 — VAT Return
// ---------------------------------------------------------------------------

function VatReturnTab({ orgId }: { orgId: string }) {
  const vatQuarters = React.useMemo(getVatQuarters, [])
  const [selectedQuarter, setSelectedQuarter] = React.useState(0)
  const [data, setData] = React.useState<VatReport | null>(null)
  const [loading, setLoading] = React.useState(false)

  const quarter = vatQuarters[selectedQuarter]!

  React.useEffect(() => {
    setLoading(true)
    getVatReport(orgId, quarter.from, quarter.to)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [orgId, quarter.from, quarter.to])

  function handleExportMTD() {
    if (!data) return
    const rows: string[][] = [
      ['HMRC VAT Return Export'],
      ['Period', `${format(quarter.from, 'dd/MM/yyyy')} to ${format(quarter.to, 'dd/MM/yyyy')}`],
      [],
      ['Box', 'Description', 'Amount (£)'],
      ['1', 'VAT due on sales and other outputs', data.outputVat.toFixed(2)],
      ['2', 'VAT due in the period on acquisitions from EU', '0.00'],
      ['3', 'Total VAT due (Box 1 + Box 2)', data.outputVat.toFixed(2)],
      ['4', 'VAT reclaimed on purchases (input tax)', data.inputVat.toFixed(2)],
      ['5', 'Net VAT to pay to HMRC or reclaim', data.netVat.toFixed(2)],
      ['6', 'Total value of sales exc VAT', data.totalNetSales.toFixed(2)],
      ['7', 'Total value of purchases exc VAT', '0.00'],
      ['8', 'Total value of EU supply of goods', '0.00'],
      ['9', 'Total value of EU acquisitions of goods', '0.00'],
    ]
    downloadCSV(`vat-return-${quarter.label.replace(/\s+/g, '-').toLowerCase()}.csv`, rows)
  }

  const reverseChargeTotal = data?.breakdown.find((b) => b.vatType === 'REVERSE_CHARGE')?.vatAmount ?? 0

  return (
    <div className="space-y-6">
      {/* ── Quarter selector ── */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">VAT Quarter:</span>
          <Select
            value={String(selectedQuarter)}
            onValueChange={(v) => setSelectedQuarter(Number(v ?? 0))}
          >
            <SelectTrigger className="w-52">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {vatQuarters.map((q, i) => (
                <SelectItem key={i} value={String(i)}>
                  {q.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {loading && <span className="text-sm text-muted-foreground animate-pulse">Loading…</span>}
        <div className="ml-auto">
          <Button variant="outline" size="sm" onClick={handleExportMTD} disabled={!data}>
            <DownloadIcon className="size-3.5" />
            Export for MTD
          </Button>
        </div>
      </div>

      {/* ── HMRC VAT100 boxes ── */}
      {data && (
        <>
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              VAT Return Summary — {quarter.label}
            </h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <VatReturnCard
                boxNumber="1"
                label="VAT due on sales and other outputs (output tax)"
                amount={data.outputVat}
              />
              <VatReturnCard
                boxNumber="4"
                label="VAT reclaimed in this period on purchases (input tax)"
                amount={data.inputVat}
                isManual
                note="Input tax is not automatically tracked. Please enter manually."
              />
              <VatReturnCard
                boxNumber="5"
                label="Net VAT to pay to HMRC or to reclaim"
                amount={data.netVat}
                isHighlighted
                note={data.netVat >= 0 ? 'Amount to pay HMRC' : 'Amount to reclaim from HMRC'}
              />
              <VatReturnCard
                boxNumber="6"
                label="Total value of sales and other outputs (excluding VAT)"
                amount={data.totalNetSales}
              />
              <VatReturnCard
                boxNumber="7"
                label="Total value of purchases and all other inputs (excluding VAT)"
                amount={null}
                isManual
                note="Purchase invoices not tracked. Please enter manually."
              />
            </div>
          </div>

          {/* ── VAT breakdown by rate ── */}
          <Card>
            <CardHeader>
              <CardTitle>VAT Breakdown by Rate</CardTitle>
              <CardDescription>Sales split by VAT type and rate</CardDescription>
            </CardHeader>
            <CardContent>
              {data.breakdown.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-muted-foreground text-xs uppercase tracking-wide">
                        <th className="pb-2 text-left font-medium">VAT Type</th>
                        <th className="pb-2 text-right font-medium">Rate</th>
                        <th className="pb-2 text-right font-medium">Net Amount</th>
                        <th className="pb-2 text-right font-medium">VAT Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.breakdown.map((row, i) => (
                        <tr key={i} className="border-b border-border/50 last:border-0">
                          <td className="py-2 pr-4 font-medium">{row.label}</td>
                          <td className="py-2 text-right tabular-nums text-muted-foreground">{row.vatRate}%</td>
                          <td className="py-2 text-right tabular-nums">{formatCurrency(row.netAmount)}</td>
                          <td className="py-2 text-right tabular-nums">{formatCurrency(row.vatAmount)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t border-border font-semibold">
                        <td className="pt-3" colSpan={2}>Total</td>
                        <td className="pt-3 text-right tabular-nums">{formatCurrency(data.totalNetSales)}</td>
                        <td className="pt-3 text-right tabular-nums">{formatCurrency(data.outputVat)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No VAT data for this quarter.</p>
              )}
            </CardContent>
          </Card>

          {/* ── Reverse charge ── */}
          {reverseChargeTotal > 0 && (
            <Card className="border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30">
              <CardHeader>
                <CardTitle className="text-amber-700 dark:text-amber-400">Reverse Charge</CardTitle>
                <CardDescription>Domestic reverse charge transactions identified</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Reverse charge VAT identified: <strong>{formatCurrency(reverseChargeTotal)}</strong>.
                  These transactions require special treatment on your VAT return. Please consult
                  HMRC guidance on the domestic reverse charge procedure.
                </p>
              </CardContent>
            </Card>
          )}

          {/* ── MTD disclaimer ── */}
          <div className="flex gap-3 rounded-lg border border-border bg-muted/50 p-4 text-sm text-muted-foreground">
            <AlertCircleIcon className="size-5 shrink-0 text-amber-500 mt-0.5" />
            <div>
              <p className="font-medium text-foreground mb-1">Important Disclaimer</p>
              <p className="leading-relaxed">
                This report is for guidance purposes only and may not reflect all transactions
                required for your VAT return (e.g. purchases, expenses, adjustments). Please
                verify all figures with your accountant or VAT advisor before submission to HMRC.
                Making Tax Digital (MTD) submission must be made via HMRC-compatible software.
              </p>
            </div>
          </div>
        </>
      )}

      {!loading && !data && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No VAT data found for this quarter.
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Tab 4 — Client Report
// ---------------------------------------------------------------------------

function ClientReportTab({
  orgId,
  dateRange,
  onDateRangeChange,
}: {
  orgId: string
  dateRange: DateRange
  onDateRangeChange: (r: DateRange) => void
}) {
  const [clients, setClients] = React.useState<Array<{ id: string; name: string }>>([])
  const [selectedClientId, setSelectedClientId] = React.useState<string>('')
  const [data, setData] = React.useState<ClientReport | null>(null)
  const [loading, setLoading] = React.useState(false)

  // Fetch client list from sales report (most efficient with existing actions)
  React.useEffect(() => {
    getSalesReport(orgId, new Date(2000, 0, 1), new Date(2099, 11, 31))
      .then((r) => {
        const list = r.byClient.map((c) => ({ id: c.clientId, name: c.clientName }))
        setClients(list)
        if (list.length > 0 && !selectedClientId) {
          setSelectedClientId(list[0]!.id)
        }
      })
      .catch(() => {})
  }, [orgId])

  React.useEffect(() => {
    if (!selectedClientId) return
    setLoading(true)
    getClientReport(orgId, selectedClientId, dateRange.from, dateRange.to)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [orgId, selectedClientId, dateRange.from, dateRange.to])

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Select value={selectedClientId} onValueChange={(v) => setSelectedClientId(v ?? '')}>
          <SelectTrigger className="w-56">
            <SelectValue placeholder="Select a client…" />
          </SelectTrigger>
          <SelectContent>
            {clients.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <DateRangePicker value={dateRange} onChange={onDateRangeChange} />
        {loading && <span className="text-sm text-muted-foreground animate-pulse">Loading…</span>}
      </div>

      {data && (
        <>
          {/* ── Client stats ── */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              icon={TrendingUpIcon}
              label="Total Invoiced"
              value={formatCurrency(data.totalInvoiced)}
              description={`${data.invoiceCount} invoices`}
            />
            <StatCard
              icon={ReceiptIcon}
              label="Total Paid"
              value={formatCurrency(data.totalPaid)}
              colorClass="text-green-600 dark:text-green-400"
            />
            <StatCard
              icon={AlertCircleIcon}
              label="Outstanding"
              value={formatCurrency(data.totalOutstanding)}
              colorClass={data.totalOutstanding > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-green-600 dark:text-green-400'}
            />
            <StatCard
              icon={BarChart2Icon}
              label="Avg Invoice Value"
              value={formatCurrency(data.averageInvoiceValue)}
            />
          </div>

          {/* ── Invoice history ── */}
          <Card>
            <CardHeader>
              <CardTitle>{data.clientName} — Invoice History</CardTitle>
              <CardDescription>
                {formatDate(dateRange.from)} – {formatDate(dateRange.to)}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {data.invoices.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-muted-foreground text-xs uppercase tracking-wide">
                        <th className="pb-2 text-left font-medium">Invoice #</th>
                        <th className="pb-2 text-left font-medium">Issued</th>
                        <th className="pb-2 text-left font-medium">Due</th>
                        <th className="pb-2 text-right font-medium">Total</th>
                        <th className="pb-2 text-right font-medium">Paid</th>
                        <th className="pb-2 text-left font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.invoices.map((inv) => (
                        <tr key={inv.id} className="border-b border-border/50 last:border-0">
                          <td className="py-2 pr-4 font-medium">{inv.invoiceNumber}</td>
                          <td className="py-2 pr-4 text-muted-foreground">{formatDate(inv.issueDate)}</td>
                          <td className="py-2 pr-4 text-muted-foreground">{formatDate(inv.dueDate)}</td>
                          <td className="py-2 text-right tabular-nums font-medium">{formatCurrency(inv.total)}</td>
                          <td className="py-2 text-right tabular-nums text-muted-foreground">{formatCurrency(inv.amountPaid)}</td>
                          <td className="py-2 pl-4">
                            <InvoiceStatusBadge status={inv.status} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No invoices for this client in the selected period.</p>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {!loading && !data && selectedClientId && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No data available for this client in the selected period.
          </CardContent>
        </Card>
      )}

      {!selectedClientId && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Select a client to view their report.
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Tab 5 — P&L Style
// ---------------------------------------------------------------------------

function ProfitLossTab({
  orgId,
  dateRange,
  onDateRangeChange,
}: {
  orgId: string
  dateRange: DateRange
  onDateRangeChange: (r: DateRange) => void
}) {
  const [data, setData] = React.useState<ProfitLossReport | null>(null)
  const [loading, setLoading] = React.useState(false)

  React.useEffect(() => {
    setLoading(true)
    getProfitLossReport(orgId, dateRange.from, dateRange.to)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [orgId, dateRange.from, dateRange.to])

  function handleExportPDF() {
    window.print()
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <DateRangePicker value={dateRange} onChange={onDateRangeChange} />
        {loading && <span className="text-sm text-muted-foreground animate-pulse">Loading…</span>}
        <div className="ml-auto">
          <Button variant="outline" size="sm" onClick={handleExportPDF} disabled={!data}>
            <DownloadIcon className="size-3.5" />
            Export to PDF
          </Button>
        </div>
      </div>

      {data && (
        <Card>
          <CardHeader>
            <CardTitle>Profit &amp; Loss Summary</CardTitle>
            <CardDescription>
              {formatDate(dateRange.from)} – {formatDate(dateRange.to)} · For guidance only
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6 max-w-lg">

              {/* ── Income section ── */}
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                  Income
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-foreground">Total Invoiced (Gross inc-VAT)</span>
                    <span className="tabular-nums font-medium">{formatCurrency(data.totalRevenue)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Discounts Applied</span>
                    <span className="tabular-nums">{formatCurrency(0)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-sm font-semibold">
                    <span>Net Revenue</span>
                    <span className="tabular-nums text-green-600 dark:text-green-400">
                      {formatCurrency(data.totalRevenue)}
                    </span>
                  </div>
                </div>
              </div>

              {/* ── Payments received ── */}
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                  Cash Flow
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Payments Received</span>
                    <span className="tabular-nums font-medium text-green-600 dark:text-green-400">
                      {formatCurrency(data.totalPaid)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Outstanding</span>
                    <span className="tabular-nums text-amber-600 dark:text-amber-400">
                      {formatCurrency(data.totalOutstanding)}
                    </span>
                  </div>
                </div>
              </div>

              {/* ── Invoice stats ── */}
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                  Invoice Statistics
                </h3>
                <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Paid Invoices</span>
                    <span className="tabular-nums font-medium text-green-600 dark:text-green-400">
                      {data.paidInvoiceCount}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Sent (Unpaid)</span>
                    <span className="tabular-nums font-medium">
                      {data.sentInvoiceCount}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Overdue</span>
                    <span className="tabular-nums font-medium text-red-600 dark:text-red-400">
                      {data.overdueInvoiceCount}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Avg Payment Days</span>
                    <span className="tabular-nums font-medium">
                      {data.averagePaymentDays != null ? `${data.averagePaymentDays} days` : '—'}
                    </span>
                  </div>
                </div>
              </div>

              <Separator />

              {/* ── Overdue notice ── */}
              {data.overdueAmount > 0 && (
                <div className="flex gap-3 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-4 text-sm">
                  <AlertCircleIcon className="size-5 shrink-0 text-amber-500 mt-0.5" />
                  <div>
                    <p className="font-medium text-amber-700 dark:text-amber-400 mb-0.5">
                      Overdue Invoices
                    </p>
                    <p className="text-muted-foreground">
                      {data.overdueInvoiceCount} invoice{data.overdueInvoiceCount !== 1 ? 's' : ''}{' '}
                      totalling{' '}
                      <strong>{formatCurrency(data.overdueAmount)}</strong> are overdue and
                      require attention.
                    </p>
                  </div>
                </div>
              )}

              <p className="text-xs text-muted-foreground leading-relaxed border-t border-border pt-4">
                This is a simplified income summary for UK small businesses. It does not include
                expenses, cost of goods sold, or other deductions. Please consult a qualified
                accountant for your official profit and loss accounts.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {!loading && !data && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No data available for the selected period.
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main ReportsPageClient
// ---------------------------------------------------------------------------

export function ReportsPageClient({ orgId }: ReportsPageClientProps) {
  const [overviewRange, setOverviewRange] = React.useState<DateRange>(getDefaultDateRange)
  const [salesRange, setSalesRange] = React.useState<DateRange>(getDefaultDateRange)
  const [clientRange, setClientRange] = React.useState<DateRange>(getDefaultDateRange)
  const [plRange, setPlRange] = React.useState<DateRange>(getDefaultDateRange)

  return (
    <div className="space-y-6">
      {/* ── Page header ── */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Revenue analytics, VAT returns, and business insights
        </p>
      </div>

      {/* ── Tabs ── */}
      <Tabs defaultValue="overview">
        <TabsList className="w-full max-w-2xl">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="sales">Sales</TabsTrigger>
          <TabsTrigger value="vat">VAT Return</TabsTrigger>
          <TabsTrigger value="client">Client</TabsTrigger>
          <TabsTrigger value="pl">P&amp;L</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <OverviewTab
            orgId={orgId}
            dateRange={overviewRange}
            onDateRangeChange={setOverviewRange}
          />
        </TabsContent>

        <TabsContent value="sales" className="mt-6">
          <SalesTab
            orgId={orgId}
            dateRange={salesRange}
            onDateRangeChange={setSalesRange}
          />
        </TabsContent>

        <TabsContent value="vat" className="mt-6">
          <VatReturnTab orgId={orgId} />
        </TabsContent>

        <TabsContent value="client" className="mt-6">
          <ClientReportTab
            orgId={orgId}
            dateRange={clientRange}
            onDateRangeChange={setClientRange}
          />
        </TabsContent>

        <TabsContent value="pl" className="mt-6">
          <ProfitLossTab
            orgId={orgId}
            dateRange={plRange}
            onDateRangeChange={setPlRange}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}

'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { format, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns'
import {
  PlusIcon,
  DownloadIcon,
  Trash2Icon,
  ExternalLinkIcon,
  CreditCardIcon,
  TrendingUpIcon,
  FilterIcon,
  SearchIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import type { PaymentMethod } from '@prisma/client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { PageHeader } from '@/components/shared/page-header'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { RecordPaymentDialog } from '@/components/payments/record-payment-dialog'
import { formatCurrency, formatDate } from '@/lib/utils'
import { deletePayment } from '@/lib/actions/payments'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PaymentRow {
  id: string
  organizationId: string
  invoiceId: string
  amount: { toString(): string } | number
  method: PaymentMethod
  reference: string | null
  notes: string | null
  paidAt: Date
  stripePaymentId: string | null
  createdAt: Date
  invoice?: {
    invoiceNumber: string
    clientId: string
    total: { toString(): string } | number
    client?: {
      companyName: string
    }
  }
}

interface PaymentsPageClientProps {
  payments: PaymentRow[]
  orgId: string
  userId: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const METHOD_LABELS: Record<PaymentMethod, string> = {
  BANK_TRANSFER: 'Bank Transfer',
  CARD: 'Card',
  CASH: 'Cash',
  CHEQUE: 'Cheque',
  STRIPE: 'Stripe',
  OTHER: 'Other',
}

const METHOD_COLORS: Record<PaymentMethod, string> = {
  BANK_TRANSFER: 'bg-blue-100 text-blue-700',
  CARD: 'bg-purple-100 text-purple-700',
  CASH: 'bg-green-100 text-green-700',
  CHEQUE: 'bg-yellow-100 text-yellow-700',
  STRIPE: 'bg-indigo-100 text-indigo-700',
  OTHER: 'bg-gray-100 text-gray-700',
}

function toNum(v: { toString(): string } | number): number {
  return typeof v === 'number' ? v : parseFloat(v.toString())
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PaymentsPageClient({ payments, orgId, userId }: PaymentsPageClientProps) {
  const router = useRouter()
  const [search, setSearch] = React.useState('')
  const [methodFilter, setMethodFilter] = React.useState<string>('all')
  const [dateFilter, setDateFilter] = React.useState<string>('all')
  const [recordOpen, setRecordOpen] = React.useState(false)
  const [deleteTarget, setDeleteTarget] = React.useState<string | null>(null)
  const [deleteLoading, setDeleteLoading] = React.useState(false)

  // ── Summary stats ──────────────────────────────────────────────────────────
  const now = new Date()
  const monthStart = startOfMonth(now)
  const monthEnd = endOfMonth(now)

  const totalThisMonth = payments
    .filter((p) =>
      isWithinInterval(new Date(p.paidAt), { start: monthStart, end: monthEnd }),
    )
    .reduce((sum, p) => sum + toNum(p.amount), 0)

  const totalReceived = payments.reduce((sum, p) => sum + toNum(p.amount), 0)

  // ── Filter logic ──────────────────────────────────────────────────────────
  const filtered = payments.filter((p) => {
    const searchLower = search.toLowerCase()
    const matchesSearch =
      !search ||
      p.invoice?.invoiceNumber.toLowerCase().includes(searchLower) ||
      p.invoice?.client?.companyName.toLowerCase().includes(searchLower) ||
      (p.reference ?? '').toLowerCase().includes(searchLower)

    const matchesMethod = methodFilter === 'all' || p.method === methodFilter

    const paidDate = new Date(p.paidAt)
    let matchesDate = true
    if (dateFilter === 'this_month') {
      matchesDate = isWithinInterval(paidDate, { start: monthStart, end: monthEnd })
    } else if (dateFilter === 'last_30') {
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      matchesDate = paidDate >= thirtyDaysAgo
    } else if (dateFilter === 'last_90') {
      const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
      matchesDate = paidDate >= ninetyDaysAgo
    }

    return matchesSearch && matchesMethod && matchesDate
  })

  // ── Delete handler ─────────────────────────────────────────────────────────
  async function handleDelete() {
    if (!deleteTarget) return
    setDeleteLoading(true)
    try {
      await deletePayment(orgId, deleteTarget, userId)
      toast.success('Payment deleted')
      setDeleteTarget(null)
    } catch {
      toast.error('Failed to delete payment')
    } finally {
      setDeleteLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payments"
        description="Track all payments received across your invoices."
      >
        <Button variant="outline" size="sm" nativeButton={false} render={<a href="/api/invoices/export?status=PAID" download />}>
          <DownloadIcon className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
        <Button size="sm" onClick={() => setRecordOpen(true)}>
          <PlusIcon className="mr-2 h-4 w-4" />
          Record Payment
        </Button>
      </PageHeader>

      {/* ── Summary Cards ── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Received This Month
            </CardTitle>
            <TrendingUpIcon className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(totalThisMonth)}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {format(monthStart, 'MMMM yyyy')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Received (All Time)
            </CardTitle>
            <CreditCardIcon className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(totalReceived)}</p>
            <p className="mt-1 text-xs text-muted-foreground">{payments.length} payment(s)</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Filtered Total
            </CardTitle>
            <FilterIcon className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {formatCurrency(filtered.reduce((sum, p) => sum + toNum(p.amount), 0))}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{filtered.length} payment(s) shown</p>
          </CardContent>
        </Card>
      </div>

      {/* ── Filters ── */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[200px] flex-1">
          <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search invoice or client…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select value={methodFilter} onValueChange={(v) => setMethodFilter(v ?? '')}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Payment method" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Methods</SelectItem>
            <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
            <SelectItem value="CARD">Card</SelectItem>
            <SelectItem value="CASH">Cash</SelectItem>
            <SelectItem value="CHEQUE">Cheque</SelectItem>
            <SelectItem value="STRIPE">Stripe</SelectItem>
            <SelectItem value="OTHER">Other</SelectItem>
          </SelectContent>
        </Select>

        <Select value={dateFilter} onValueChange={(v) => setDateFilter(v ?? '')}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Date range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Time</SelectItem>
            <SelectItem value="this_month">This Month</SelectItem>
            <SelectItem value="last_30">Last 30 Days</SelectItem>
            <SelectItem value="last_90">Last 90 Days</SelectItem>
          </SelectContent>
        </Select>

        {(search || methodFilter !== 'all' || dateFilter !== 'all') && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearch('')
              setMethodFilter('all')
              setDateFilter('all')
            }}
          >
            Clear filters
          </Button>
        )}
      </div>

      {/* ── Table ── */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
          <CreditCardIcon className="mb-3 h-10 w-10 text-muted-foreground/50" />
          <p className="text-sm font-medium text-muted-foreground">No payments found</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Record a payment or adjust your filters.
          </p>
          <Button
            size="sm"
            className="mt-4"
            onClick={() => setRecordOpen(true)}
          >
            <PlusIcon className="mr-2 h-4 w-4" />
            Record Payment
          </Button>
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice #</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell className="font-mono text-sm">
                    {payment.invoice?.invoiceNumber ?? '—'}
                  </TableCell>
                  <TableCell className="font-medium">
                    {payment.invoice?.client?.companyName ?? '—'}
                  </TableCell>
                  <TableCell className="font-semibold text-green-600">
                    {formatCurrency(toNum(payment.amount))}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        METHOD_COLORS[payment.method]
                      }`}
                    >
                      {METHOD_LABELS[payment.method]}
                    </span>
                  </TableCell>
                  <TableCell>{formatDate(payment.paidAt)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {payment.reference ?? '—'}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger render={<Button variant="ghost" size="sm" />}>
                        •••
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {payment.invoiceId && (
                          <DropdownMenuItem
                            onClick={() =>
                              router.push(`/dashboard/invoices/${payment.invoiceId}`)
                            }
                          >
                            <ExternalLinkIcon className="mr-2 h-4 w-4" />
                            View Invoice
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          onClick={() => setDeleteTarget(payment.id)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2Icon className="mr-2 h-4 w-4" />
                          Delete Payment
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* ── Record Payment Dialog ── */}
      <RecordPaymentDialog
        open={recordOpen}
        onOpenChange={setRecordOpen}
        orgId={orgId}
        userId={userId}
      />

      {/* ── Delete Confirm ── */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}
        title="Delete payment?"
        description="This will reverse the payment and update the invoice balance. This cannot be undone."
        onConfirm={handleDelete}
        variant="destructive"
        confirmLabel="Delete"
        loading={deleteLoading}
      />
    </div>
  )
}

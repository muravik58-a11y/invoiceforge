'use client'
import { Prisma } from '@prisma/client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { type ColumnDef } from '@tanstack/react-table'
import {
  PlusIcon,
  SearchIcon,
  DownloadIcon,
  EyeIcon,
  PencilIcon,
  SendIcon,
  CheckCircle2Icon,
  FileTextIcon,
  CopyIcon,
  XCircleIcon,
  CalendarIcon,
  UsersIcon,
  FilterIcon,
  RefreshCwIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { DataTable } from '@/components/shared/data-table'
import { PageHeader } from '@/components/shared/page-header'
import { StatusBadge } from '@/components/shared/status-badge'
import { MarkPaidDialog } from '@/components/invoices/mark-paid-dialog'
import { formatCurrency, formatDate } from '@/lib/utils'
import { INVOICE_STATUSES } from '@/lib/constants'
import type { InvoiceStatus } from '@prisma/client'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface InvoiceRow {
  id: string
  invoiceNumber: string
  clientId: string
  issueDate: Date
  dueDate: Date
  subtotal: Prisma.Decimal | number
  total: Prisma.Decimal | number
  amountPaid: Prisma.Decimal | number
  status: InvoiceStatus
  client: {
    id: string
    companyName: string
    email: string | null
  }
}

interface InvoicesPageClientProps {
  invoices: InvoiceRow[]
  orgId: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toNum(v: Prisma.Decimal | number | string | null | undefined): number {
  if (v == null) return 0
  if (typeof v === 'number') return v
  return parseFloat(v.toString())
}

function exportInvoicesCSV(rows: InvoiceRow[]) {
  const headers = [
    'Invoice #',
    'Client',
    'Issue Date',
    'Due Date',
    'Subtotal (ex-VAT)',
    'Total (inc-VAT)',
    'Amount Paid',
    'Status',
  ]
  const csvRows = rows.map((r) =>
    [
      r.invoiceNumber,
      r.client.companyName,
      format(new Date(r.issueDate), 'dd/MM/yyyy'),
      format(new Date(r.dueDate), 'dd/MM/yyyy'),
      toNum(r.subtotal).toFixed(2),
      toNum(r.total).toFixed(2),
      toNum(r.amountPaid).toFixed(2),
      r.status,
    ]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(','),
  )
  const csv = [headers.join(','), ...csvRows].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `invoices-${format(new Date(), 'yyyy-MM-dd')}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// ---------------------------------------------------------------------------
// Summary Stats Bar
// ---------------------------------------------------------------------------

function SummaryStatsBar({ invoices }: { invoices: InvoiceRow[] }) {
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  const totalOutstanding = invoices
    .filter((inv) => ['SENT', 'OVERDUE', 'PARTIAL'].includes(inv.status))
    .reduce((sum, inv) => sum + toNum(inv.total) - toNum(inv.amountPaid), 0)

  const totalPaidThisMonth = invoices
    .filter(
      (inv) =>
        inv.status === 'PAID' && new Date(inv.issueDate) >= startOfMonth,
    )
    .reduce((sum, inv) => sum + toNum(inv.amountPaid), 0)

  const countByStatus = invoices.reduce(
    (acc, inv) => {
      acc[inv.status] = (acc[inv.status] ?? 0) + 1
      return acc
    },
    {} as Record<string, number>,
  )

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      <div className="rounded-lg border bg-card p-4">
        <p className="text-xs text-muted-foreground">Outstanding</p>
        <p className="mt-1 text-xl font-bold text-amber-600">
          {formatCurrency(totalOutstanding)}
        </p>
      </div>
      <div className="rounded-lg border bg-card p-4">
        <p className="text-xs text-muted-foreground">Paid This Month</p>
        <p className="mt-1 text-xl font-bold text-green-600">
          {formatCurrency(totalPaidThisMonth)}
        </p>
      </div>
      {(['DRAFT', 'SENT', 'PAID', 'OVERDUE'] as InvoiceStatus[]).map((s) => (
        <div key={s} className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground">{INVOICE_STATUSES[s].label}</p>
          <p className="mt-1 text-xl font-bold">{countByStatus[s] ?? 0}</p>
        </div>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

const STATUS_TABS = [
  { value: 'all', label: 'All' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'SENT', label: 'Sent' },
  { value: 'PAID', label: 'Paid' },
  { value: 'OVERDUE', label: 'Overdue' },
  { value: 'PARTIAL', label: 'Partial' },
  { value: 'CANCELLED', label: 'Cancelled' },
] as const

export function InvoicesPageClient({ invoices, orgId }: InvoicesPageClientProps) {
  const router = useRouter()

  const [search, setSearch] = React.useState('')
  const [activeTab, setActiveTab] = React.useState<string>('all')
  const [clientFilter, setClientFilter] = React.useState<string>('all')
  const [dateFrom, setDateFrom] = React.useState('')
  const [dateTo, setDateTo] = React.useState('')
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set())
  const [markPaidInvoice, setMarkPaidInvoice] = React.useState<InvoiceRow | null>(null)

  // Unique clients for filter
  const uniqueClients = React.useMemo(() => {
    const map = new Map<string, string>()
    for (const inv of invoices) {
      map.set(inv.client.id, inv.client.companyName)
    }
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]))
  }, [invoices])

  // Filtered list
  const filtered = React.useMemo(() => {
    let list = invoices

    if (activeTab !== 'all') {
      list = list.filter((inv) => inv.status === activeTab)
    }
    if (clientFilter !== 'all') {
      list = list.filter((inv) => inv.client.id === clientFilter)
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(
        (inv) =>
          inv.invoiceNumber.toLowerCase().includes(q) ||
          inv.client.companyName.toLowerCase().includes(q),
      )
    }
    if (dateFrom) {
      const from = new Date(dateFrom)
      list = list.filter((inv) => new Date(inv.issueDate) >= from)
    }
    if (dateTo) {
      const to = new Date(dateTo)
      list = list.filter((inv) => new Date(inv.issueDate) <= to)
    }

    return list
  }, [invoices, activeTab, clientFilter, search, dateFrom, dateTo])

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleSelectAll() {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filtered.map((inv) => inv.id)))
    }
  }

  function handleBulkAction(action: string) {
    const count = selectedIds.size
    if (count === 0) {
      toast.error('No invoices selected')
      return
    }
    toast.info(`${action} for ${count} invoice(s) — implement bulk action handler`)
    setSelectedIds(new Set())
  }

  // Columns
  const columns: ColumnDef<InvoiceRow>[] = [
    {
      id: 'select',
      header: () => (
        <Checkbox
          checked={selectedIds.size === filtered.length && filtered.length > 0}
          onCheckedChange={toggleSelectAll}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={selectedIds.has(row.original.id)}
          onCheckedChange={() => toggleSelect(row.original.id)}
          aria-label={`Select ${row.original.invoiceNumber}`}
          onClick={(e) => e.stopPropagation()}
        />
      ),
      size: 40,
    },
    {
      accessorKey: 'invoiceNumber',
      header: 'Invoice #',
      cell: ({ row }) => (
        <button
          className="font-mono font-medium text-primary hover:underline"
          onClick={() => router.push(`/invoices/${row.original.id}`)}
        >
          {row.original.invoiceNumber}
        </button>
      ),
    },
    {
      id: 'client',
      header: 'Client',
      cell: ({ row }) => (
        <span className="font-medium">{row.original.client.companyName}</span>
      ),
    },
    {
      accessorKey: 'issueDate',
      header: 'Issue Date',
      cell: ({ row }) => formatDate(row.original.issueDate),
    },
    {
      accessorKey: 'dueDate',
      header: 'Due Date',
      cell: ({ row }) => {
        const due = new Date(row.original.dueDate)
        const isOverdue = due < new Date() && row.original.status !== 'PAID' && row.original.status !== 'CANCELLED'
        return (
          <span className={isOverdue ? 'text-red-600 font-medium' : undefined}>
            {formatDate(due)}
          </span>
        )
      },
    },
    {
      accessorKey: 'total',
      header: 'Amount',
      cell: ({ row }) => (
        <span className="font-semibold tabular-nums">
          {formatCurrency(toNum(row.original.total))}
        </span>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const inv = row.original
        return (
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" />}>
                <span className="sr-only">Open menu</span>
                <svg
                  className="size-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 5v.01M12 12v.01M12 19v.01"
                  />
                </svg>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => router.push(`/invoices/${inv.id}`)}>
                <EyeIcon className="mr-2 size-4" /> View
              </DropdownMenuItem>
              {inv.status === 'DRAFT' && (
                <DropdownMenuItem onClick={() => router.push(`/invoices/${inv.id}/edit`)}>
                  <PencilIcon className="mr-2 size-4" /> Edit
                </DropdownMenuItem>
              )}
              {(inv.status === 'DRAFT' || inv.status === 'SENT') && (
                <DropdownMenuItem
                  onClick={() =>
                    toast.info(`Sending invoice ${inv.invoiceNumber}…`)
                  }
                >
                  <SendIcon className="mr-2 size-4" /> Send Email
                </DropdownMenuItem>
              )}
              {inv.status !== 'PAID' && inv.status !== 'CANCELLED' && (
                <DropdownMenuItem onClick={() => setMarkPaidInvoice(inv)}>
                  <CheckCircle2Icon className="mr-2 size-4" /> Mark Paid
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                onClick={() =>
                  window.open(`/api/invoices/${inv.id}/pdf`, '_blank')
                }
              >
                <FileTextIcon className="mr-2 size-4" /> Download PDF
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() =>
                  toast.info(`Duplicating ${inv.invoiceNumber}…`)
                }
              >
                <CopyIcon className="mr-2 size-4" /> Duplicate
              </DropdownMenuItem>
              {inv.status !== 'CANCELLED' && inv.status !== 'PAID' && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() =>
                      toast.info(`Cancel ${inv.invoiceNumber}? Implement confirm dialog.`)
                    }
                  >
                    <XCircleIcon className="mr-2 size-4" /> Cancel Invoice
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Invoices"
        description="Manage your invoices, track payments, and stay on top of cash flow."
      >
        {selectedIds.size > 0 && (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleBulkAction('Mark Paid')}
            >
              <CheckCircle2Icon className="mr-1.5 size-4" />
              Mark Paid ({selectedIds.size})
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleBulkAction('Send Reminder')}
            >
              <SendIcon className="mr-1.5 size-4" />
              Send Reminder ({selectedIds.size})
            </Button>
          </>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={() => exportInvoicesCSV(filtered)}
        >
          <DownloadIcon className="mr-1.5 size-4" />
          Export CSV
        </Button>
        <Button size="sm" onClick={() => router.push('/invoices/new')}>
          <PlusIcon className="mr-1.5 size-4" />
          Create Invoice
        </Button>
      </PageHeader>

      {/* Summary Stats */}
      <SummaryStatsBar invoices={invoices} />

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <TabsList className="h-9">
            {STATUS_TABS.map((tab) => {
              const count =
                tab.value === 'all'
                  ? invoices.length
                  : invoices.filter((inv) => inv.status === tab.value).length
              return (
                <TabsTrigger key={tab.value} value={tab.value} className="text-xs">
                  {tab.label}
                  {count > 0 && (
                    <Badge variant="outline" className="ml-1.5 text-[10px] px-1 py-0 h-4">
                      {count}
                    </Badge>
                  )}
                </TabsTrigger>
              )
            })}
          </TabsList>
        </div>

        {/* Filters */}
        <div className="mt-4 flex flex-wrap gap-3">
          <div className="relative min-w-[200px] flex-1">
            <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
            <Input
              className="pl-8 h-9"
              placeholder="Search invoice # or client…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <Select value={clientFilter} onValueChange={(v) => setClientFilter(v ?? '')}>
            <SelectTrigger className="h-9 w-[180px]">
              <UsersIcon className="mr-1.5 size-3.5 text-muted-foreground" />
              <SelectValue placeholder="All clients" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Clients</SelectItem>
              {uniqueClients.map(([id, name]) => (
                <SelectItem key={id} value={id}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex items-center gap-1.5">
            <CalendarIcon className="size-4 text-muted-foreground" />
            <Input
              type="date"
              className="h-9 w-[140px]"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              placeholder="From"
            />
            <span className="text-muted-foreground">–</span>
            <Input
              type="date"
              className="h-9 w-[140px]"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              placeholder="To"
            />
          </div>

          {(search || clientFilter !== 'all' || dateFrom || dateTo) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearch('')
                setClientFilter('all')
                setDateFrom('')
                setDateTo('')
              }}
            >
              <RefreshCwIcon className="mr-1.5 size-3.5" />
              Clear
            </Button>
          )}
        </div>

        {STATUS_TABS.map((tab) => (
          <TabsContent key={tab.value} value={tab.value} className="mt-4">
            <DataTable
              columns={columns}
              data={filtered}
              pageSize={15}
              emptyTitle={
                search || clientFilter !== 'all' || dateFrom || dateTo
                  ? 'No matching invoices'
                  : tab.value === 'all'
                  ? 'No invoices yet'
                  : `No ${tab.label.toLowerCase()} invoices`
              }
              emptyDescription={
                search || clientFilter !== 'all'
                  ? 'Try adjusting your filters.'
                  : 'Create your first invoice to get started.'
              }
            />
          </TabsContent>
        ))}
      </Tabs>

      {/* Mark Paid Dialog */}
      {markPaidInvoice && (
        <MarkPaidDialog
          open={!!markPaidInvoice}
          onOpenChange={(open) => !open && setMarkPaidInvoice(null)}
          invoice={markPaidInvoice}
          orgId={orgId}
          onSuccess={() => {
            setMarkPaidInvoice(null)
            router.refresh()
          }}
        />
      )}
    </div>
  )
}

'use client'
import { Prisma } from '@prisma/client'

import * as React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { Loader2Icon, SearchIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { formatCurrency } from '@/lib/utils'
import { recordPayment } from '@/lib/actions/payments'
import { getInvoices } from '@/lib/actions/invoices'

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const schema = z.object({
  invoiceId: z.string().min(1, 'Please select an invoice'),
  amount: z.coerce.number().positive('Amount must be greater than 0'),
  method: z.enum(['BANK_TRANSFER', 'CARD', 'CASH', 'CHEQUE', 'OTHER']).refine(Boolean, {
    message: 'Please select a payment method',
  }),
  paidAt: z.string().min(1, 'Payment date is required'),
  reference: z.string().optional(),
  notes: z.string().optional(),
})

type FormValues = z.input<typeof schema>

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface OutstandingInvoice {
  id: string
  invoiceNumber: string
  total: Prisma.Decimal | number
  amountPaid: Prisma.Decimal | number
  client: {
    companyName: string
  }
}

interface RecordPaymentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  orgId: string
  userId: string
  /** Pre-select an invoice when opened from an invoice detail page */
  preselectedInvoiceId?: string
}

function toNum(v: Prisma.Decimal | number): number {
  return typeof v === 'number' ? v : parseFloat(v.toString())
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function RecordPaymentDialog({
  open,
  onOpenChange,
  orgId,
  userId,
  preselectedInvoiceId,
}: RecordPaymentDialogProps) {
  const [invoices, setInvoices] = React.useState<OutstandingInvoice[]>([])
  const [invoicesLoading, setInvoicesLoading] = React.useState(false)
  const [invoiceSearch, setInvoiceSearch] = React.useState('')
  const [selectedInvoice, setSelectedInvoice] = React.useState<OutstandingInvoice | null>(null)
  const [maxAmount, setMaxAmount] = React.useState<number | null>(null)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      paidAt: format(new Date(), 'yyyy-MM-dd'),
      method: 'BANK_TRANSFER',
    },
  })

  const watchedInvoiceId = watch('invoiceId')
  const watchedAmount = watch('amount')

  // Load outstanding invoices when dialog opens
  React.useEffect(() => {
    if (!open) return
    setInvoicesLoading(true)
    // Fetch outstanding invoices across multiple statuses
    Promise.all([
      getInvoices(orgId, { status: 'SENT', limit: 200 }),
      getInvoices(orgId, { status: 'PARTIAL', limit: 200 }),
      getInvoices(orgId, { status: 'OVERDUE', limit: 200 }),
    ]).then(([sent, partial, overdue]) => ({
      invoices: [...sent.invoices, ...partial.invoices, ...overdue.invoices],
    }))
      .then(({ invoices: data }) => {
        setInvoices(data as unknown as OutstandingInvoice[])
        if (preselectedInvoiceId) {
          const found = data.find((inv) => inv.id === preselectedInvoiceId)
          if (found) {
            handleInvoiceSelect(found as unknown as OutstandingInvoice)
          }
        }
      })
      .catch(() => toast.error('Failed to load invoices'))
      .finally(() => setInvoicesLoading(false))
  }, [open, orgId, preselectedInvoiceId])

  function handleInvoiceSelect(invoice: OutstandingInvoice) {
    setSelectedInvoice(invoice)
    setValue('invoiceId', invoice.id)
    const total = toNum(invoice.total)
    const paid = toNum(invoice.amountPaid)
    const balance = Math.max(0, total - paid)
    setMaxAmount(balance)
    setValue('amount', balance)
  }

  const filteredInvoices = invoices.filter(
    (inv) =>
      inv.invoiceNumber.toLowerCase().includes(invoiceSearch.toLowerCase()) ||
      inv.client.companyName.toLowerCase().includes(invoiceSearch.toLowerCase()),
  )

  async function onSubmit(values: FormValues) {
    try {
      await recordPayment(orgId, values.invoiceId, userId, {
        amount: Number(values.amount),
        method: values.method,
        reference: values.reference,
        paidAt: new Date(values.paidAt),
        notes: values.notes,
      })
      toast.success('Payment recorded successfully')
      reset()
      setSelectedInvoice(null)
      setInvoiceSearch('')
      setMaxAmount(null)
      onOpenChange(false)
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to record payment')
    }
  }

  function handleClose() {
    reset()
    setSelectedInvoice(null)
    setInvoiceSearch('')
    setMaxAmount(null)
    onOpenChange(false)
  }

  const balanceExceeded =
    maxAmount !== null && watchedAmount !== undefined && Number(watchedAmount) > maxAmount

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Record Manual Payment</DialogTitle>
          <DialogDescription>
            Record a payment received outside of Stripe (bank transfer, cash, cheque, etc.)
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Invoice Selector */}
          <div className="space-y-2">
            <Label>Invoice *</Label>

            {/* Search box */}
            <div className="relative">
              <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by invoice # or client…"
                value={invoiceSearch}
                onChange={(e) => setInvoiceSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Invoice list */}
            <div className="max-h-48 overflow-y-auto rounded-md border">
              {invoicesLoading ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2Icon className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : filteredInvoices.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  No outstanding invoices found
                </p>
              ) : (
                filteredInvoices.map((inv) => {
                  const balance = Math.max(
                    0,
                    toNum(inv.total) - toNum(inv.amountPaid),
                  )
                  return (
                    <button
                      key={inv.id}
                      type="button"
                      onClick={() => handleInvoiceSelect(inv)}
                      className={`flex w-full items-center justify-between px-3 py-2.5 text-left text-sm transition-colors hover:bg-accent ${
                        watchedInvoiceId === inv.id ? 'bg-accent' : ''
                      }`}
                    >
                      <span>
                        <span className="font-medium">{inv.invoiceNumber}</span>
                        <span className="ml-2 text-muted-foreground">
                          {inv.client.companyName}
                        </span>
                      </span>
                      <span className="font-semibold text-orange-600">
                        {formatCurrency(balance)} due
                      </span>
                    </button>
                  )
                })
              )}
            </div>

            {errors.invoiceId && (
              <p className="text-xs text-destructive">{errors.invoiceId.message}</p>
            )}
            <input type="hidden" {...register('invoiceId')} />
          </div>

          {/* Amount */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="amount">Amount (£) *</Label>
              {maxAmount !== null && (
                <span className="text-xs text-muted-foreground">
                  Max: {formatCurrency(maxAmount)}
                </span>
              )}
            </div>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0.01"
              {...register('amount')}
              placeholder="0.00"
            />
            {balanceExceeded && (
              <p className="text-xs text-destructive">
                Amount cannot exceed the outstanding balance of {formatCurrency(maxAmount!)}
              </p>
            )}
            {errors.amount && !balanceExceeded && (
              <p className="text-xs text-destructive">{errors.amount.message}</p>
            )}
          </div>

          {/* Payment Method */}
          <div className="space-y-2">
            <Label>Payment Method *</Label>
            <Select
              defaultValue="BANK_TRANSFER"
              onValueChange={(v) => setValue('method', v as any)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                <SelectItem value="CARD">Card</SelectItem>
                <SelectItem value="CASH">Cash</SelectItem>
                <SelectItem value="CHEQUE">Cheque</SelectItem>
                <SelectItem value="OTHER">Other</SelectItem>
              </SelectContent>
            </Select>
            {errors.method && (
              <p className="text-xs text-destructive">{errors.method.message}</p>
            )}
          </div>

          {/* Payment Date */}
          <div className="space-y-2">
            <Label htmlFor="paidAt">Payment Date *</Label>
            <Input id="paidAt" type="date" {...register('paidAt')} />
            {errors.paidAt && (
              <p className="text-xs text-destructive">{errors.paidAt.message}</p>
            )}
          </div>

          {/* Reference */}
          <div className="space-y-2">
            <Label htmlFor="reference">Reference Number</Label>
            <Input
              id="reference"
              placeholder="e.g. BACS ref, cheque number…"
              {...register('reference')}
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Any additional notes…"
              rows={2}
              {...register('notes')}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || balanceExceeded}>
              {isSubmitting && <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />}
              Record Payment
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

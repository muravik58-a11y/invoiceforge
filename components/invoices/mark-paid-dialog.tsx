'use client'
import { Prisma } from '@prisma/client'

import * as React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { format } from 'date-fns'
import { toast } from 'sonner'
import {
  CheckCircle2Icon,
  Loader2Icon,
} from 'lucide-react'
import type { InvoiceStatus } from '@prisma/client'

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
import { PAYMENT_METHOD_OPTIONS } from '@/lib/constants'
import { markInvoicePaid } from '@/lib/actions/invoices'

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const markPaidSchema = z.object({
  amount: z.coerce.number().positive('Amount must be greater than 0'),
  method: z.string().min(1, 'Select a payment method'),
  paidAt: z.string().min(1, 'Payment date is required'),
  reference: z.string().optional(),
  notes: z.string().optional(),
})

type MarkPaidFormValues = z.input<typeof markPaidSchema>

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MarkPaidDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  invoice: {
    id: string
    invoiceNumber: string
    status: InvoiceStatus
    total: Prisma.Decimal | number
    amountPaid: Prisma.Decimal | number
  }
  orgId: string
  onSuccess: () => void
}

function toNum(v: Prisma.Decimal | number | string | null | undefined): number {
  if (v == null) return 0
  if (typeof v === 'number') return v
  return parseFloat(v.toString())
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function MarkPaidDialog({
  open,
  onOpenChange,
  invoice,
  orgId,
  onSuccess,
}: MarkPaidDialogProps) {
  const totalNum = toNum(invoice.total)
  const alreadyPaid = toNum(invoice.amountPaid)
  const balance = totalNum - alreadyPaid

  const form = useForm<MarkPaidFormValues>({
    resolver: zodResolver(markPaidSchema),
    defaultValues: {
      amount: balance > 0 ? parseFloat(balance.toFixed(2)) : totalNum,
      method: 'BANK_TRANSFER',
      paidAt: format(new Date(), 'yyyy-MM-dd'),
      reference: '',
      notes: '',
    },
  })

  // Reset amount when dialog opens
  React.useEffect(() => {
    if (open) {
      form.reset({
        amount: balance > 0 ? parseFloat(balance.toFixed(2)) : totalNum,
        method: 'BANK_TRANSFER',
        paidAt: format(new Date(), 'yyyy-MM-dd'),
        reference: '',
        notes: '',
      })
    }
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  const watchedAmount = Number(form.watch('amount') ?? 0)
  const isPartial =
    watchedAmount > 0 && watchedAmount < balance && balance > 0

  async function onSubmit(values: MarkPaidFormValues) {
    try {
      await markInvoicePaid(orgId, invoice.id, '', {
        amount: Number(values.amount),
        method: values.method,
        paidAt: new Date(values.paidAt),
        reference: values.reference || undefined,
        notes: values.notes || undefined,
      })

      toast.success(
        isPartial
          ? `Partial payment of ${formatCurrency(Number(values.amount))} recorded`
          : `Invoice ${invoice.invoiceNumber} marked as paid`,
      )
      onSuccess()
      onOpenChange(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to record payment')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2Icon className="size-5 text-green-600" />
            Record Payment
          </DialogTitle>
          <DialogDescription>
            Record a payment for invoice{' '}
            <strong>{invoice.invoiceNumber}</strong>.
          </DialogDescription>
        </DialogHeader>

        {/* Invoice summary */}
        <div className="rounded-lg border bg-muted/30 p-3 text-sm space-y-1.5">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Invoice Total</span>
            <span className="font-medium">{formatCurrency(totalNum)}</span>
          </div>
          {alreadyPaid > 0 && (
            <div className="flex justify-between text-green-600">
              <span>Already Paid</span>
              <span>{formatCurrency(alreadyPaid)}</span>
            </div>
          )}
          <div className="flex justify-between font-semibold">
            <span>Balance Due</span>
            <span className="text-amber-600">{formatCurrency(balance)}</span>
          </div>
        </div>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {/* Amount */}
          <div>
            <Label htmlFor="amount" className="mb-1.5 block">
              Payment Amount <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">
                £
              </span>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0.01"
                className="pl-7"
                {...form.register('amount')}
              />
            </div>
            {form.formState.errors.amount && (
              <p className="mt-1 text-xs text-destructive">
                {form.formState.errors.amount.message}
              </p>
            )}
            {isPartial && (
              <p className="mt-1 text-xs text-amber-600 font-medium">
                Partial payment — {formatCurrency(balance - Number(watchedAmount))} will remain outstanding.
              </p>
            )}
          </div>

          {/* Payment Method */}
          <div>
            <Label className="mb-1.5 block">
              Payment Method <span className="text-destructive">*</span>
            </Label>
            <Select
              value={form.watch('method')}
              onValueChange={(v) => v && form.setValue('method', v as 'BANK_TRANSFER' | 'CARD' | 'CASH' | 'CHEQUE' | 'OTHER')}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select method…" />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_METHOD_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.method && (
              <p className="mt-1 text-xs text-destructive">
                {form.formState.errors.method.message}
              </p>
            )}
          </div>

          {/* Payment Date */}
          <div>
            <Label htmlFor="paidAt" className="mb-1.5 block">
              Payment Date <span className="text-destructive">*</span>
            </Label>
            <Input
              id="paidAt"
              type="date"
              {...form.register('paidAt')}
            />
            {form.formState.errors.paidAt && (
              <p className="mt-1 text-xs text-destructive">
                {form.formState.errors.paidAt.message}
              </p>
            )}
          </div>

          {/* Reference */}
          <div>
            <Label htmlFor="reference" className="mb-1.5 block">
              Reference{' '}
              <span className="text-xs text-muted-foreground">(optional)</span>
            </Label>
            <Input
              id="reference"
              placeholder="e.g. BACS ref, transaction ID…"
              {...form.register('reference')}
            />
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="paymentNotes" className="mb-1.5 block">
              Notes{' '}
              <span className="text-xs text-muted-foreground">(optional)</span>
            </Label>
            <Textarea
              id="paymentNotes"
              placeholder="Any notes about this payment…"
              rows={2}
              {...form.register('notes')}
            />
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? (
                <Loader2Icon className="mr-2 size-4 animate-spin" />
              ) : (
                <CheckCircle2Icon className="mr-2 size-4" />
              )}
              {isPartial ? 'Record Partial Payment' : 'Mark as Paid'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

'use client'
import { Prisma } from '@prisma/client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  SendIcon,
  CheckCircle2Icon,
  FileTextIcon,
  CopyIcon,
  PencilIcon,
  XCircleIcon,
  LinkIcon,
  MoreHorizontalIcon,
  Loader2Icon,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MarkPaidDialog } from '@/components/invoices/mark-paid-dialog'
import { sendInvoice, cancelInvoice, duplicateInvoice } from '@/lib/actions/invoices'
import type { InvoiceStatus } from '@prisma/client'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface InvoiceActionsProps {
  invoice: {
    id: string
    invoiceNumber: string
    status: InvoiceStatus
    total: Prisma.Decimal | number
    amountPaid: Prisma.Decimal | number
    client: {
      email: string | null
      companyName: string
    }
  }
  orgId: string
  onRefresh?: () => void
}

function toNum(v: Prisma.Decimal | number | string | null | undefined): number {
  if (v == null) return 0
  if (typeof v === 'number') return v
  return parseFloat(v.toString())
}

// ---------------------------------------------------------------------------
// Send Invoice Dialog (email preview)
// ---------------------------------------------------------------------------

function SendInvoiceDialog({
  open,
  onOpenChange,
  invoice,
  orgId,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  invoice: InvoiceActionsProps['invoice']
  orgId: string
  onSuccess: () => void
}) {
  const [loading, setLoading] = React.useState(false)

  async function handleSend() {
    setLoading(true)
    try {
      await sendInvoice(orgId, invoice.id, '')
      toast.success(`Invoice ${invoice.invoiceNumber} sent to ${invoice.client.email}`)
      onSuccess()
      onOpenChange(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to send invoice')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Send Invoice</DialogTitle>
          <DialogDescription>
            Send invoice {invoice.invoiceNumber} to{' '}
            <strong>{invoice.client.companyName}</strong>.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border bg-muted/30 p-4 text-sm space-y-2">
          <div className="flex justify-between">
            <span className="text-muted-foreground">To:</span>
            <span className="font-medium">
              {invoice.client.email ?? '(no email on file)'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Subject:</span>
            <span>Invoice {invoice.invoiceNumber}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Attachment:</span>
            <span className="text-primary">
              {invoice.invoiceNumber}.pdf
            </span>
          </div>
        </div>

        {!invoice.client.email && (
          <p className="text-sm text-amber-600 bg-amber-50 rounded p-3">
            This client has no email address on file. Please add one before sending.
          </p>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSend}
            disabled={loading || !invoice.client.email}
          >
            {loading ? (
              <Loader2Icon className="mr-2 size-4 animate-spin" />
            ) : (
              <SendIcon className="mr-2 size-4" />
            )}
            Send Invoice
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// Cancel Confirm Dialog
// ---------------------------------------------------------------------------

function CancelInvoiceDialog({
  open,
  onOpenChange,
  invoice,
  orgId,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  invoice: InvoiceActionsProps['invoice']
  orgId: string
  onSuccess: () => void
}) {
  const [loading, setLoading] = React.useState(false)

  async function handleCancel() {
    setLoading(true)
    try {
      await cancelInvoice(orgId, invoice.id, '')
      toast.success(`Invoice ${invoice.invoiceNumber} cancelled`)
      onSuccess()
      onOpenChange(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to cancel invoice')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cancel Invoice</DialogTitle>
          <DialogDescription>
            Are you sure you want to cancel{' '}
            <strong>{invoice.invoiceNumber}</strong>? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Keep Invoice
          </Button>
          <Button
            variant="destructive"
            onClick={handleCancel}
            disabled={loading}
          >
            {loading ? (
              <Loader2Icon className="mr-2 size-4 animate-spin" />
            ) : (
              <XCircleIcon className="mr-2 size-4" />
            )}
            Cancel Invoice
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// Main Invoice Actions Component
// ---------------------------------------------------------------------------

export function InvoiceActions({
  invoice,
  orgId,
  onRefresh,
}: InvoiceActionsProps) {
  const router = useRouter()
  const [showSendDialog, setShowSendDialog] = React.useState(false)
  const [showMarkPaidDialog, setShowMarkPaidDialog] = React.useState(false)
  const [showCancelDialog, setShowCancelDialog] = React.useState(false)
  const [duplicating, setDuplicating] = React.useState(false)

  const isDraft = invoice.status === 'DRAFT'
  const isPaid = invoice.status === 'PAID'
  const isCancelled = invoice.status === 'CANCELLED'
  const canSend = !isPaid && !isCancelled
  const canMarkPaid = !isPaid && !isCancelled
  const canCancel = !isPaid && !isCancelled

  async function handleDuplicate() {
    setDuplicating(true)
    try {
      const newInvoice = await duplicateInvoice(orgId, invoice.id, '')
      toast.success('Invoice duplicated')
      router.push(`/invoices/${(newInvoice as any).id}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to duplicate')
    } finally {
      setDuplicating(false)
    }
  }

  function handleDownloadPDF() {
    window.open(`/api/invoices/${invoice.id}/pdf`, '_blank')
  }

  function handleStripeLink() {
    toast.info('Creating Stripe payment link…')
  }

  function handleRefresh() {
    onRefresh?.()
    router.refresh()
  }

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {/* Primary actions */}
        {canSend && (
          <Button size="sm" onClick={() => setShowSendDialog(true)}>
            <SendIcon className="mr-1.5 size-4" />
            Send Invoice
          </Button>
        )}

        {canMarkPaid && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowMarkPaidDialog(true)}
          >
            <CheckCircle2Icon className="mr-1.5 size-4" />
            Mark Paid
          </Button>
        )}

        <Button size="sm" variant="outline" onClick={handleDownloadPDF}>
          <FileTextIcon className="mr-1.5 size-4" />
          Download PDF
        </Button>

        {/* More actions dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button size="sm" variant="outline" />}>
            <MoreHorizontalIcon className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            {isDraft && (
              <DropdownMenuItem
                onClick={() => router.push(`/invoices/${invoice.id}/edit`)}
              >
                <PencilIcon className="mr-2 size-4" />
                Edit Invoice
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              onClick={handleDuplicate}
              disabled={duplicating}
            >
              {duplicating ? (
                <Loader2Icon className="mr-2 size-4 animate-spin" />
              ) : (
                <CopyIcon className="mr-2 size-4" />
              )}
              Duplicate
            </DropdownMenuItem>
            {!isPaid && (
              <DropdownMenuItem onClick={handleStripeLink}>
                <LinkIcon className="mr-2 size-4" />
                Create Payment Link
              </DropdownMenuItem>
            )}
            {canCancel && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => setShowCancelDialog(true)}
                >
                  <XCircleIcon className="mr-2 size-4" />
                  Cancel Invoice
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Dialogs */}
      <SendInvoiceDialog
        open={showSendDialog}
        onOpenChange={setShowSendDialog}
        invoice={invoice}
        orgId={orgId}
        onSuccess={handleRefresh}
      />

      <MarkPaidDialog
        open={showMarkPaidDialog}
        onOpenChange={setShowMarkPaidDialog}
        invoice={invoice as any}
        orgId={orgId}
        onSuccess={handleRefresh}
      />

      <CancelInvoiceDialog
        open={showCancelDialog}
        onOpenChange={setShowCancelDialog}
        invoice={invoice}
        orgId={orgId}
        onSuccess={handleRefresh}
      />
    </>
  )
}

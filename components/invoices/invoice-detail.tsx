'use client'
import { Prisma } from '@prisma/client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import type { InvoiceStatus, VatType, PaymentMethod } from '@prisma/client'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { StatusBadge } from '@/components/shared/status-badge'
import { InvoiceActions } from '@/components/invoices/invoice-actions'
import { formatCurrency, formatDate } from '@/lib/utils'
import { INVOICE_STATUSES } from '@/lib/constants'
import {
  ClockIcon,
  UserIcon,
  CheckCircle2Icon,
  FileTextIcon,
  CreditCardIcon,
} from 'lucide-react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface InvoiceClient {
  id: string
  companyName: string
  contactName: string | null
  email: string | null
  phone: string | null
  vatNumber: string | null
  addressLine1: string | null
  addressLine2: string | null
  city: string | null
  county: string | null
  postcode: string | null
  country: string | null
}

interface InvoiceItem {
  id: string
  description: string
  quantity: Prisma.Decimal | number
  unitPrice: Prisma.Decimal | number
  vatRate: Prisma.Decimal | number
  vatType: VatType
  vatAmount: Prisma.Decimal | number
  lineTotal: Prisma.Decimal | number
  lineTotalExVat: Prisma.Decimal | number
  unit: string | null
}

interface VatBreakdown {
  id: string
  vatRate: Prisma.Decimal | number
  vatType: VatType
  netAmount: Prisma.Decimal | number
  vatAmount: Prisma.Decimal | number
}

interface Payment {
  id: string
  amount: Prisma.Decimal | number
  method: PaymentMethod
  reference: string | null
  notes: string | null
  paidAt: Date
}

interface AuditLog {
  id: string
  userId: string
  userEmail: string
  action: string
  createdAt: Date
}

interface FullInvoice {
  id: string
  invoiceNumber: string
  status: InvoiceStatus
  issueDate: Date
  dueDate: Date
  poNumber: string | null
  reference: string | null
  subtotal: Prisma.Decimal | number
  discountPercent: Prisma.Decimal | number
  discountAmount: Prisma.Decimal | number
  vatAmount: Prisma.Decimal | number
  total: Prisma.Decimal | number
  amountPaid: Prisma.Decimal | number
  notes: string | null
  terms: string | null
  sentAt: Date | null
  templateId: string | null
  stripePaymentLinkUrl: string | null
  client: InvoiceClient
  items: InvoiceItem[]
  vatBreakdowns: VatBreakdown[]
  payments: Payment[]
  auditLogs: AuditLog[]
}

interface Org {
  id: string
  name: string
  companyName: string | null
  companyNumber: string | null
  vatNumber: string | null
  logo: string | null
  addressLine1: string | null
  addressLine2: string | null
  city: string | null
  county: string | null
  postcode: string | null
  country: string | null
  bankName: string | null
  bankSortCode: string | null
  bankAccountNumber: string | null
  bankIban: string | null
  invoiceFooter: string | null
}

interface InvoiceDetailPageProps {
  invoice: FullInvoice
  org: Org
}

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function toNum(v: Prisma.Decimal | number | string | null | undefined): number {
  if (v == null) return 0
  if (typeof v === 'number') return v
  return parseFloat(v.toString())
}

function auditActionLabel(action: string): string {
  const map: Record<string, string> = {
    'invoice.created': 'Invoice created',
    'invoice.updated': 'Invoice updated',
    'invoice.sent': 'Invoice sent',
    'invoice.cancelled': 'Invoice cancelled',
    'invoice.marked_paid': 'Payment recorded',
    'invoice.pdf_generated': 'PDF generated',
  }
  return map[action] ?? action
}

function paymentMethodLabel(method: string): string {
  const map: Record<string, string> = {
    BANK_TRANSFER: 'Bank Transfer',
    CARD: 'Card',
    CASH: 'Cash',
    CHEQUE: 'Cheque',
    STRIPE: 'Stripe',
    OTHER: 'Other',
  }
  return map[method] ?? method
}

// ---------------------------------------------------------------------------
// Invoice Preview Card (the printable-style invoice layout)
// ---------------------------------------------------------------------------

function InvoicePreviewCard({ invoice, org }: { invoice: FullInvoice; org: Org }) {
  return (
    <div className="rounded-xl border bg-white shadow-sm overflow-hidden print:shadow-none print:border-0">
      {/* Header band */}
      <div className="bg-primary/5 border-b px-8 py-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            {org.logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={org.logo}
                alt={org.companyName ?? org.name}
                className="h-12 w-auto object-contain mb-2"
              />
            ) : (
              <h2 className="text-xl font-bold text-foreground">
                {org.companyName ?? org.name}
              </h2>
            )}
            <address className="not-italic text-sm text-muted-foreground space-y-0.5">
              {org.addressLine1 && <p>{org.addressLine1}</p>}
              {org.addressLine2 && <p>{org.addressLine2}</p>}
              {(org.city || org.postcode) && (
                <p>
                  {[org.city, org.postcode].filter(Boolean).join(', ')}
                </p>
              )}
              {org.country && <p>{org.country}</p>}
              {org.vatNumber && <p>VAT: {org.vatNumber}</p>}
              {org.companyNumber && <p>Co. No: {org.companyNumber}</p>}
            </address>
          </div>
          <div className="text-right">
            <p className="text-3xl font-extrabold tracking-tight text-primary">
              INVOICE
            </p>
            <p className="mt-1 font-mono text-lg font-semibold">
              {invoice.invoiceNumber}
            </p>
            <div className="mt-2">
              <StatusBadge status={invoice.status} />
            </div>
          </div>
        </div>
      </div>

      {/* Bill to + meta */}
      <div className="grid grid-cols-2 gap-8 px-8 py-6 border-b sm:grid-cols-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            Bill To
          </p>
          <address className="not-italic text-sm space-y-0.5">
            <p className="font-semibold">{invoice.client.companyName}</p>
            {invoice.client.contactName && (
              <p>{invoice.client.contactName}</p>
            )}
            {invoice.client.email && (
              <p className="text-muted-foreground">{invoice.client.email}</p>
            )}
            {invoice.client.addressLine1 && (
              <p>{invoice.client.addressLine1}</p>
            )}
            {invoice.client.addressLine2 && (
              <p>{invoice.client.addressLine2}</p>
            )}
            {(invoice.client.city || invoice.client.postcode) && (
              <p>
                {[invoice.client.city, invoice.client.postcode]
                  .filter(Boolean)
                  .join(', ')}
              </p>
            )}
            {invoice.client.vatNumber && (
              <p className="text-muted-foreground">
                VAT: {invoice.client.vatNumber}
              </p>
            )}
          </address>
        </div>

        <div className="space-y-3 text-sm">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Issue Date
            </p>
            <p className="mt-0.5 font-medium">{formatDate(invoice.issueDate)}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Due Date
            </p>
            <p
              className={`mt-0.5 font-medium ${
                new Date(invoice.dueDate) < new Date() &&
                !['PAID', 'CANCELLED'].includes(invoice.status)
                  ? 'text-red-600'
                  : ''
              }`}
            >
              {formatDate(invoice.dueDate)}
            </p>
          </div>
        </div>

        <div className="space-y-3 text-sm">
          {invoice.poNumber && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                PO Number
              </p>
              <p className="mt-0.5 font-medium">{invoice.poNumber}</p>
            </div>
          )}
          {invoice.reference && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Reference
              </p>
              <p className="mt-0.5 font-medium">{invoice.reference}</p>
            </div>
          )}
        </div>
      </div>

      {/* Line items table */}
      <div className="px-8 py-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left">
              <th className="pb-3 font-semibold text-muted-foreground w-[40%]">
                Description
              </th>
              <th className="pb-3 font-semibold text-muted-foreground text-right">
                Qty
              </th>
              <th className="pb-3 font-semibold text-muted-foreground text-right">
                Unit Price
              </th>
              <th className="pb-3 font-semibold text-muted-foreground text-right">
                VAT
              </th>
              <th className="pb-3 font-semibold text-muted-foreground text-right">
                Line Total
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {invoice.items.map((item) => {
              const qty = toNum(item.quantity)
              const price = toNum(item.unitPrice)
              const vatRate = toNum(item.vatRate)
              const exVat = qty * price
              return (
                <tr key={item.id} className="py-2">
                  <td className="py-3 pr-4">
                    <p className="font-medium">{item.description}</p>
                    {item.unit && item.unit !== 'unit' && (
                      <p className="text-xs text-muted-foreground">{item.unit}</p>
                    )}
                  </td>
                  <td className="py-3 text-right tabular-nums">{qty}</td>
                  <td className="py-3 text-right tabular-nums">
                    {formatCurrency(price)}
                  </td>
                  <td className="py-3 text-right tabular-nums text-muted-foreground">
                    {vatRate}%
                  </td>
                  <td className="py-3 text-right tabular-nums font-medium">
                    {formatCurrency(exVat)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Totals section */}
      <div className="border-t px-8 py-6 bg-muted/20">
        <div className="ml-auto max-w-xs space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Subtotal (ex-VAT)</span>
            <span className="font-medium tabular-nums">
              {formatCurrency(toNum(invoice.subtotal))}
            </span>
          </div>

          {toNum(invoice.discountAmount) > 0 && (
            <div className="flex justify-between text-green-600">
              <span>Discount ({toNum(invoice.discountPercent)}%)</span>
              <span className="tabular-nums">
                −{formatCurrency(toNum(invoice.discountAmount))}
              </span>
            </div>
          )}

          {/* VAT breakdowns */}
          {invoice.vatBreakdowns.map((vb, i) => (
            <div key={i} className="flex justify-between text-muted-foreground">
              <span>
                VAT @ {toNum(vb.vatRate)}% on {formatCurrency(toNum(vb.netAmount))}
              </span>
              <span className="tabular-nums">{formatCurrency(toNum(vb.vatAmount))}</span>
            </div>
          ))}

          <Separator />

          <div className="flex justify-between text-base font-bold">
            <span>Total (inc-VAT)</span>
            <span className="tabular-nums text-primary">
              {formatCurrency(toNum(invoice.total))}
            </span>
          </div>

          {toNum(invoice.amountPaid) > 0 && invoice.status !== 'PAID' && (
            <>
              <div className="flex justify-between text-green-600">
                <span>Amount Paid</span>
                <span className="tabular-nums">
                  {formatCurrency(toNum(invoice.amountPaid))}
                </span>
              </div>
              <div className="flex justify-between font-semibold text-amber-600">
                <span>Balance Due</span>
                <span className="tabular-nums">
                  {formatCurrency(toNum(invoice.total) - toNum(invoice.amountPaid))}
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Banking details */}
      {(org.bankName || org.bankAccountNumber) && (
        <div className="border-t px-8 py-5 bg-muted/10">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            Payment Details
          </p>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:grid-cols-4">
            {org.bankName && (
              <div>
                <span className="text-muted-foreground">Bank: </span>
                <span>{org.bankName}</span>
              </div>
            )}
            {org.bankSortCode && (
              <div>
                <span className="text-muted-foreground">Sort Code: </span>
                <span className="font-mono">{org.bankSortCode}</span>
              </div>
            )}
            {org.bankAccountNumber && (
              <div>
                <span className="text-muted-foreground">Account: </span>
                <span className="font-mono">{org.bankAccountNumber}</span>
              </div>
            )}
            {org.bankIban && (
              <div>
                <span className="text-muted-foreground">IBAN: </span>
                <span className="font-mono">{org.bankIban}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Notes / Terms / Footer */}
      {(invoice.notes || invoice.terms || org.invoiceFooter) && (
        <div className="border-t px-8 py-5 space-y-4 text-sm text-muted-foreground">
          {invoice.notes && (
            <div>
              <p className="font-semibold text-foreground mb-1">Notes</p>
              <p className="whitespace-pre-line">{invoice.notes}</p>
            </div>
          )}
          {invoice.terms && (
            <div>
              <p className="font-semibold text-foreground mb-1">Payment Terms</p>
              <p className="whitespace-pre-line">{invoice.terms}</p>
            </div>
          )}
          {org.invoiceFooter && (
            <p className="text-xs border-t pt-3">{org.invoiceFooter}</p>
          )}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main Page Component
// ---------------------------------------------------------------------------

export function InvoiceDetailPage({ invoice, org }: InvoiceDetailPageProps) {
  const router = useRouter()

  const balance = toNum(invoice.total) - toNum(invoice.amountPaid)

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-16">
      {/* Page header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold font-mono">
              {invoice.invoiceNumber}
            </h1>
            <StatusBadge status={invoice.status} />
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Issued {formatDate(invoice.issueDate)} · Due {formatDate(invoice.dueDate)}
          </p>
        </div>

        <InvoiceActions
          invoice={invoice as any}
          orgId={org.id}
          onRefresh={() => router.refresh()}
        />
      </div>

      {/* Main layout: invoice + sidebar */}
      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        {/* Invoice preview */}
        <InvoicePreviewCard invoice={invoice} org={org} />

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Quick stats */}
          <div className="rounded-xl border bg-card p-5 space-y-4">
            <h3 className="font-semibold text-sm">Summary</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Invoice Total</span>
                <span className="font-semibold tabular-nums">
                  {formatCurrency(toNum(invoice.total))}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Amount Paid</span>
                <span className="font-semibold text-green-600 tabular-nums">
                  {formatCurrency(toNum(invoice.amountPaid))}
                </span>
              </div>
              {balance > 0.001 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Balance Due</span>
                  <span className="font-semibold text-amber-600 tabular-nums">
                    {formatCurrency(balance)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Payment history */}
          {invoice.payments.length > 0 && (
            <div className="rounded-xl border bg-card p-5 space-y-3">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <CreditCardIcon className="size-4" />
                Payment History
              </h3>
              <div className="space-y-3">
                {invoice.payments.map((p) => (
                  <div key={p.id} className="text-sm">
                    <div className="flex justify-between">
                      <span className="font-medium">
                        {formatCurrency(toNum(p.amount))}
                      </span>
                      <span className="text-muted-foreground">
                        {format(new Date(p.paidAt), 'dd MMM yyyy')}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground mt-0.5">
                      <span>{paymentMethodLabel(p.method)}</span>
                      {p.reference && <span>Ref: {p.reference}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Audit log */}
          {invoice.auditLogs.length > 0 && (
            <div className="rounded-xl border bg-card p-5 space-y-3">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <ClockIcon className="size-4" />
                Activity
              </h3>
              <div className="space-y-3">
                {invoice.auditLogs.slice(0, 8).map((log) => (
                  <div key={log.id} className="flex items-start gap-2 text-xs">
                    <div className="mt-0.5 size-5 rounded-full bg-muted flex items-center justify-center shrink-0">
                      <UserIcon className="size-3 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium">{auditActionLabel(log.action)}</p>
                      <p className="text-muted-foreground">
                        {format(new Date(log.createdAt), 'dd MMM yyyy HH:mm')} ·{' '}
                        {log.userEmail}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Stripe payment link */}
          {invoice.stripePaymentLinkUrl && (
            <div className="rounded-xl border bg-card p-5 space-y-3">
              <h3 className="font-semibold text-sm">Payment Link</h3>
              <a
                href={invoice.stripePaymentLinkUrl}
                target="_blank"
                rel="noreferrer"
                className="block truncate text-xs text-primary hover:underline"
              >
                {invoice.stripePaymentLinkUrl}
              </a>
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => {
                  navigator.clipboard.writeText(invoice.stripePaymentLinkUrl!)
                }}
              >
                Copy Link
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

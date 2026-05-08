import { auth } from '@clerk/nextjs/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeftIcon,
  BuildingIcon,
  MailIcon,
  PhoneIcon,
  MapPinIcon,
  HashIcon,
} from 'lucide-react'

import { getClient } from '@/lib/actions/clients'
import { getOrganizationByClerkId } from '@/lib/actions/organization'
import prisma from '@/lib/prisma'
import { ClientStats } from '@/components/clients/client-stats'
import { StatusBadge } from '@/components/shared/status-badge'
import { ClientDetailActions } from '@/components/clients/client-detail-actions'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency, formatDate } from '@/lib/utils'
import { serialize } from '@/lib/serialize'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return { title: `Client ${id} – InvoiceForge UK` }
}

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { orgId: clerkOrgId } = await auth()

  if (!clerkOrgId) redirect('/onboarding')

  const org = await getOrganizationByClerkId(clerkOrgId)
  if (!org) redirect('/onboarding')

  const client = await getClient(org.id, id)
  if (!client) notFound()

  // Fetch invoice history for this client
  const invoices = await prisma.invoice.findMany({
    where: { clientId: id, organizationId: org.id },
    orderBy: { issueDate: 'desc' },
    select: {
      id: true,
      invoiceNumber: true,
      issueDate: true,
      dueDate: true,
      total: true,
      amountPaid: true,
      status: true,
    },
  })

  // Compute stats
  const totalInvoiced = invoices.reduce((s, inv) => s + Number(inv.total), 0)
  const totalPaid = invoices.reduce((s, inv) => s + Number(inv.amountPaid), 0)
  const outstanding = totalInvoiced - totalPaid
  const lastInvoice = invoices[0]

  return (
    <div className="space-y-6">
      {/* Back + Actions bar */}
      <div className="flex items-center justify-between gap-4">
        <Button nativeButton={false} render={<Link href="/clients" />} variant="ghost" size="sm">
          <ArrowLeftIcon className="mr-2 size-4" />
          Back to Clients
        </Button>
        <ClientDetailActions
          orgId={org.id}
          client={serialize(client) as any}
        />
      </div>

      {/* Client header */}
      <div>
        <h1 className="text-2xl font-semibold">{client.companyName}</h1>
        {client.contactName && (
          <p className="text-muted-foreground">{client.contactName}</p>
        )}
      </div>

      {/* Stats */}
      <ClientStats
        totalInvoiced={totalInvoiced}
        totalPaid={totalPaid}
        outstanding={outstanding}
        lastInvoiceDate={lastInvoice?.issueDate ?? null}
      />

      {/* Details grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Contact info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Contact Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {client.email && (
              <div className="flex items-center gap-2">
                <MailIcon className="size-4 shrink-0 text-muted-foreground" />
                <a href={`mailto:${client.email}`} className="text-primary hover:underline">
                  {client.email}
                </a>
              </div>
            )}
            {client.phone && (
              <div className="flex items-center gap-2">
                <PhoneIcon className="size-4 shrink-0 text-muted-foreground" />
                <a href={`tel:${client.phone}`} className="hover:underline">
                  {client.phone}
                </a>
              </div>
            )}
            {client.vatNumber && (
              <div className="flex items-center gap-2">
                <HashIcon className="size-4 shrink-0 text-muted-foreground" />
                <span>VAT: {client.vatNumber}</span>
              </div>
            )}
            {!client.email && !client.phone && !client.vatNumber && (
              <p className="text-muted-foreground">No contact details recorded.</p>
            )}
          </CardContent>
        </Card>

        {/* Address */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Address
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            {[
              client.addressLine1,
              client.addressLine2,
              client.city,
              client.county,
              client.postcode,
              client.country,
            ]
              .filter(Boolean)
              .map((line, i) => (
                <div key={i} className="flex items-start gap-2">
                  {i === 0 && (
                    <MapPinIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  )}
                  {i !== 0 && <span className="w-4 shrink-0" />}
                  <span>{line}</span>
                </div>
              ))}
            {!client.addressLine1 && (
              <p className="text-muted-foreground">No address recorded.</p>
            )}
          </CardContent>
        </Card>

        {/* Billing defaults */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Billing Defaults
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Payment Terms</span>
              <span className="font-medium">
                {client.defaultPaymentTerms === 0
                  ? 'Due on receipt'
                  : `Net ${client.defaultPaymentTerms ?? 30}`}
              </span>
            </div>
            {client.defaultTaxRate !== null && client.defaultTaxRate !== undefined && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Default Tax Rate</span>
                <span className="font-medium">{Number(client.defaultTaxRate)}%</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Currency</span>
              <span className="font-medium">{client.currency}</span>
            </div>
          </CardContent>
        </Card>

        {/* Notes */}
        {client.notes && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Notes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-wrap">{client.notes}</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Invoice history */}
      <Card>
        <CardHeader>
          <CardTitle>Invoice History</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {invoices.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-sm">
              <BuildingIcon className="mx-auto mb-3 size-8 opacity-30" />
              No invoices for this client yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="px-4 py-3 text-left font-semibold">Invoice #</th>
                    <th className="px-4 py-3 text-left font-semibold">Date</th>
                    <th className="px-4 py-3 text-left font-semibold">Due</th>
                    <th className="px-4 py-3 text-right font-semibold">Total</th>
                    <th className="px-4 py-3 text-right font-semibold">Paid</th>
                    <th className="px-4 py-3 text-left font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv, idx) => (
                    <tr
                      key={inv.id}
                      className={`border-b last:border-0 hover:bg-muted/30 transition-colors ${
                        idx % 2 === 0 ? '' : 'bg-muted/10'
                      }`}
                    >
                      <td className="px-4 py-3">
                        <Link
                          href={`/invoices/${inv.id}`}
                          className="font-medium text-primary hover:underline"
                        >
                          {inv.invoiceNumber}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {formatDate(inv.issueDate)}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {formatDate(inv.dueDate)}
                      </td>
                      <td className="px-4 py-3 text-right font-medium">
                        {formatCurrency(Number(inv.total))}
                      </td>
                      <td className="px-4 py-3 text-right text-green-600 font-medium">
                        {formatCurrency(Number(inv.amountPaid))}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={inv.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

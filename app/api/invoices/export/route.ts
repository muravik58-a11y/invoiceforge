import { auth } from '@clerk/nextjs/server'
import { getOrganizationByClerkId } from '@/lib/actions/organization'
import prisma from '@/lib/prisma'
import type { Invoice, InvoiceStatus } from '@prisma/client'

function escapeCsvField(value: string | null | undefined): string {
  const str = value ?? ''
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

function buildCsvRow(fields: (string | null | undefined)[]): string {
  return fields.map(escapeCsvField).join(',')
}

export async function GET(req: Request) {
  try {
    const { orgId: clerkOrgId, userId } = await auth()

    if (!userId || !clerkOrgId) {
      return new Response('Unauthorised', { status: 401 })
    }

    const org = await getOrganizationByClerkId(clerkOrgId)
    if (!org) {
      return new Response('Organisation not found', { status: 404 })
    }

    // Optional query params for filtering
    const { searchParams } = new URL(req.url)
    const statusFilter = searchParams.get('status')
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')

    const invoices = await prisma.invoice.findMany({
      where: {
        organizationId: org.id,
        ...(statusFilter ? { status: statusFilter as InvoiceStatus } : {}),
        ...(dateFrom || dateTo
          ? {
              issueDate: {
                ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
                ...(dateTo ? { lte: new Date(dateTo) } : {}),
              },
            }
          : {}),
      },
      include: {
        client: { select: { companyName: true, email: true } },
      },
      orderBy: { issueDate: 'desc' },
    })

    const headers = [
      'Invoice Number',
      'Client',
      'Client Email',
      'Issue Date',
      'Due Date',
      'Status',
      'Subtotal (£)',
      'VAT (£)',
      'Total (£)',
      'Amount Paid (£)',
      'Balance Due (£)',
      'PO Number',
      'Reference',
      'Created At',
    ]

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = (invoices as any[]).map((inv) => {
      const total = parseFloat(inv.total.toString())
      const amountPaid = parseFloat(inv.amountPaid.toString())
      const balanceDue = Math.max(0, total - amountPaid)

      return buildCsvRow([
        inv.invoiceNumber,
        inv.client.companyName,
        inv.client.email,
        new Intl.DateTimeFormat('en-GB').format(inv.issueDate),
        new Intl.DateTimeFormat('en-GB').format(inv.dueDate),
        inv.status,
        parseFloat(inv.subtotal.toString()).toFixed(2),
        parseFloat(inv.vatAmount.toString()).toFixed(2),
        total.toFixed(2),
        amountPaid.toFixed(2),
        balanceDue.toFixed(2),
        inv.poNumber,
        inv.reference,
        inv.createdAt.toISOString(),
      ])
    })

    const csvContent = [buildCsvRow(headers), ...rows].join('\r\n')

    const today = new Date().toISOString().split('T')[0]
    const filename = `invoices-${today}.csv`

    return new Response(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (err) {
    console.error('[GET /api/invoices/export]', err)
    return new Response('Failed to export invoices', { status: 500 })
  }
}

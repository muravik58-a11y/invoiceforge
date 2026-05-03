import { auth } from '@clerk/nextjs/server'
import { getOrganizationByClerkId } from '@/lib/actions/organization'
import prisma from '@/lib/prisma'
import { generateInvoicePdf } from '@/lib/pdf/invoice-pdf'

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { orgId: clerkOrgId, userId } = await auth()

    if (!userId || !clerkOrgId) {
      return new Response('Unauthorised', { status: 401 })
    }

    const { id } = await params

    const org = await getOrganizationByClerkId(clerkOrgId)
    if (!org) {
      return new Response('Organisation not found', { status: 404 })
    }

    // Fetch invoice with full relations, verifying it belongs to this org
    const invoice = await prisma.invoice.findFirst({
      where: { id, organizationId: org.id },
      include: {
        client: true,
        items: { orderBy: { sortOrder: 'asc' } },
        vatBreakdowns: true,
        payments: { orderBy: { paidAt: 'desc' } },
        auditLogs: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    })

    if (!invoice) {
      return new Response('Invoice not found', { status: 404 })
    }

    // Generate PDF buffer using the org's preferred template
    const template = (org.preferredTemplate ?? 'modern') as 'modern' | 'classic' | 'branded'
    const pdfBuffer = await generateInvoicePdf(invoice as any, org as any, template)

    const filename = `${invoice.invoiceNumber}.pdf`

    return new Response(pdfBuffer as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': pdfBuffer.length.toString(),
        'Cache-Control': 'no-store',
      },
    })
  } catch (err) {
    console.error('[GET /api/invoices/[id]/pdf]', err)
    return new Response('Failed to generate PDF', { status: 500 })
  }
}

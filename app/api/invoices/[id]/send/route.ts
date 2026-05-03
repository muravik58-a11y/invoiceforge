import { auth } from '@clerk/nextjs/server'
import { getOrganizationByClerkId } from '@/lib/actions/organization'
import { createAuditLog } from '@/lib/actions/audit'
import prisma from '@/lib/prisma'
import { generateInvoicePdf } from '@/lib/pdf/invoice-pdf'
import { sendInvoiceEmail } from '@/lib/resend'
import type { InvoiceEmailData } from '@/lib/resend'

export async function POST(
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
        payments: true,
        auditLogs: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
    })

    if (!invoice) {
      return new Response('Invoice not found', { status: 404 })
    }

    if (!invoice.client.email) {
      return Response.json(
        { success: false, error: 'Client has no email address' },
        { status: 422 },
      )
    }

    if (invoice.status === 'CANCELLED') {
      return Response.json(
        { success: false, error: 'Cannot send a cancelled invoice' },
        { status: 422 },
      )
    }

    // Generate PDF buffer
    const pdfBuffer = await generateInvoicePdf(invoice as any, org as any)

    // Build email data
    const invoiceEmailData: InvoiceEmailData = {
      invoiceNumber: invoice.invoiceNumber,
      clientName: invoice.client.companyName,
      issueDate: new Intl.DateTimeFormat('en-GB').format(invoice.issueDate),
      dueDate: new Intl.DateTimeFormat('en-GB').format(invoice.dueDate),
      subtotal: parseFloat(invoice.subtotal.toString()),
      tax: parseFloat(invoice.vatAmount.toString()),
      total: parseFloat(invoice.total.toString()),
      currency: invoice.client.currency ?? 'GBP',
      paymentLink: invoice.stripePaymentLinkUrl ?? undefined,
      orgName: org.companyName ?? org.name,
      orgEmail: '', // Not stored on org directly — use a fallback
    }

    await sendInvoiceEmail(invoice.client.email, pdfBuffer, invoiceEmailData)

    // Update invoice status and sentAt
    await prisma.invoice.update({
      where: { id },
      data: {
        status: invoice.status === 'DRAFT' ? 'SENT' : invoice.status,
        sentAt: new Date(),
      },
    })

    // Create notification
    await prisma.notification.create({
      data: {
        organizationId: org.id,
        title: `Invoice ${invoice.invoiceNumber} sent`,
        message: `Invoice sent to ${invoice.client.companyName} (${invoice.client.email})`,
        type: 'SUCCESS',
        link: `/dashboard/invoices/${id}`,
      },
    }).catch((e: unknown) => console.error('[send-invoice] notification failed:', e))

    // Create audit log
    await createAuditLog({
      organizationId: org.id,
      userId,
      action: 'invoice.sent',
      entityType: 'Invoice',
      entityId: id,
      changes: {
        sentTo: invoice.client.email,
        sentAt: new Date().toISOString(),
      },
      invoiceId: id,
      clientId: invoice.clientId,
    }).catch((e: unknown) => console.error('[send-invoice] audit log failed:', e))

    return Response.json({ success: true })
  } catch (err) {
    console.error('[POST /api/invoices/[id]/send]', err)
    return Response.json({ success: false, error: 'Failed to send invoice' }, { status: 500 })
  }
}

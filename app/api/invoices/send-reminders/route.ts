import prisma from '@/lib/prisma'
import { markOverdueInvoices } from '@/lib/actions/invoices'
import { sendPaymentReminderEmail } from '@/lib/resend'
import type { InvoiceEmailData } from '@/lib/resend'

// Called by Vercel Cron — secured by CRON_SECRET header
export async function GET(req: Request) {
  const cronSecret = process.env.CRON_SECRET
  const authHeader = req.headers.get('authorization')

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return new Response('Unauthorised', { status: 401 })
  }

  try {
    // First mark any newly overdue invoices
    const { updated } = await markOverdueInvoices()
    console.info(`[send-reminders] Marked ${updated} invoice(s) as OVERDUE`)

    // Find overdue invoices that need a reminder (max 3 reminders)
    const overdueInvoices = await prisma.invoice.findMany({
      where: {
        status: 'OVERDUE',
        reminderCount: { lt: 3 },
      },
      include: {
        client: {
          select: {
            companyName: true,
            email: true,
            currency: true,
          },
        },
        organization: {
          select: {
            companyName: true,
            name: true,
          },
        },
      },
      orderBy: { dueDate: 'asc' },
    })

    let remindersSent = 0
    const errors: string[] = []

    for (const invoice of overdueInvoices) {
      if (!invoice.client.email) continue

      const now = new Date()
      const dueDate = new Date(invoice.dueDate)
      const daysOverdue = Math.max(
        1,
        Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)),
      )

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
        orgName: invoice.organization.companyName ?? invoice.organization.name,
        orgEmail: '',
      }

      try {
        await sendPaymentReminderEmail(
          invoice.client.email,
          invoiceEmailData,
          daysOverdue,
        )

        // Update invoice reminder tracking
        await prisma.invoice.update({
          where: { id: invoice.id },
          data: {
            reminderCount: { increment: 1 },
            lastReminderAt: now,
          },
        })

        // Create notification for org
        await prisma.notification.create({
          data: {
            organizationId: invoice.organizationId,
            title: `Reminder sent – ${invoice.invoiceNumber}`,
            message: `Payment reminder #${invoice.reminderCount + 1} sent to ${invoice.client.companyName}`,
            type: 'INFO',
            link: `/dashboard/invoices/${invoice.id}`,
          },
        }).catch(() => {})

        remindersSent++
      } catch (emailErr) {
        console.error(
          `[send-reminders] Failed to send reminder for invoice ${invoice.invoiceNumber}:`,
          emailErr,
        )
        errors.push(invoice.id)
      }
    }

    console.info(
      `[send-reminders] Sent ${remindersSent} reminder(s), ${errors.length} error(s)`,
    )

    return Response.json({
      success: true,
      overdueMarked: updated,
      remindersSent,
      errors,
    })
  } catch (err) {
    console.error('[GET /api/invoices/send-reminders]', err)
    return Response.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

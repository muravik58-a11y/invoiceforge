import { Resend } from 'resend'

// Lazy singleton — only initialised when first send function is called,
// not at module-eval time, so build-time page-data collection doesn't throw.
let _resend: Resend | null = null

function getResend(): Resend {
  if (!_resend) {
    if (!process.env.RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY environment variable is not set')
    }
    _resend = new Resend(process.env.RESEND_API_KEY)
  }
  return _resend
}

// The verified "from" address for all outgoing emails
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? 'InvoiceForge UK <noreply@invoiceforge.co.uk>'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface InvoiceEmailData {
  invoiceNumber: string
  clientName: string
  issueDate: string
  dueDate: string
  subtotal: number
  tax: number
  total: number
  currency?: string
  paymentLink?: string
  orgName: string
  orgEmail: string
}

export interface PaymentData {
  amount: number
  paidAt: string
  reference?: string
  currency?: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCurrency(amount: number, currency = 'GBP'): string {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency }).format(
    amount / 100,
  )
}

// ---------------------------------------------------------------------------
// Send Functions
// ---------------------------------------------------------------------------

/**
 * Send an invoice email with the PDF attached.
 */
export async function sendInvoiceEmail(
  to: string,
  invoicePdfBuffer: Buffer,
  invoiceData: InvoiceEmailData,
): Promise<void> {
  const resend = getResend()
  const currency = invoiceData.currency ?? 'GBP'
  const paymentSection = invoiceData.paymentLink
    ? `<p style="margin-top:24px;"><a href="${invoiceData.paymentLink}" style="background:#2563eb;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;">Pay Online</a></p>`
    : ''

  const { data, error } = await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: `Invoice ${invoiceData.invoiceNumber} from ${invoiceData.orgName}`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#111;">
        <h1 style="font-size:24px;margin-bottom:4px;">${invoiceData.orgName}</h1>
        <p style="color:#6b7280;margin-top:0;">${invoiceData.orgEmail}</p>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;" />
        <h2 style="font-size:18px;">Invoice ${invoiceData.invoiceNumber}</h2>
        <p>Dear ${invoiceData.clientName},</p>
        <p>Please find attached your invoice for the amount of <strong>${formatCurrency(invoiceData.total, currency)}</strong> due on <strong>${invoiceData.dueDate}</strong>.</p>
        <table style="width:100%;border-collapse:collapse;margin-top:16px;">
          <tr><td style="padding:8px 0;color:#6b7280;">Issue Date</td><td style="padding:8px 0;text-align:right;">${invoiceData.issueDate}</td></tr>
          <tr><td style="padding:8px 0;color:#6b7280;">Due Date</td><td style="padding:8px 0;text-align:right;">${invoiceData.dueDate}</td></tr>
          <tr><td style="padding:8px 0;color:#6b7280;">Subtotal</td><td style="padding:8px 0;text-align:right;">${formatCurrency(invoiceData.subtotal, currency)}</td></tr>
          <tr><td style="padding:8px 0;color:#6b7280;">VAT</td><td style="padding:8px 0;text-align:right;">${formatCurrency(invoiceData.tax, currency)}</td></tr>
          <tr style="font-weight:600;font-size:16px;border-top:2px solid #e5e7eb;">
            <td style="padding:12px 0;">Total Due</td>
            <td style="padding:12px 0;text-align:right;">${formatCurrency(invoiceData.total, currency)}</td>
          </tr>
        </table>
        ${paymentSection}
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:32px 0;" />
        <p style="font-size:12px;color:#9ca3af;">This email was sent by ${invoiceData.orgName} via InvoiceForge UK. If you have any questions, please contact ${invoiceData.orgEmail}.</p>
      </div>
    `,
    attachments: [
      {
        filename: `${invoiceData.invoiceNumber}.pdf`,
        content: invoicePdfBuffer,
      },
    ],
  })
  if (error) {
    console.error('[sendInvoiceEmail] Resend error:', error)
    throw new Error(`Email delivery failed: ${error.message}`)
  }
  console.log('[sendInvoiceEmail] Sent, id:', data?.id)
}

/**
 * Send a payment reminder email for an overdue invoice.
 */
export async function sendPaymentReminderEmail(
  to: string,
  invoiceData: InvoiceEmailData,
  daysOverdue: number,
): Promise<void> {
  const resend = getResend()
  const currency = invoiceData.currency ?? 'GBP'
  const urgency = daysOverdue >= 30 ? 'URGENT: ' : ''
  const paymentSection = invoiceData.paymentLink
    ? `<p style="margin-top:24px;"><a href="${invoiceData.paymentLink}" style="background:#dc2626;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;">Pay Now</a></p>`
    : ''

  await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: `${urgency}Payment Reminder: Invoice ${invoiceData.invoiceNumber} is ${daysOverdue} day${daysOverdue === 1 ? '' : 's'} overdue`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#111;">
        <h1 style="font-size:24px;margin-bottom:4px;">${invoiceData.orgName}</h1>
        <p style="color:#6b7280;margin-top:0;">${invoiceData.orgEmail}</p>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;" />
        <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:16px;margin-bottom:24px;">
          <p style="margin:0;color:#dc2626;font-weight:600;">Invoice ${invoiceData.invoiceNumber} is <strong>${daysOverdue} day${daysOverdue === 1 ? '' : 's'} overdue</strong></p>
        </div>
        <p>Dear ${invoiceData.clientName},</p>
        <p>This is a reminder that invoice <strong>${invoiceData.invoiceNumber}</strong> for <strong>${formatCurrency(invoiceData.total, currency)}</strong> was due on <strong>${invoiceData.dueDate}</strong> and remains unpaid.</p>
        <p>Please arrange payment at your earliest convenience to avoid any disruption to services.</p>
        <table style="width:100%;border-collapse:collapse;margin-top:16px;">
          <tr><td style="padding:8px 0;color:#6b7280;">Invoice Number</td><td style="padding:8px 0;text-align:right;">${invoiceData.invoiceNumber}</td></tr>
          <tr><td style="padding:8px 0;color:#6b7280;">Original Due Date</td><td style="padding:8px 0;text-align:right;">${invoiceData.dueDate}</td></tr>
          <tr><td style="padding:8px 0;color:#6b7280;">Days Overdue</td><td style="padding:8px 0;text-align:right;color:#dc2626;">${daysOverdue}</td></tr>
          <tr style="font-weight:600;font-size:16px;border-top:2px solid #e5e7eb;">
            <td style="padding:12px 0;">Amount Outstanding</td>
            <td style="padding:12px 0;text-align:right;color:#dc2626;">${formatCurrency(invoiceData.total, currency)}</td>
          </tr>
        </table>
        ${paymentSection}
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:32px 0;" />
        <p style="font-size:12px;color:#9ca3af;">This reminder was sent by ${invoiceData.orgName} via InvoiceForge UK. Contact ${invoiceData.orgEmail} if you believe this has been sent in error.</p>
      </div>
    `,
  })
}

/**
 * Send a payment confirmation email when a payment is received.
 */
export async function sendPaymentConfirmationEmail(
  to: string,
  invoiceData: InvoiceEmailData,
  payment: PaymentData,
): Promise<void> {
  const resend = getResend()
  const currency = payment.currency ?? invoiceData.currency ?? 'GBP'

  await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: `Payment Received: Invoice ${invoiceData.invoiceNumber} – Thank You`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#111;">
        <h1 style="font-size:24px;margin-bottom:4px;">${invoiceData.orgName}</h1>
        <p style="color:#6b7280;margin-top:0;">${invoiceData.orgEmail}</p>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;" />
        <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;margin-bottom:24px;">
          <p style="margin:0;color:#16a34a;font-weight:600;">Payment received – thank you!</p>
        </div>
        <p>Dear ${invoiceData.clientName},</p>
        <p>We have received your payment of <strong>${formatCurrency(payment.amount, currency)}</strong> for invoice <strong>${invoiceData.invoiceNumber}</strong>. Thank you for your prompt payment.</p>
        <table style="width:100%;border-collapse:collapse;margin-top:16px;">
          <tr><td style="padding:8px 0;color:#6b7280;">Invoice Number</td><td style="padding:8px 0;text-align:right;">${invoiceData.invoiceNumber}</td></tr>
          <tr><td style="padding:8px 0;color:#6b7280;">Payment Date</td><td style="padding:8px 0;text-align:right;">${payment.paidAt}</td></tr>
          ${payment.reference ? `<tr><td style="padding:8px 0;color:#6b7280;">Reference</td><td style="padding:8px 0;text-align:right;">${payment.reference}</td></tr>` : ''}
          <tr style="font-weight:600;font-size:16px;border-top:2px solid #e5e7eb;">
            <td style="padding:12px 0;">Amount Paid</td>
            <td style="padding:12px 0;text-align:right;color:#16a34a;">${formatCurrency(payment.amount, currency)}</td>
          </tr>
        </table>
        <p style="margin-top:24px;">Please retain this email as your receipt. We look forward to working with you again.</p>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:32px 0;" />
        <p style="font-size:12px;color:#9ca3af;">This receipt was sent by ${invoiceData.orgName} via InvoiceForge UK. Contact ${invoiceData.orgEmail} if you have any questions.</p>
      </div>
    `,
  })
}

/**
 * Send a welcome email when a new organisation signs up.
 */
export async function sendWelcomeEmail(
  to: string,
  orgName: string,
): Promise<void> {
  const resend = getResend()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://invoiceforge.co.uk'

  await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: `Welcome to InvoiceForge UK, ${orgName}!`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#111;">
        <h1 style="font-size:28px;color:#2563eb;">Welcome to InvoiceForge UK</h1>
        <p>Hi there,</p>
        <p>Thanks for signing up! Your organisation <strong>${orgName}</strong> is all set. Here's how to get started:</p>
        <ol style="line-height:2;">
          <li>Complete your organisation profile (logo, address, VAT number)</li>
          <li>Add your first client</li>
          <li>Create and send your first invoice</li>
        </ol>
        <p style="margin-top:24px;">
          <a href="${appUrl}/dashboard" style="background:#2563eb;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;">Go to Dashboard</a>
        </p>
        <p style="margin-top:32px;">If you have any questions, just reply to this email – we're happy to help.</p>
        <p>The InvoiceForge UK Team</p>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:32px 0;" />
        <p style="font-size:12px;color:#9ca3af;">You're receiving this because you signed up for InvoiceForge UK. <a href="${appUrl}/unsubscribe" style="color:#9ca3af;">Unsubscribe</a></p>
      </div>
    `,
  })
}

import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Button,
  Hr,
  Row,
  Column,
  Preview,
  Font,
} from '@react-email/components'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PaymentReminderProps {
  invoiceNumber: string
  clientName: string
  orgName: string
  total: string | number
  dueDate: string
  daysOverdue: number
  paymentLink?: string
  invoiceUrl: string
  orgEmail?: string
  orgPhone?: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getTheme(daysOverdue: number): {
  headerBg: string
  headerText: string
  accentColor: string
  badgeBg: string
  badgeText: string
  subjectLine: string
  urgencyTag: string
} {
  if (daysOverdue > 30) {
    return {
      headerBg: '#dc2626',
      headerText: '#ffffff',
      accentColor: '#dc2626',
      badgeBg: '#fef2f2',
      badgeText: '#b91c1c',
      subjectLine: 'URGENT: Payment significantly overdue',
      urgencyTag: `${daysOverdue} days overdue`,
    }
  }
  if (daysOverdue > 0) {
    return {
      headerBg: '#d97706',
      headerText: '#ffffff',
      accentColor: '#d97706',
      badgeBg: '#fffbeb',
      badgeText: '#92400e',
      subjectLine: 'Payment overdue reminder',
      urgencyTag: `${daysOverdue} day${daysOverdue === 1 ? '' : 's'} overdue`,
    }
  }
  if (daysOverdue === 0) {
    return {
      headerBg: '#ea580c',
      headerText: '#ffffff',
      accentColor: '#ea580c',
      badgeBg: '#fff7ed',
      badgeText: '#9a3412',
      subjectLine: 'Payment due today',
      urgencyTag: 'Due today',
    }
  }
  // Upcoming reminder (daysOverdue < 0)
  return {
    headerBg: '#2563eb',
    headerText: '#ffffff',
    accentColor: '#2563eb',
    badgeBg: '#eff6ff',
    badgeText: '#1e40af',
    subjectLine: 'Upcoming payment reminder',
    urgencyTag: `Due in ${Math.abs(daysOverdue)} day${Math.abs(daysOverdue) === 1 ? '' : 's'}`,
  }
}

function getMessageBody(
  daysOverdue: number,
  clientName: string,
  invoiceNumber: string,
  formattedTotal: string,
  dueDate: string,
  orgName: string,
): string {
  if (daysOverdue > 30) {
    return `We are writing to bring your attention to invoice ${invoiceNumber} for ${formattedTotal}, which is now significantly overdue. Despite our previous reminders, we have not yet received payment. Please arrange payment immediately to avoid further action. If you are experiencing difficulties, please contact us as soon as possible to discuss a payment plan.`
  }
  if (daysOverdue > 0) {
    return `We wanted to remind you that invoice ${invoiceNumber} for ${formattedTotal} was due on ${dueDate} and remains unpaid. Please arrange payment at your earliest convenience to avoid any late payment charges.`
  }
  if (daysOverdue === 0) {
    return `This is a friendly reminder that invoice ${invoiceNumber} for ${formattedTotal} is due for payment today, ${dueDate}. Please arrange payment at your earliest convenience.`
  }
  return `This is a friendly reminder that invoice ${invoiceNumber} for ${formattedTotal} will be due for payment on ${dueDate}. Please ensure funds are available to avoid any delays.`
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const main: React.CSSProperties = {
  backgroundColor: '#f4f4f5',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
}

const container: React.CSSProperties = {
  maxWidth: '600px',
  margin: '0 auto',
  padding: '40px 20px',
}

const card: React.CSSProperties = {
  backgroundColor: '#ffffff',
  borderRadius: '12px',
  overflow: 'hidden',
  boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
}

const bodySection: React.CSSProperties = {
  padding: '40px 40px 32px',
}

const greeting: React.CSSProperties = {
  fontSize: '16px',
  color: '#111827',
  margin: '0 0 16px',
  lineHeight: '1.5',
}

const bodyText: React.CSSProperties = {
  fontSize: '15px',
  color: '#374151',
  margin: '0 0 28px',
  lineHeight: '1.7',
}

const summaryCard: React.CSSProperties = {
  backgroundColor: '#f8fafc',
  borderRadius: '8px',
  border: '1px solid #e2e8f0',
  padding: '24px',
  marginBottom: '28px',
}

const summaryLabel: React.CSSProperties = {
  fontSize: '11px',
  fontWeight: '600',
  color: '#6b7280',
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  margin: '0 0 4px',
}

const summaryValue: React.CSSProperties = {
  fontSize: '14px',
  color: '#111827',
  fontWeight: '500',
  margin: '0',
}

const divider: React.CSSProperties = {
  borderColor: '#e5e7eb',
  margin: '8px 0 16px',
}

const buttonContainer: React.CSSProperties = {
  textAlign: 'center',
  marginBottom: '20px',
}

const viewLink: React.CSSProperties = {
  fontSize: '14px',
  color: '#374151',
  textAlign: 'center',
  margin: '0 0 28px',
}

const latePaymentNote: React.CSSProperties = {
  fontSize: '13px',
  color: '#6b7280',
  margin: '0 0 28px',
  padding: '12px 16px',
  backgroundColor: '#fef3c7',
  borderRadius: '6px',
  borderLeft: '3px solid #f59e0b',
  lineHeight: '1.6',
}

const footer: React.CSSProperties = {
  backgroundColor: '#f8fafc',
  borderTop: '1px solid #e5e7eb',
  padding: '24px 40px',
}

const footerText: React.CSSProperties = {
  fontSize: '12px',
  color: '#6b7280',
  margin: '0 0 4px',
  lineHeight: '1.6',
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function PaymentReminder({
  invoiceNumber,
  clientName,
  orgName,
  total,
  dueDate,
  daysOverdue,
  paymentLink,
  invoiceUrl,
  orgEmail,
  orgPhone,
}: PaymentReminderProps) {
  const formattedTotal =
    typeof total === 'number'
      ? new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(total)
      : total

  const theme = getTheme(daysOverdue)

  const headerStyle: React.CSSProperties = {
    backgroundColor: theme.headerBg,
    padding: '28px 40px',
  }

  const headerTitleStyle: React.CSSProperties = {
    color: theme.headerText,
    fontSize: '20px',
    fontWeight: '700',
    margin: '0 0 4px',
  }

  const badgeStyle: React.CSSProperties = {
    display: 'inline-block',
    backgroundColor: theme.badgeBg,
    color: theme.badgeText,
    fontSize: '12px',
    fontWeight: '600',
    padding: '3px 10px',
    borderRadius: '20px',
    marginTop: '4px',
  }

  const amountValueStyle: React.CSSProperties = {
    fontSize: '28px',
    fontWeight: '800',
    color: theme.accentColor,
    margin: '0',
    letterSpacing: '-0.5px',
  }

  const payButtonStyle: React.CSSProperties = {
    backgroundColor: theme.accentColor,
    color: '#ffffff',
    padding: '14px 36px',
    borderRadius: '8px',
    fontSize: '15px',
    fontWeight: '600',
    textDecoration: 'none',
    display: 'inline-block',
  }

  const messageBody = getMessageBody(daysOverdue, clientName, invoiceNumber, formattedTotal, dueDate, orgName)

  return (
    <Html lang="en">
      <Head>
        <Font
          fontFamily="Inter"
          fallbackFontFamily="sans-serif"
          webFont={{
            url: 'https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiJ-Ek-_EeA.woff2',
            format: 'woff2',
          }}
          fontWeight={400}
          fontStyle="normal"
        />
      </Head>

      <Preview>
        {theme.subjectLine} — Invoice {invoiceNumber} from {orgName} for {formattedTotal}
      </Preview>

      <Body style={main}>
        <Container style={container}>
          <div style={card}>

            {/* ── Header ── */}
            <Section style={headerStyle}>
              <Text style={headerTitleStyle}>{theme.subjectLine}</Text>
              <Text style={headerTitleStyle}>{orgName}</Text>
              <span style={badgeStyle}>{theme.urgencyTag}</span>
            </Section>

            {/* ── Body ── */}
            <Section style={bodySection}>
              <Text style={greeting}>Dear {clientName},</Text>
              <Text style={bodyText}>{messageBody}</Text>

              {/* ── Invoice summary ── */}
              <div style={summaryCard}>
                <Row>
                  <Column style={{ width: '33%', paddingRight: '16px' }}>
                    <Text style={summaryLabel}>Invoice #</Text>
                    <Text style={summaryValue}>{invoiceNumber}</Text>
                  </Column>
                  <Column style={{ width: '33%', paddingRight: '16px' }}>
                    <Text style={summaryLabel}>Due Date</Text>
                    <Text style={summaryValue}>{dueDate}</Text>
                  </Column>
                  <Column style={{ width: '33%' }}>
                    <Text style={summaryLabel}>Status</Text>
                    <Text style={{ ...summaryValue, color: theme.accentColor, fontWeight: '600' }}>
                      {theme.urgencyTag}
                    </Text>
                  </Column>
                </Row>

                <Hr style={divider} />

                <Row>
                  <Column>
                    <Text style={{ ...summaryLabel }}>Amount Due</Text>
                    <Text style={amountValueStyle}>{formattedTotal}</Text>
                  </Column>
                </Row>
              </div>

              {/* ── Late payment interest note (>30 days) ── */}
              {daysOverdue > 30 && (
                <Text style={latePaymentNote}>
                  <strong>Late Payment Notice:</strong> Under the Late Payment of Commercial
                  Debts (Interest) Act 1998, we reserve the right to charge statutory interest
                  at 8% above the Bank of England base rate on overdue amounts, plus
                  compensation for debt recovery costs. We sincerely hope to resolve this
                  without further action.
                </Text>
              )}

              {/* ── Pay Now button ── */}
              {paymentLink && (
                <div style={buttonContainer}>
                  <Button href={paymentLink} style={payButtonStyle}>
                    Pay Now
                  </Button>
                </div>
              )}

              {/* ── View invoice link ── */}
              <Text style={viewLink}>
                <a href={invoiceUrl} style={{ color: theme.accentColor, textDecoration: 'underline' }}>
                  View Invoice Online
                </a>
              </Text>

              <Text style={bodyText}>
                If you have already made payment, please disregard this notice. If you have
                any queries, please do not hesitate to contact us.
              </Text>
            </Section>

            {/* ── Footer ── */}
            <Section style={footer}>
              <Text style={footerText}><strong>{orgName}</strong></Text>
              {orgEmail && <Text style={footerText}>Email: {orgEmail}</Text>}
              {orgPhone && <Text style={footerText}>Tel: {orgPhone}</Text>}
              <Text style={{ ...footerText, marginTop: '8px', color: '#9ca3af' }}>
                This is an automated payment reminder. Please do not reply to this email.
              </Text>
            </Section>

          </div>
        </Container>
      </Body>
    </Html>
  )
}

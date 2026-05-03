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

export interface PaymentConfirmationProps {
  invoiceNumber: string
  clientName: string
  orgName: string
  amount: string | number
  paidAt: string
  method: string
  invoiceUrl: string
  orgEmail?: string
  orgPhone?: string
  orgAddress?: string
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const main: React.CSSProperties = {
  backgroundColor: '#f0fdf4',
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

const header: React.CSSProperties = {
  backgroundColor: '#16a34a',
  padding: '40px 40px 32px',
  textAlign: 'center',
}

const successIconWrapper: React.CSSProperties = {
  display: 'inline-block',
  backgroundColor: 'rgba(255,255,255,0.2)',
  borderRadius: '50%',
  width: '64px',
  height: '64px',
  lineHeight: '64px',
  textAlign: 'center',
  marginBottom: '16px',
  fontSize: '32px',
}

const headerTitle: React.CSSProperties = {
  color: '#ffffff',
  fontSize: '26px',
  fontWeight: '800',
  margin: '0 0 6px',
  letterSpacing: '-0.4px',
}

const headerSubtitle: React.CSSProperties = {
  color: 'rgba(255,255,255,0.85)',
  fontSize: '15px',
  margin: '0',
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
  margin: '0 0 32px',
  lineHeight: '1.7',
}

const summaryCard: React.CSSProperties = {
  backgroundColor: '#f0fdf4',
  borderRadius: '8px',
  border: '1px solid #bbf7d0',
  padding: '24px',
  marginBottom: '32px',
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

const amountLabel: React.CSSProperties = {
  fontSize: '11px',
  fontWeight: '600',
  color: '#6b7280',
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  margin: '0 0 4px',
}

const amountValue: React.CSSProperties = {
  fontSize: '32px',
  fontWeight: '800',
  color: '#16a34a',
  margin: '0',
  letterSpacing: '-0.6px',
}

const divider: React.CSSProperties = {
  borderColor: '#bbf7d0',
  margin: '12px 0 16px',
}

const buttonContainer: React.CSSProperties = {
  textAlign: 'center',
  marginBottom: '24px',
}

const viewButton: React.CSSProperties = {
  backgroundColor: '#16a34a',
  color: '#ffffff',
  padding: '14px 36px',
  borderRadius: '8px',
  fontSize: '15px',
  fontWeight: '600',
  textDecoration: 'none',
  display: 'inline-block',
}

const successNote: React.CSSProperties = {
  fontSize: '14px',
  color: '#374151',
  margin: '0 0 32px',
  padding: '14px 18px',
  backgroundColor: '#f0fdf4',
  borderRadius: '6px',
  border: '1px solid #bbf7d0',
  lineHeight: '1.6',
  textAlign: 'center',
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

export default function PaymentConfirmation({
  invoiceNumber,
  clientName,
  orgName,
  amount,
  paidAt,
  method,
  invoiceUrl,
  orgEmail,
  orgPhone,
  orgAddress,
}: PaymentConfirmationProps) {
  const formattedAmount =
    typeof amount === 'number'
      ? new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(amount)
      : amount

  const methodLabel = method
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())

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
        Payment received — Invoice {invoiceNumber} for {formattedAmount} has been paid. Thank you!
      </Preview>

      <Body style={main}>
        <Container style={container}>
          <div style={card}>

            {/* ── Header ── */}
            <Section style={header}>
              <div style={successIconWrapper}>
                <span style={{ fontSize: '32px', lineHeight: '64px' }}>✓</span>
              </div>
              <Text style={headerTitle}>Payment Received</Text>
              <Text style={headerSubtitle}>
                Thank you — your payment has been confirmed
              </Text>
            </Section>

            {/* ── Body ── */}
            <Section style={bodySection}>
              <Text style={greeting}>Dear {clientName},</Text>

              <Text style={bodyText}>
                We are pleased to confirm that we have received your payment of{' '}
                <strong>{formattedAmount}</strong> for invoice{' '}
                <strong>{invoiceNumber}</strong>. Your account is now up to date.
                Thank you for your prompt payment.
              </Text>

              {/* ── Payment summary ── */}
              <div style={summaryCard}>
                <Row>
                  <Column style={{ width: '50%', paddingRight: '12px' }}>
                    <Text style={summaryLabel}>Invoice #</Text>
                    <Text style={summaryValue}>{invoiceNumber}</Text>
                  </Column>
                  <Column style={{ width: '50%' }}>
                    <Text style={summaryLabel}>Payment Method</Text>
                    <Text style={summaryValue}>{methodLabel}</Text>
                  </Column>
                </Row>

                <Hr style={divider} />

                <Row>
                  <Column style={{ width: '50%', paddingRight: '12px' }}>
                    <Text style={amountLabel}>Amount Paid</Text>
                    <Text style={amountValue}>{formattedAmount}</Text>
                  </Column>
                  <Column style={{ width: '50%' }}>
                    <Text style={summaryLabel}>Date Paid</Text>
                    <Text style={summaryValue}>{paidAt}</Text>
                  </Column>
                </Row>
              </div>

              {/* ── Success note ── */}
              <Text style={successNote}>
                A receipt copy of your invoice is available to view or download online.
              </Text>

              {/* ── View invoice button ── */}
              <div style={buttonContainer}>
                <Button href={invoiceUrl} style={viewButton}>
                  View Invoice &amp; Receipt
                </Button>
              </div>

              <Text style={bodyText}>
                We appreciate your business and look forward to working with you again.
                If you have any questions about this payment, please get in touch.
              </Text>
            </Section>

            {/* ── Footer ── */}
            <Section style={footer}>
              <Text style={footerText}><strong>{orgName}</strong></Text>
              {orgAddress && <Text style={footerText}>{orgAddress}</Text>}
              {orgEmail && <Text style={footerText}>Email: {orgEmail}</Text>}
              {orgPhone && <Text style={footerText}>Tel: {orgPhone}</Text>}
              <Text style={{ ...footerText, marginTop: '8px', color: '#9ca3af' }}>
                This is an automated payment confirmation. Please retain for your records.
              </Text>
            </Section>

          </div>
        </Container>
      </Body>
    </Html>
  )
}

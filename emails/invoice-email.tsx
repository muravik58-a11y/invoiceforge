import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Button,
  Hr,
  Img,
  Row,
  Column,
  Preview,
  Font,
} from '@react-email/components'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface InvoiceEmailProps {
  invoiceNumber: string
  clientName: string
  orgName: string
  orgLogo?: string
  issueDate: string
  dueDate: string
  total: string | number
  paymentLink?: string
  invoiceUrl: string
  orgAddress?: string
  orgVatNumber?: string
  orgEmail?: string
  orgPhone?: string
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

const header: React.CSSProperties = {
  backgroundColor: '#1d4ed8',
  padding: '32px 40px',
}

const headerLogo: React.CSSProperties = {
  height: '40px',
  maxWidth: '160px',
  objectFit: 'contain',
}

const headerTitle: React.CSSProperties = {
  color: '#ffffff',
  fontSize: '22px',
  fontWeight: '700',
  margin: '0',
  letterSpacing: '-0.3px',
}

const body: React.CSSProperties = {
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
  backgroundColor: '#f8fafc',
  borderRadius: '8px',
  border: '1px solid #e2e8f0',
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
  fontSize: '28px',
  fontWeight: '800',
  color: '#1d4ed8',
  margin: '0',
  letterSpacing: '-0.5px',
}

const divider: React.CSSProperties = {
  borderColor: '#e5e7eb',
  margin: '8px 0 16px',
}

const noteText: React.CSSProperties = {
  fontSize: '13px',
  color: '#6b7280',
  margin: '0 0 32px',
  padding: '12px 16px',
  backgroundColor: '#eff6ff',
  borderRadius: '6px',
  borderLeft: '3px solid #3b82f6',
  lineHeight: '1.6',
}

const buttonContainer: React.CSSProperties = {
  textAlign: 'center',
  marginBottom: '24px',
}

const payButton: React.CSSProperties = {
  backgroundColor: '#1d4ed8',
  color: '#ffffff',
  padding: '14px 36px',
  borderRadius: '8px',
  fontSize: '15px',
  fontWeight: '600',
  textDecoration: 'none',
  display: 'inline-block',
}

const viewLink: React.CSSProperties = {
  fontSize: '14px',
  color: '#1d4ed8',
  textAlign: 'center',
  margin: '0 0 32px',
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

export default function InvoiceEmail({
  invoiceNumber,
  clientName,
  orgName,
  orgLogo,
  issueDate,
  dueDate,
  total,
  paymentLink,
  invoiceUrl,
  orgAddress,
  orgVatNumber,
  orgEmail,
  orgPhone,
}: InvoiceEmailProps) {
  const formattedTotal =
    typeof total === 'number'
      ? new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(total)
      : total

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
        Invoice {invoiceNumber} from {orgName} — {formattedTotal} due {dueDate}
      </Preview>

      <Body style={main}>
        <Container style={container}>
          {/* ── Card ── */}
          <div style={card}>

            {/* ── Header ── */}
            <Section style={header}>
              <Row>
                <Column>
                  {orgLogo ? (
                    <Img src={orgLogo} alt={orgName} style={headerLogo} />
                  ) : (
                    <Text style={headerTitle}>{orgName}</Text>
                  )}
                </Column>
              </Row>
            </Section>

            {/* ── Body ── */}
            <Section style={body}>
              <Text style={greeting}>Dear {clientName},</Text>

              <Text style={bodyText}>
                Please find attached your invoice <strong>{invoiceNumber}</strong> from{' '}
                <strong>{orgName}</strong> for the amount of{' '}
                <strong>{formattedTotal}</strong>. Payment is due by{' '}
                <strong>{dueDate}</strong>.
              </Text>

              {/* ── Summary card ── */}
              <div style={summaryCard}>
                <Row>
                  <Column style={{ width: '33%', paddingRight: '16px' }}>
                    <Text style={summaryLabel}>Invoice #</Text>
                    <Text style={summaryValue}>{invoiceNumber}</Text>
                  </Column>
                  <Column style={{ width: '33%', paddingRight: '16px' }}>
                    <Text style={summaryLabel}>Issue Date</Text>
                    <Text style={summaryValue}>{issueDate}</Text>
                  </Column>
                  <Column style={{ width: '33%' }}>
                    <Text style={summaryLabel}>Due Date</Text>
                    <Text style={summaryValue}>{dueDate}</Text>
                  </Column>
                </Row>

                <Hr style={divider} />

                <Row>
                  <Column>
                    <Text style={amountLabel}>Amount Due</Text>
                    <Text style={amountValue}>{formattedTotal}</Text>
                  </Column>
                </Row>
              </div>

              {/* ── Attachment note ── */}
              <Text style={noteText}>
                This invoice is attached as a PDF to this email. You can also view or
                download it online using the link below.
              </Text>

              {/* ── Pay Now button ── */}
              {paymentLink && (
                <div style={buttonContainer}>
                  <Button href={paymentLink} style={payButton}>
                    Pay Now
                  </Button>
                </div>
              )}

              {/* ── View invoice link ── */}
              <Text style={viewLink}>
                <a href={invoiceUrl} style={{ color: '#1d4ed8', textDecoration: 'underline' }}>
                  View Invoice Online
                </a>
              </Text>
            </Section>

            {/* ── Footer ── */}
            <Section style={footer}>
              <Text style={footerText}>
                <strong>{orgName}</strong>
              </Text>
              {orgAddress && (
                <Text style={footerText}>{orgAddress}</Text>
              )}
              {orgVatNumber && (
                <Text style={footerText}>VAT Registration No: {orgVatNumber}</Text>
              )}
              {orgEmail && (
                <Text style={footerText}>Email: {orgEmail}</Text>
              )}
              {orgPhone && (
                <Text style={footerText}>Tel: {orgPhone}</Text>
              )}
              <Text style={{ ...footerText, marginTop: '12px', color: '#9ca3af' }}>
                This email and its attachments are confidential and intended solely for the
                use of the named recipient. If you have received this email in error, please
                notify the sender and delete it immediately.
              </Text>
            </Section>

          </div>
        </Container>
      </Body>
    </Html>
  )
}

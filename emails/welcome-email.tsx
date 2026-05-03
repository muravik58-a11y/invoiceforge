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
  Link,
} from '@react-email/components'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface WelcomeEmailProps {
  userName: string
  orgName: string
  dashboardUrl?: string
}

// ---------------------------------------------------------------------------
// Onboarding steps
// ---------------------------------------------------------------------------

const BASE_URL = 'https://invoiceforge.uk'

const ONBOARDING_STEPS = [
  {
    number: '1',
    title: 'Set up your company details',
    description: 'Add your business name, address, VAT number, and bank details.',
    link: `${BASE_URL}/settings`,
    linkLabel: 'Go to Settings →',
  },
  {
    number: '2',
    title: 'Add your first client',
    description: 'Create your client database and keep all contacts in one place.',
    link: `${BASE_URL}/dashboard/clients/new`,
    linkLabel: 'Add a Client →',
  },
  {
    number: '3',
    title: 'Create your first invoice',
    description: 'Issue a professional, HMRC-compliant invoice in minutes.',
    link: `${BASE_URL}/dashboard/invoices/new`,
    linkLabel: 'Create Invoice →',
  },
]

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
  background: 'linear-gradient(135deg, #1d4ed8 0%, #4f46e5 100%)',
  padding: '40px 40px 36px',
}

const logo: React.CSSProperties = {
  fontSize: '22px',
  fontWeight: '800',
  color: '#ffffff',
  margin: '0 0 8px',
  letterSpacing: '-0.5px',
}

const headerSubtitle: React.CSSProperties = {
  color: 'rgba(255,255,255,0.8)',
  fontSize: '14px',
  margin: '0',
}

const bodySection: React.CSSProperties = {
  padding: '40px 40px 36px',
}

const welcomeHeading: React.CSSProperties = {
  fontSize: '24px',
  fontWeight: '700',
  color: '#111827',
  margin: '0 0 12px',
  letterSpacing: '-0.3px',
}

const bodyText: React.CSSProperties = {
  fontSize: '15px',
  color: '#374151',
  margin: '0 0 32px',
  lineHeight: '1.7',
}

const sectionHeading: React.CSSProperties = {
  fontSize: '13px',
  fontWeight: '700',
  color: '#6b7280',
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  margin: '0 0 16px',
}

const stepCard: React.CSSProperties = {
  backgroundColor: '#f8fafc',
  borderRadius: '8px',
  border: '1px solid #e2e8f0',
  padding: '20px',
  marginBottom: '12px',
}

const stepNumberBadge: React.CSSProperties = {
  display: 'inline-block',
  backgroundColor: '#1d4ed8',
  color: '#ffffff',
  fontSize: '12px',
  fontWeight: '700',
  width: '24px',
  height: '24px',
  borderRadius: '50%',
  textAlign: 'center',
  lineHeight: '24px',
  marginBottom: '10px',
}

const stepTitle: React.CSSProperties = {
  fontSize: '15px',
  fontWeight: '600',
  color: '#111827',
  margin: '0 0 4px',
}

const stepDescription: React.CSSProperties = {
  fontSize: '13px',
  color: '#6b7280',
  margin: '0 0 10px',
  lineHeight: '1.5',
}

const stepLink: React.CSSProperties = {
  fontSize: '13px',
  color: '#1d4ed8',
  fontWeight: '500',
  textDecoration: 'none',
}

const divider: React.CSSProperties = {
  borderColor: '#e5e7eb',
  margin: '32px 0',
}

const buttonContainer: React.CSSProperties = {
  textAlign: 'center',
  marginBottom: '32px',
}

const dashboardButton: React.CSSProperties = {
  backgroundColor: '#1d4ed8',
  color: '#ffffff',
  padding: '14px 40px',
  borderRadius: '8px',
  fontSize: '15px',
  fontWeight: '600',
  textDecoration: 'none',
  display: 'inline-block',
}

const helpText: React.CSSProperties = {
  fontSize: '14px',
  color: '#6b7280',
  textAlign: 'center',
  margin: '0',
  lineHeight: '1.6',
}

const footer: React.CSSProperties = {
  backgroundColor: '#f8fafc',
  borderTop: '1px solid #e5e7eb',
  padding: '24px 40px',
}

const footerText: React.CSSProperties = {
  fontSize: '12px',
  color: '#9ca3af',
  margin: '0 0 4px',
  textAlign: 'center',
  lineHeight: '1.6',
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function WelcomeEmail({
  userName,
  orgName,
  dashboardUrl = `${BASE_URL}/dashboard`,
}: WelcomeEmailProps) {
  const firstName = userName.split(' ')[0] ?? userName

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
        Welcome to InvoiceForge UK, {firstName}! Your account for {orgName} is ready.
      </Preview>

      <Body style={main}>
        <Container style={container}>
          <div style={card}>

            {/* ── Header ── */}
            <Section style={header}>
              <Text style={logo}>InvoiceForge UK</Text>
              <Text style={headerSubtitle}>Professional invoicing for UK businesses</Text>
            </Section>

            {/* ── Body ── */}
            <Section style={bodySection}>
              <Text style={welcomeHeading}>Welcome aboard, {firstName}! 👋</Text>

              <Text style={bodyText}>
                Your InvoiceForge UK account for <strong>{orgName}</strong> is all set up
                and ready to go. You can now create HMRC-compliant invoices, track payments,
                and manage your clients — all from one place.
              </Text>

              {/* ── Onboarding checklist ── */}
              <Text style={sectionHeading}>Get started in 3 steps</Text>

              {ONBOARDING_STEPS.map((step) => (
                <div key={step.number} style={stepCard}>
                  <div style={stepNumberBadge}>{step.number}</div>
                  <Text style={stepTitle}>{step.title}</Text>
                  <Text style={stepDescription}>{step.description}</Text>
                  <Link href={step.link} style={stepLink}>
                    {step.linkLabel}
                  </Link>
                </div>
              ))}

              <Hr style={divider} />

              {/* ── CTA button ── */}
              <div style={buttonContainer}>
                <Button href={dashboardUrl} style={dashboardButton}>
                  Go to Dashboard
                </Button>
              </div>

              <Text style={helpText}>
                Need help? Visit our{' '}
                <Link href={`${BASE_URL}/help`} style={{ color: '#1d4ed8' }}>
                  Help Centre
                </Link>{' '}
                or email us at{' '}
                <Link href="mailto:support@invoiceforge.uk" style={{ color: '#1d4ed8' }}>
                  support@invoiceforge.uk
                </Link>
              </Text>
            </Section>

            {/* ── Footer ── */}
            <Section style={footer}>
              <Text style={footerText}>InvoiceForge UK — Professional Invoicing</Text>
              <Text style={footerText}>
                You received this email because you created an account at{' '}
                <Link href={BASE_URL} style={{ color: '#6b7280' }}>
                  invoiceforge.uk
                </Link>
              </Text>
              <Text style={footerText}>
                <Link href={`${BASE_URL}/settings/notifications`} style={{ color: '#6b7280' }}>
                  Manage email preferences
                </Link>
                {' · '}
                <Link href={`${BASE_URL}/privacy`} style={{ color: '#6b7280' }}>
                  Privacy Policy
                </Link>
              </Text>
            </Section>

          </div>
        </Container>
      </Body>
    </Html>
  )
}

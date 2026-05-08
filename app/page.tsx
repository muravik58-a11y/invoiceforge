'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  SignInButton,
  SignUpButton,
  UserButton,
  useAuth,
} from '@clerk/nextjs'
import { useTheme } from 'next-themes'
import {
  FileText,
  BarChart3,
  RefreshCcw,
  Users,
  Package,
  ShieldCheck,
  ChevronDown,
  Menu,
  X,
  Sun,
  Moon,
  ArrowRight,
  Star,
  Zap,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PricingSection } from '@/components/landing/pricing-section'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'

// ─── Data ────────────────────────────────────────────────────────────────────

const features = [
  {
    icon: ShieldCheck,
    title: 'UK VAT Compliant',
    description:
      'Automatically calculate VAT at 20%, 5%, or 0% rates. Generate HMRC-ready VAT returns and stay fully compliant with Making Tax Digital requirements.',
  },
  {
    icon: FileText,
    title: 'Professional PDFs',
    description:
      'Send beautifully branded invoices as PDFs in seconds. Customise with your logo, payment terms, and bank details — all formatted to UK standards.',
  },
  {
    icon: RefreshCcw,
    title: 'Recurring Invoices',
    description:
      'Automate billing for retainer clients. Set up weekly, monthly, or custom schedules and let InvoiceForge handle the paperwork while you focus on work.',
  },
  {
    icon: Users,
    title: 'Client CRM',
    description:
      'Keep all your client details, contact history, and outstanding balances in one place. Never chase a late payment without the full picture again.',
  },
  {
    icon: Package,
    title: 'Inventory Management',
    description:
      'Track stock levels, set reorder alerts, and tie inventory directly to invoices. Perfect for product-based UK businesses of any size.',
  },
  {
    icon: BarChart3,
    title: 'Financial Reports',
    description:
      'Profit & loss, aged debtors, VAT summaries, and cash-flow forecasts — all exportable to CSV for your accountant or HMRC submission.',
  },
]

const testimonials = [
  {
    quote:
      "InvoiceForge has completely transformed how I handle billing. The VAT calculations are spot-on and my accountant loves the MTD exports. Switched from spreadsheets six months ago and haven't looked back.",
    author: 'Sarah Mitchell',
    role: 'Freelance Graphic Designer',
    location: 'Manchester',
    stars: 5,
  },
  {
    quote:
      "We run a small plumbing company with five engineers and InvoiceForge handles everything — invoicing on-site from a tablet, inventory for parts, and the aged debtors report has genuinely improved our cash flow.",
    author: 'James Thornton',
    role: 'Director, Thornton & Sons Plumbing Ltd',
    location: 'Bristol',
    stars: 5,
  },
  {
    quote:
      "The recurring invoices feature alone saves me at least two hours a week. As a London-based marketing consultant with a mix of retainer and project clients, the flexibility of InvoiceForge is exactly what I needed.",
    author: 'Priya Kapoor',
    role: 'Marketing Consultant',
    location: 'London',
    stars: 5,
  },
]

const faqs = [
  {
    question: 'Is InvoiceForge UK Making Tax Digital (MTD) compliant?',
    answer:
      'Yes. InvoiceForge UK is built with MTD for VAT in mind. You can export your VAT data in the HMRC-compatible format and submit directly through our MTD-bridging integration.',
  },
  {
    question: 'How does VAT calculation work?',
    answer:
      'InvoiceForge automatically applies the correct UK VAT rate — 20% standard, 5% reduced, or 0% zero-rated — to each line item on your invoice. VAT summaries are included on every invoice.',
  },
  {
    question: 'Can I use InvoiceForge for both products and services?',
    answer:
      'Absolutely. InvoiceForge supports mixed invoices containing both service line items and product lines drawn from your inventory.',
  },
  {
    question: 'Is my data stored securely in the UK?',
    answer:
      "Yes. All customer data is stored in EU/UK-region data centres and we are fully GDPR-compliant. Your invoices, client records, and financial data belong to you.",
  },
  {
    question: 'Can I try InvoiceForge before paying?',
    answer:
      'Yes. Our Free plan lets you send up to 5 invoices per month with no time limit. The Pro plan comes with a 14-day free trial with full access — no credit card required.',
  },
  {
    question: 'Does InvoiceForge integrate with accounting software?',
    answer:
      'We offer CSV and PDF exports compatible with Xero, QuickBooks, Sage, and FreeAgent. A direct Xero API integration is on our roadmap for Q3 2026.',
  },
]

// ─── Sub-components ───────────────────────────────────────────────────────────

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  return (
    <button
      onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
      aria-label="Toggle colour scheme"
      className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
    >
      {mounted && resolvedTheme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </button>
  )
}

function FaqItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-b border-border last:border-0">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between py-5 text-left text-sm font-medium transition-colors hover:text-primary"
      >
        <span>{question}</span>
        <ChevronDown
          className={`ml-4 size-4 shrink-0 text-muted-foreground transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <p className="pb-5 text-sm text-muted-foreground leading-relaxed">{answer}</p>
      )}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { isSignedIn } = useAuth()

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* ── Navbar ── */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
        <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2 font-bold text-lg tracking-tight">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground text-xs font-black shadow-sm">
              IF
            </span>
            <span>InvoiceForge <span className="text-primary">UK</span></span>
          </Link>

          <div className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">Features</a>
            <a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a>
            <a href="#faq" className="hover:text-foreground transition-colors">FAQ</a>
          </div>

          <div className="hidden md:flex items-center gap-2">
            <ThemeToggle />
            {isSignedIn ? (
              <>
                <Button nativeButton={false} render={<Link href="/dashboard" />} size="sm" variant="outline">
                  Dashboard
                </Button>
                <UserButton />
              </>
            ) : (
              <>
                <SignInButton mode="modal" forceRedirectUrl="/dashboard">
                  <Button variant="ghost" size="sm">Sign in</Button>
                </SignInButton>
                <SignUpButton mode="modal" forceRedirectUrl="/onboarding">
                  <Button size="sm">
                    Start free trial
                    <ArrowRight className="ml-1 size-3.5" />
                  </Button>
                </SignUpButton>
              </>
            )}
          </div>

          <div className="flex md:hidden items-center gap-2">
            <ThemeToggle />
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground"
            >
              {mobileMenuOpen ? <X className="size-4" /> : <Menu className="size-4" />}
            </button>
          </div>
        </nav>

        {mobileMenuOpen && (
          <div className="md:hidden border-t border-border bg-background px-4 pb-4 pt-2 flex flex-col gap-3">
            <a href="#features" onClick={() => setMobileMenuOpen(false)} className="py-2 text-sm text-muted-foreground hover:text-foreground">Features</a>
            <a href="#pricing" onClick={() => setMobileMenuOpen(false)} className="py-2 text-sm text-muted-foreground hover:text-foreground">Pricing</a>
            <a href="#faq" onClick={() => setMobileMenuOpen(false)} className="py-2 text-sm text-muted-foreground hover:text-foreground">FAQ</a>
            <div className="flex flex-col gap-2 pt-2 border-t border-border">
              {isSignedIn ? (
                <Button nativeButton={false} render={<Link href="/dashboard" />} variant="outline" className="w-full">
                  Go to Dashboard
                </Button>
              ) : (
                <>
                  <SignInButton mode="modal" forceRedirectUrl="/dashboard">
                    <Button variant="outline" className="w-full">Sign in</Button>
                  </SignInButton>
                  <SignUpButton mode="modal" forceRedirectUrl="/onboarding">
                    <Button className="w-full">Start free trial</Button>
                  </SignUpButton>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      <main className="flex-1">
        {/* ── Hero ── */}
        <section className="relative overflow-hidden py-20 sm:py-28 lg:py-36">
          <div aria-hidden className="pointer-events-none absolute -top-60 left-1/2 h-[600px] w-[900px] -translate-x-1/2 rounded-full bg-primary/8 blur-3xl" />
          <div aria-hidden className="pointer-events-none absolute top-1/2 -right-40 h-72 w-72 rounded-full bg-primary/6 blur-3xl" />

          <div className="relative mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1.5 text-xs font-medium text-primary">
              <Zap className="size-3" />
              HMRC-ready · Making Tax Digital compliant
            </div>

            <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl leading-[1.1]">
              Simple, compliant invoicing{' '}
              <span className="bg-gradient-to-r from-primary to-[oklch(0.58_0.22_280)] bg-clip-text text-transparent">
                + inventory
              </span>{' '}
              <br className="hidden sm:block" />
              for UK businesses
            </h1>

            <p className="mt-6 max-w-2xl mx-auto text-lg text-muted-foreground leading-relaxed">
              Send professional, VAT-compliant invoices in minutes. Manage stock, chase late
              payers, and export HMRC-ready reports — all in one place built for the UK market.
            </p>

            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
              <SignUpButton mode="modal">
                <Button size="lg" className="h-11 px-8 text-base shadow-md shadow-primary/20">
                  Start Free Trial
                  <ArrowRight className="ml-2 size-4" />
                </Button>
              </SignUpButton>
              <Button
                nativeButton={false} render={<Link href="/dashboard" />}
                variant="outline"
                size="lg"
                className="h-11 px-8 text-base"
              >
                View Demo
              </Button>
            </div>

            <p className="mt-4 text-xs text-muted-foreground">
              No credit card required · Free plan available · Cancel any time
            </p>

            <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5"><ShieldCheck className="size-3.5 text-primary" />GDPR compliant</span>
              <span className="flex items-center gap-1.5"><ShieldCheck className="size-3.5 text-primary" />UK data centres</span>
              <span className="flex items-center gap-1.5"><ShieldCheck className="size-3.5 text-primary" />Making Tax Digital ready</span>
              <span className="flex items-center gap-1.5"><Star className="size-3.5 text-yellow-500 fill-yellow-500" />4.9/5 from 300+ UK businesses</span>
            </div>
          </div>
        </section>

        {/* ── Features ── */}
        <section id="features" className="py-20 sm:py-24 bg-muted/30">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-14">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Everything you need to run your UK business
              </h2>
              <p className="mt-4 text-muted-foreground max-w-xl mx-auto">
                Purpose-built for sole traders, limited companies, and partnerships operating under UK tax law.
              </p>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((feature) => {
                const Icon = feature.icon
                return (
                  <Card key={feature.title} className="transition-shadow hover:shadow-md hover:shadow-primary/5">
                    <CardHeader>
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary mb-2">
                        <Icon className="size-5" />
                      </div>
                      <CardTitle className="text-base">{feature.title}</CardTitle>
                      <CardDescription>{feature.description}</CardDescription>
                    </CardHeader>
                  </Card>
                )
              })}
            </div>
          </div>
        </section>

        {/* ── Pricing ── */}
        <PricingSection />

        {/* ── Testimonials ── */}
        <section className="py-20 sm:py-24 bg-muted/30">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-14">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Trusted by UK businesses
              </h2>
              <p className="mt-4 text-muted-foreground">
                Hear from sole traders and companies already using InvoiceForge UK.
              </p>
            </div>

            <div className="grid gap-6 sm:grid-cols-3">
              {testimonials.map((t) => (
                <Card key={t.author}>
                  <CardContent className="pt-4">
                    <div className="flex gap-0.5 mb-4">
                      {Array.from({ length: t.stars }).map((_, i) => (
                        <Star key={i} className="size-4 text-yellow-500 fill-yellow-500" />
                      ))}
                    </div>
                    <blockquote className="text-sm text-muted-foreground leading-relaxed mb-5">
                      &ldquo;{t.quote}&rdquo;
                    </blockquote>
                    <div>
                      <p className="text-sm font-semibold">{t.author}</p>
                      <p className="text-xs text-muted-foreground">{t.role}</p>
                      <p className="text-xs text-muted-foreground">{t.location}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* ── FAQ ── */}
        <section id="faq" className="py-20 sm:py-24">
          <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-14">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Frequently asked questions
              </h2>
              <p className="mt-4 text-muted-foreground">
                Everything you need to know about InvoiceForge UK and VAT compliance.
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card px-6">
              {faqs.map((faq) => (
                <FaqItem key={faq.question} question={faq.question} answer={faq.answer} />
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA Banner ── */}
        <section className="py-20 sm:py-24 bg-primary">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl font-extrabold text-primary-foreground sm:text-4xl">
              Ready to take control of your invoicing?
            </h2>
            <p className="mt-4 text-primary-foreground/80 max-w-xl mx-auto">
              Join thousands of UK businesses saving hours every month. Get started free — upgrade when you need to.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              <SignUpButton mode="modal">
                <Button size="lg" className="h-11 px-8 text-base bg-white text-primary hover:bg-white/90">
                  Start Free Trial
                  <ArrowRight className="ml-2 size-4" />
                </Button>
              </SignUpButton>
              <Button
                nativeButton={false} render={<Link href="#pricing" />}
                size="lg"
                variant="outline"
                className="h-11 px-8 text-base border-white/30 text-primary-foreground hover:bg-white/10 hover:text-primary-foreground"
              >
                See pricing
              </Button>
            </div>
          </div>
        </section>
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-border bg-background">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <div className="lg:col-span-1">
              <Link href="/" className="flex items-center gap-2 font-bold tracking-tight">
                <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground text-xs font-black">IF</span>
                InvoiceForge UK
              </Link>
              <p className="mt-3 text-xs text-muted-foreground leading-relaxed">
                Simple, HMRC-compliant invoicing and inventory management for UK businesses of every size.
              </p>
            </div>

            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Product</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {['Features', 'Pricing', 'Changelog', 'Roadmap'].map((l) => (
                  <li key={l}><a href="#" className="hover:text-foreground transition-colors">{l}</a></li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Company</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {['About', 'Blog', 'Careers', 'Contact'].map((l) => (
                  <li key={l}><a href="#" className="hover:text-foreground transition-colors">{l}</a></li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Legal</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {['Privacy Policy', 'Terms of Service', 'Cookie Policy', 'GDPR'].map((l) => (
                  <li key={l}><a href="#" className="hover:text-foreground transition-colors">{l}</a></li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-10 pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
            <p>© {new Date().getFullYear()} InvoiceForge UK Ltd. All rights reserved.</p>
            <p>Registered in England &amp; Wales · ICO registered · GDPR compliant</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Sign in – InvoiceForge UK',
}

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center bg-background overflow-hidden">
      {/* Subtle background grid pattern */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] bg-[size:48px_48px] opacity-40"
      />

      {/* Gradient blobs for depth */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 -left-40 h-96 w-96 rounded-full bg-primary/10 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-primary/10 blur-3xl"
      />

      {/* Logo bar */}
      <a
        href="/"
        className="relative z-10 mb-8 flex items-center gap-2 text-primary font-bold text-xl tracking-tight"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground text-sm font-black shadow">
          IF
        </span>
        InvoiceForge UK
      </a>

      {/* Auth card content */}
      <div className="relative z-10 w-full">{children}</div>

      {/* Footer note */}
      <p className="relative z-10 mt-8 text-xs text-muted-foreground">
        By continuing, you agree to our{' '}
        <a href="/terms" className="underline underline-offset-2 hover:text-foreground transition-colors">
          Terms of Service
        </a>{' '}
        and{' '}
        <a href="/privacy" className="underline underline-offset-2 hover:text-foreground transition-colors">
          Privacy Policy
        </a>
        .
      </p>
    </div>
  )
}

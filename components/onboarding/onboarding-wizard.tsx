'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import {
  CheckIcon,
  ArrowRightIcon,
  ArrowLeftIcon,
  BuildingIcon,
  ImageIcon,
  BanknoteIcon,
  PartyPopperIcon,
  Loader2Icon,
  SparklesIcon,
  FileTextIcon,
} from 'lucide-react'
import type { Organization } from '@prisma/client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { UploadButton } from '@/lib/uploadthing'
import { updateOrganization } from '@/lib/actions/organization'
import { cn } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Types & Steps
// ---------------------------------------------------------------------------

interface OnboardingWizardProps {
  org: Organization
}

type StepId = 'welcome' | 'company' | 'logo' | 'banking' | 'done'

interface Step {
  id: StepId
  title: string
  description: string
  icon: React.ReactNode
}

const STEPS: Step[] = [
  {
    id: 'welcome',
    title: 'Welcome',
    description: 'Introduction',
    icon: <SparklesIcon className="h-5 w-5" />,
  },
  {
    id: 'company',
    title: 'Company Details',
    description: 'Name, VAT, Address',
    icon: <BuildingIcon className="h-5 w-5" />,
  },
  {
    id: 'logo',
    title: 'Logo',
    description: 'Brand your invoices',
    icon: <ImageIcon className="h-5 w-5" />,
  },
  {
    id: 'banking',
    title: 'Bank Details',
    description: 'Payment information',
    icon: <BanknoteIcon className="h-5 w-5" />,
  },
  {
    id: 'done',
    title: 'All Done!',
    description: 'Ready to invoice',
    icon: <PartyPopperIcon className="h-5 w-5" />,
  },
]

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const companySchema = z.object({
  companyName: z.string().min(1, 'Company name is required').max(200),
  vatNumber: z.string().optional(),
  addressLine1: z.string().optional(),
  addressLine2: z.string().optional(),
  city: z.string().optional(),
  county: z.string().optional(),
  postcode: z.string().optional(),
  country: z.string().optional(),
})

const bankingSchema = z.object({
  bankName: z.string().optional(),
  bankSortCode: z.string().optional(),
  bankAccountNumber: z.string().optional(),
  bankIban: z.string().optional(),
  paymentReference: z.string().optional(),
})

type CompanyFormValues = z.infer<typeof companySchema>
type BankingFormValues = z.infer<typeof bankingSchema>

// ---------------------------------------------------------------------------
// Confetti component (CSS-only animation)
// ---------------------------------------------------------------------------

function Confetti() {
  const pieces = React.useMemo(
    () =>
      Array.from({ length: 30 }, (_, i) => ({
        id: i,
        color: ['#2563EB', '#16a34a', '#f59e0b', '#ec4899', '#8b5cf6'][i % 5],
        left: `${Math.random() * 100}%`,
        animDelay: `${Math.random() * 2}s`,
        animDuration: `${2 + Math.random() * 2}s`,
        size: `${8 + Math.random() * 8}px`,
      })),
    [],
  )

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <style>{`
        @keyframes confetti-fall {
          0% { transform: translateY(-20px) rotate(0deg); opacity: 1; }
          100% { transform: translateY(400px) rotate(720deg); opacity: 0; }
        }
        .confetti-piece {
          position: absolute;
          top: -20px;
          border-radius: 2px;
          animation: confetti-fall linear forwards;
        }
      `}</style>
      {pieces.map((p) => (
        <div
          key={p.id}
          className="confetti-piece"
          style={{
            left: p.left,
            backgroundColor: p.color,
            width: p.size,
            height: p.size,
            animationDelay: p.animDelay,
            animationDuration: p.animDuration,
          }}
        />
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main Wizard Component
// ---------------------------------------------------------------------------

export function OnboardingWizard({ org }: OnboardingWizardProps) {
  const router = useRouter()
  const [currentStep, setCurrentStep] = React.useState<number>(0)
  const [saving, setSaving] = React.useState(false)
  const [logoUrl, setLogoUrl] = React.useState<string>(org.logo ?? '')
  const [showConfetti, setShowConfetti] = React.useState(false)

  const currentStepData = STEPS[currentStep]
  const progress = (currentStep / (STEPS.length - 1)) * 100

  // ── Company form ────────────────────────────────────────────────────────
  const companyForm = useForm<CompanyFormValues>({
    resolver: zodResolver(companySchema),
    defaultValues: {
      companyName: org.companyName ?? org.name ?? '',
      vatNumber: org.vatNumber ?? '',
      addressLine1: org.addressLine1 ?? '',
      addressLine2: org.addressLine2 ?? '',
      city: org.city ?? '',
      county: org.county ?? '',
      postcode: org.postcode ?? '',
      country: org.country ?? 'United Kingdom',
    },
  })

  // ── Banking form ────────────────────────────────────────────────────────
  const bankingForm = useForm<BankingFormValues>({
    resolver: zodResolver(bankingSchema),
    defaultValues: {
      bankName: org.bankName ?? '',
      bankSortCode: org.bankSortCode ?? '',
      bankAccountNumber: org.bankAccountNumber ?? '',
      bankIban: org.bankIban ?? '',
      paymentReference: org.paymentReference ?? '',
    },
  })

  // ── Navigation helpers ─────────────────────────────────────────────────
  function goNext() {
    setCurrentStep((s) => Math.min(s + 1, STEPS.length - 1))
  }

  function goPrev() {
    setCurrentStep((s) => Math.max(s - 1, 0))
  }

  function skip() {
    goNext()
  }

  // ── Save & advance ──────────────────────────────────────────────────────
  async function saveAndNext(data: Record<string, unknown>) {
    setSaving(true)
    try {
      await updateOrganization(org.id, data as any)
      goNext()
    } catch {
      toast.error('Failed to save. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  async function saveCompany(values: CompanyFormValues) {
    await saveAndNext(values)
  }

  async function saveLogo() {
    if (logoUrl) {
      await saveAndNext({ logo: logoUrl })
    } else {
      goNext()
    }
  }

  async function saveBanking(values: BankingFormValues) {
    setSaving(true)
    try {
      await updateOrganization(org.id, values)
      setShowConfetti(true)
      goNext()
    } catch {
      toast.error('Failed to save. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-950 dark:to-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Progress header */}
        <div className="mb-8 text-center">
          <div className="mb-2 flex items-center justify-center gap-2">
            <FileTextIcon className="h-6 w-6 text-blue-600" />
            <span className="text-xl font-bold text-blue-600">InvoiceForge UK</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Step {currentStep + 1} of {STEPS.length}
          </p>
          <Progress value={progress} className="mt-3 h-2" />
        </div>

        {/* Step indicators */}
        <div className="mb-6 flex items-center justify-center gap-2 sm:gap-4">
          {STEPS.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition-all',
                  index < currentStep
                    ? 'bg-green-500 text-white'
                    : index === currentStep
                      ? 'bg-blue-600 text-white ring-4 ring-blue-200'
                      : 'bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400',
                )}
              >
                {index < currentStep ? (
                  <CheckIcon className="h-4 w-4" />
                ) : (
                  <span>{index + 1}</span>
                )}
              </div>
              {index < STEPS.length - 1 && (
                <div
                  className={cn(
                    'mx-1 h-0.5 w-6 sm:w-12 transition-all',
                    index < currentStep ? 'bg-green-400' : 'bg-gray-200 dark:bg-gray-700',
                  )}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step content card */}
        <div className="relative overflow-hidden rounded-2xl border bg-background shadow-xl">
          {/* ── Step 0: Welcome ── */}
          {currentStep === 0 && (
            <div className="p-8 text-center">
              <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
                <SparklesIcon className="h-10 w-10 text-blue-600" />
              </div>
              <h1 className="text-3xl font-bold">Welcome to InvoiceForge UK!</h1>
              <p className="mt-3 text-muted-foreground">
                Let&apos;s set up your account in just a few minutes. We&apos;ll guide you through
                adding your company details, logo, and bank information so you can send
                professional invoices right away.
              </p>

              <div className="mt-8 grid gap-3 text-left sm:grid-cols-3">
                {[
                  { icon: BuildingIcon, title: 'Company Profile', desc: 'Add your details & VAT number' },
                  { icon: ImageIcon, title: 'Brand Your Invoices', desc: 'Upload your logo' },
                  { icon: BanknoteIcon, title: 'Get Paid Faster', desc: 'Add bank payment details' },
                ].map(({ icon: Icon, title, desc }) => (
                  <div
                    key={title}
                    className="flex flex-col items-center rounded-xl border bg-muted/30 p-4 text-center"
                  >
                    <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
                      <Icon className="h-5 w-5 text-blue-600" />
                    </div>
                    <p className="text-sm font-semibold">{title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{desc}</p>
                  </div>
                ))}
              </div>

              <div className="mt-8 flex justify-end">
                <Button size="lg" onClick={goNext}>
                  Get Started
                  <ArrowRightIcon className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* ── Step 1: Company Details ── */}
          {currentStep === 1 && (
            <div className="p-8">
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
                  <BuildingIcon className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Company Details</h2>
                  <p className="text-sm text-muted-foreground">
                    This information will appear on your invoices.
                  </p>
                </div>
              </div>

              <form onSubmit={companyForm.handleSubmit(saveCompany)} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2 space-y-1.5">
                    <Label htmlFor="companyName">Company Name *</Label>
                    <Input
                      id="companyName"
                      {...companyForm.register('companyName')}
                      placeholder="Acme Ltd"
                    />
                    {companyForm.formState.errors.companyName && (
                      <p className="text-xs text-destructive">
                        {companyForm.formState.errors.companyName.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="vatNumber">VAT Number</Label>
                    <Input
                      id="vatNumber"
                      {...companyForm.register('vatNumber')}
                      placeholder="GB123456789"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="country">Country</Label>
                    <Input
                      id="country"
                      {...companyForm.register('country')}
                      placeholder="United Kingdom"
                    />
                  </div>

                  <div className="sm:col-span-2 space-y-1.5">
                    <Label htmlFor="addressLine1">Address Line 1</Label>
                    <Input
                      id="addressLine1"
                      {...companyForm.register('addressLine1')}
                      placeholder="123 High Street"
                    />
                  </div>

                  <div className="sm:col-span-2 space-y-1.5">
                    <Label htmlFor="addressLine2">Address Line 2</Label>
                    <Input
                      id="addressLine2"
                      {...companyForm.register('addressLine2')}
                      placeholder="Suite 4"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="city">City / Town</Label>
                    <Input
                      id="city"
                      {...companyForm.register('city')}
                      placeholder="London"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="postcode">Postcode</Label>
                    <Input
                      id="postcode"
                      {...companyForm.register('postcode')}
                      placeholder="EC1A 1BB"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <Button type="button" variant="ghost" onClick={goPrev}>
                    <ArrowLeftIcon className="mr-2 h-4 w-4" />
                    Back
                  </Button>
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" onClick={skip}>
                      Skip
                    </Button>
                    <Button type="submit" disabled={saving}>
                      {saving && <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />}
                      Save & Continue
                      <ArrowRightIcon className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </form>
            </div>
          )}

          {/* ── Step 2: Logo ── */}
          {currentStep === 2 && (
            <div className="p-8">
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
                  <ImageIcon className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Upload Your Logo</h2>
                  <p className="text-sm text-muted-foreground">
                    Your logo will appear on all invoices and emails sent to clients.
                  </p>
                </div>
              </div>

              <div className="flex flex-col items-center gap-6">
                {/* Logo preview */}
                <div className="flex h-40 w-full max-w-sm items-center justify-center rounded-xl border-2 border-dashed bg-muted/30">
                  {logoUrl ? (
                    <img
                      src={logoUrl}
                      alt="Company logo"
                      className="max-h-36 max-w-full rounded object-contain p-2"
                    />
                  ) : (
                    <div className="text-center text-muted-foreground">
                      <ImageIcon className="mx-auto mb-2 h-10 w-10 opacity-40" />
                      <p className="text-sm">No logo uploaded yet</p>
                    </div>
                  )}
                </div>

                <div className="flex flex-col items-center gap-2">
                  <UploadButton
                    endpoint="logoUploader"
                    onClientUploadComplete={(res) => {
                      if (res?.[0]?.ufsUrl) {
                        setLogoUrl(res[0].ufsUrl)
                        toast.success('Logo uploaded successfully')
                      }
                    }}
                    onUploadError={(error) => {
                      toast.error(`Upload failed: ${error.message}`)
                    }}
                  />
                  <p className="text-xs text-muted-foreground">
                    PNG, JPG, SVG — max 4MB. Recommended: 400×200px
                  </p>
                </div>
              </div>

              <div className="mt-8 flex items-center justify-between">
                <Button type="button" variant="ghost" onClick={goPrev}>
                  <ArrowLeftIcon className="mr-2 h-4 w-4" />
                  Back
                </Button>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={skip}>
                    Skip
                  </Button>
                  <Button onClick={saveLogo} disabled={saving}>
                    {saving && <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />}
                    {logoUrl ? 'Save & Continue' : 'Continue'}
                    <ArrowRightIcon className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* ── Step 3: Bank Details ── */}
          {currentStep === 3 && (
            <div className="p-8">
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
                  <BanknoteIcon className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Bank Details</h2>
                  <p className="text-sm text-muted-foreground">
                    These details will be printed on invoices so clients know how to pay you.
                  </p>
                </div>
              </div>

              <form onSubmit={bankingForm.handleSubmit(saveBanking)} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2 space-y-1.5">
                    <Label htmlFor="bankName">Bank Name</Label>
                    <Input
                      id="bankName"
                      {...bankingForm.register('bankName')}
                      placeholder="Barclays Bank"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="bankSortCode">Sort Code</Label>
                    <Input
                      id="bankSortCode"
                      {...bankingForm.register('bankSortCode')}
                      placeholder="12-34-56"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="bankAccountNumber">Account Number</Label>
                    <Input
                      id="bankAccountNumber"
                      {...bankingForm.register('bankAccountNumber')}
                      placeholder="12345678"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="bankIban">IBAN (optional)</Label>
                    <Input
                      id="bankIban"
                      {...bankingForm.register('bankIban')}
                      placeholder="GB29 NWBK 6016 1331 9268 19"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="paymentReference">Payment Reference</Label>
                    <Input
                      id="paymentReference"
                      {...bankingForm.register('paymentReference')}
                      placeholder="e.g. Invoice number"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <Button type="button" variant="ghost" onClick={goPrev}>
                    <ArrowLeftIcon className="mr-2 h-4 w-4" />
                    Back
                  </Button>
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" onClick={skip}>
                      Skip
                    </Button>
                    <Button type="submit" disabled={saving}>
                      {saving && <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />}
                      Save & Finish
                      <ArrowRightIcon className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </form>
            </div>
          )}

          {/* ── Step 4: Done ── */}
          {currentStep === 4 && (
            <div className="relative p-8 text-center">
              {showConfetti && <Confetti />}

              <div className="relative mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                <PartyPopperIcon className="h-12 w-12 text-green-600" />
              </div>

              <h1 className="text-3xl font-bold">You&apos;re all set!</h1>
              <p className="mt-3 text-muted-foreground">
                Your InvoiceForge UK account is ready. Start creating professional invoices,
                tracking payments, and growing your business.
              </p>

              <div className="mt-8 grid gap-3 text-left sm:grid-cols-2">
                {[
                  {
                    title: 'Create your first invoice',
                    desc: 'Professional invoices in seconds',
                    href: '/invoices/new',
                    primary: true,
                  },
                  {
                    title: 'Add a client',
                    desc: 'Build your client list',
                    href: '/clients',
                    primary: false,
                  },
                  {
                    title: 'View dashboard',
                    desc: 'See your overview',
                    href: '/dashboard',
                    primary: false,
                  },
                  {
                    title: 'Complete your profile',
                    desc: 'Add remaining details',
                    href: '/settings',
                    primary: false,
                  },
                ].map(({ title, desc, href, primary }) => (
                  <button
                    key={href}
                    type="button"
                    onClick={() => router.push(href)}
                    className={cn(
                      'flex flex-col items-start rounded-xl border p-4 text-left transition-all hover:shadow-md',
                      primary
                        ? 'border-blue-200 bg-blue-50 hover:border-blue-400 dark:border-blue-800 dark:bg-blue-950/30'
                        : 'hover:bg-accent',
                    )}
                  >
                    <p className={cn('font-semibold', primary ? 'text-blue-700 dark:text-blue-400' : '')}>
                      {title}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{desc}</p>
                  </button>
                ))}
              </div>

              <div className="mt-8">
                <Button
                  size="lg"
                  className="w-full sm:w-auto"
                  onClick={() => router.push('/invoices/new')}
                >
                  <FileTextIcon className="mr-2 h-5 w-5" />
                  Create First Invoice
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-xs text-muted-foreground">
          You can always update these settings later in your{' '}
          <button
            type="button"
            onClick={() => router.push('/settings')}
            className="underline underline-offset-2 hover:text-foreground"
          >
            account settings
          </button>
          .
        </p>
      </div>
    </div>
  )
}

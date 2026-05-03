'use client'

import * as React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { SaveIcon, UploadIcon, XIcon, BuildingIcon, LandmarkIcon, ReceiptIcon, FileTextIcon } from 'lucide-react'
import Image from 'next/image'
import type { Organization } from '@prisma/client'

import { updateOrganization } from '@/lib/actions/organization'
import { useUploadThing } from '@/lib/uploadthing'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'

// ---------------------------------------------------------------------------
// Zod schemas
// ---------------------------------------------------------------------------

const businessSchema = z.object({
  companyName: z.string().min(1, 'Company name is required').max(200),
  companyNumber: z.string().max(20).optional().or(z.literal('')),
  vatNumber: z
    .string()
    .max(20)
    .regex(/^(GB)?[0-9]{9}$|^$/, 'Invalid UK VAT number (e.g. GB123456789)')
    .optional()
    .or(z.literal('')),
  website: z
    .string()
    .url('Must be a valid URL (e.g. https://example.com)')
    .optional()
    .or(z.literal('')),
})

const addressSchema = z.object({
  addressLine1: z.string().max(200).optional().or(z.literal('')),
  addressLine2: z.string().max(200).optional().or(z.literal('')),
  city: z.string().max(100).optional().or(z.literal('')),
  county: z.string().max(100).optional().or(z.literal('')),
  postcode: z
    .string()
    .regex(/^[A-Z]{1,2}[0-9][0-9A-Z]?\s?[0-9][A-Z]{2}$/i, 'Invalid UK postcode')
    .optional()
    .or(z.literal('')),
  country: z.string().max(100).optional().or(z.literal('')),
})

const sortCodePattern = /^[0-9]{2}-[0-9]{2}-[0-9]{2}$/

const bankingSchema = z.object({
  bankName: z.string().max(100).optional().or(z.literal('')),
  bankSortCode: z
    .string()
    .regex(sortCodePattern, 'Sort code must be in XX-XX-XX format')
    .optional()
    .or(z.literal('')),
  bankAccountNumber: z
    .string()
    .regex(/^[0-9]{8}$|^$/, 'Account number must be 8 digits')
    .optional()
    .or(z.literal('')),
  bankIban: z.string().max(40).optional().or(z.literal('')),
  bankSwift: z.string().max(20).optional().or(z.literal('')),
})

const invoiceSettingsSchema = z.object({
  invoicePrefix: z.string().max(20).optional().or(z.literal('')),
  defaultPaymentTerms: z.coerce.number().int().min(0).max(365).default(30),
  invoiceFooter: z.string().max(2000).optional().or(z.literal('')),
  latePaymentNote: z.string().max(1000).optional().or(z.literal('')),
  emailSignature: z.string().max(2000).optional().or(z.literal('')),
})

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type BusinessValues = z.input<typeof businessSchema>
type AddressValues = z.input<typeof addressSchema>
type BankingValues = z.input<typeof bankingSchema>
type InvoiceSettingsValues = z.input<typeof invoiceSettingsSchema>

interface CompanySettingsProps {
  org: Organization
}

// ---------------------------------------------------------------------------
// Section wrapper
// ---------------------------------------------------------------------------

function SettingsSection({
  title,
  description,
  icon: Icon,
  children,
  onSave,
  isSaving,
}: {
  title: string
  description?: string
  icon: React.ElementType
  children: React.ReactNode
  onSave: () => void
  isSaving: boolean
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-muted p-2">
            <Icon className="size-4 text-muted-foreground" />
          </div>
          <div>
            <CardTitle>{title}</CardTitle>
            {description && <CardDescription className="mt-0.5">{description}</CardDescription>}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {children}
        <Separator />
        <div className="flex justify-end">
          <Button onClick={onSave} disabled={isSaving} size="sm">
            {isSaving ? (
              <span className="inline-flex items-center gap-2">
                <span className="size-3.5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                Saving…
              </span>
            ) : (
              <span className="inline-flex items-center gap-2">
                <SaveIcon className="size-3.5" />
                Save Changes
              </span>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Field helpers
// ---------------------------------------------------------------------------

function FormField({
  label,
  children,
  error,
  hint,
}: {
  label: string
  children: React.ReactNode
  error?: string
  hint?: string
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
      {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sort code auto-formatter
// ---------------------------------------------------------------------------

function formatSortCode(raw: string): string {
  const digits = raw.replace(/[^0-9]/g, '').slice(0, 6)
  if (digits.length <= 2) return digits
  if (digits.length <= 4) return `${digits.slice(0, 2)}-${digits.slice(2)}`
  return `${digits.slice(0, 2)}-${digits.slice(2, 4)}-${digits.slice(4)}`
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function CompanySettings({ org }: CompanySettingsProps) {
  const [logoPreview, setLogoPreview] = React.useState<string | null>(org.logo ?? null)
  const [savingSection, setSavingSection] = React.useState<string | null>(null)

  const { startUpload, isUploading: isLogoUploading } = useUploadThing('logoUploader', {
    onUploadError: (err) => {
      toast.error(`Logo upload failed: ${err.message}`)
    },
  })
  const [latePaymentEnabled, setLatePaymentEnabled] = React.useState(
    Boolean(org.latePaymentNote),
  )

  // ── Business form ──
  const businessForm = useForm<BusinessValues>({
    resolver: zodResolver(businessSchema),
    defaultValues: {
      companyName: org.companyName ?? org.name ?? '',
      companyNumber: org.companyNumber ?? '',
      vatNumber: org.vatNumber ?? '',
      website: '',
    },
  })

  // ── Address form ──
  const addressForm = useForm<AddressValues>({
    resolver: zodResolver(addressSchema),
    defaultValues: {
      addressLine1: org.addressLine1 ?? '',
      addressLine2: org.addressLine2 ?? '',
      city: org.city ?? '',
      county: org.county ?? '',
      postcode: org.postcode ?? '',
      country: org.country ?? 'United Kingdom',
    },
  })

  // ── Banking form ──
  const bankingForm = useForm<BankingValues>({
    resolver: zodResolver(bankingSchema),
    defaultValues: {
      bankName: org.bankName ?? '',
      bankSortCode: org.bankSortCode ?? '',
      bankAccountNumber: org.bankAccountNumber ?? '',
      bankIban: org.bankIban ?? '',
      bankSwift: org.bankSwift ?? '',
    },
  })

  // ── Invoice settings form ──
  const invoiceForm = useForm<InvoiceSettingsValues>({
    resolver: zodResolver(invoiceSettingsSchema),
    defaultValues: {
      invoicePrefix: org.invoicePrefix ?? 'INV',
      defaultPaymentTerms: org.defaultPaymentTerms ?? 30,
      invoiceFooter: org.invoiceFooter ?? '',
      latePaymentNote: org.latePaymentNote ?? '',
      emailSignature: org.emailSignature ?? '',
    },
  })

  // ── Save handler ──
  async function handleSave(section: string, data: Record<string, unknown>) {
    setSavingSection(section)
    try {
      await updateOrganization(org.id, data)
      toast.success('Settings saved successfully')
    } catch {
      toast.error('Failed to save settings. Please try again.')
    } finally {
      setSavingSection(null)
    }
  }

  async function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    // Show local preview immediately
    setLogoPreview(URL.createObjectURL(file))
    const uploaded = await startUpload([file])
    const url = uploaded?.[0]?.ufsUrl ?? uploaded?.[0]?.url
    if (url) {
      setLogoPreview(url)
      await handleSave('logo', { logo: url })
      toast.success('Logo saved')
    }
  }

  function handleRemoveLogo() {
    setLogoPreview(null)
    handleSave('logo', { logo: null })
  }

  return (
    <div className="space-y-6">

      {/* ── 1. Business Details ── */}
      <SettingsSection
        title="Business Details"
        description="Your registered company information"
        icon={BuildingIcon}
        onSave={businessForm.handleSubmit((data) => handleSave('business', data))}
        isSaving={savingSection === 'business'}
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField
            label="Company Name *"
            error={businessForm.formState.errors.companyName?.message}
          >
            <Input {...businessForm.register('companyName')} placeholder="Acme Ltd" />
          </FormField>
          <FormField
            label="Company Number"
            error={businessForm.formState.errors.companyNumber?.message}
            hint="8-digit Companies House number"
          >
            <Input {...businessForm.register('companyNumber')} placeholder="12345678" />
          </FormField>
          <FormField
            label="VAT Number"
            error={businessForm.formState.errors.vatNumber?.message}
            hint="e.g. GB123456789"
          >
            <Input {...businessForm.register('vatNumber')} placeholder="GB123456789" />
          </FormField>
          <FormField
            label="Website"
            error={businessForm.formState.errors.website?.message}
          >
            <Input {...businessForm.register('website')} type="url" placeholder="https://example.com" />
          </FormField>
        </div>
      </SettingsSection>

      {/* ── 2. Registered Address ── */}
      <SettingsSection
        title="Registered Address"
        description="Your company's registered or trading address"
        icon={BuildingIcon}
        onSave={addressForm.handleSubmit((data) => handleSave('address', data))}
        isSaving={savingSection === 'address'}
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <FormField
              label="Address Line 1"
              error={addressForm.formState.errors.addressLine1?.message}
            >
              <Input {...addressForm.register('addressLine1')} placeholder="123 High Street" />
            </FormField>
          </div>
          <div className="sm:col-span-2">
            <FormField
              label="Address Line 2"
              error={addressForm.formState.errors.addressLine2?.message}
            >
              <Input {...addressForm.register('addressLine2')} placeholder="Floor 2" />
            </FormField>
          </div>
          <FormField label="City / Town" error={addressForm.formState.errors.city?.message}>
            <Input {...addressForm.register('city')} placeholder="London" />
          </FormField>
          <FormField label="County" error={addressForm.formState.errors.county?.message}>
            <Input {...addressForm.register('county')} placeholder="Greater London" />
          </FormField>
          <FormField
            label="Postcode"
            error={addressForm.formState.errors.postcode?.message}
            hint="UK postcode format"
          >
            <Input
              {...addressForm.register('postcode')}
              placeholder="SW1A 1AA"
              className="uppercase"
            />
          </FormField>
          <FormField label="Country" error={addressForm.formState.errors.country?.message}>
            <Input {...addressForm.register('country')} placeholder="United Kingdom" />
          </FormField>
        </div>
      </SettingsSection>

      {/* ── 3. Banking Details ── */}
      <SettingsSection
        title="Banking Details"
        description="Printed on invoices to enable bank transfer payments"
        icon={LandmarkIcon}
        onSave={bankingForm.handleSubmit((data) => handleSave('banking', data))}
        isSaving={savingSection === 'banking'}
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <FormField label="Bank Name" error={bankingForm.formState.errors.bankName?.message}>
              <Input {...bankingForm.register('bankName')} placeholder="Barclays" />
            </FormField>
          </div>
          <FormField
            label="Sort Code"
            error={bankingForm.formState.errors.bankSortCode?.message}
            hint="Format: XX-XX-XX"
          >
            <Input
              {...bankingForm.register('bankSortCode')}
              placeholder="20-12-34"
              onChange={(e) => {
                const formatted = formatSortCode(e.target.value)
                bankingForm.setValue('bankSortCode', formatted, { shouldValidate: true })
              }}
            />
          </FormField>
          <FormField
            label="Account Number"
            error={bankingForm.formState.errors.bankAccountNumber?.message}
            hint="8 digits"
          >
            <Input
              {...bankingForm.register('bankAccountNumber')}
              placeholder="12345678"
              maxLength={8}
            />
          </FormField>
          <FormField
            label="IBAN"
            error={bankingForm.formState.errors.bankIban?.message}
            hint="For international payments"
          >
            <Input {...bankingForm.register('bankIban')} placeholder="GB29NWBK60161331926819" className="uppercase" />
          </FormField>
          <FormField
            label="SWIFT / BIC"
            error={bankingForm.formState.errors.bankSwift?.message}
            hint="For international payments"
          >
            <Input {...bankingForm.register('bankSwift')} placeholder="BARCGB22" className="uppercase" />
          </FormField>
        </div>
      </SettingsSection>

      {/* ── 4. Invoice Settings ── */}
      <SettingsSection
        title="Invoice Settings"
        description="Defaults applied to new invoices"
        icon={ReceiptIcon}
        onSave={invoiceForm.handleSubmit((data) => {
          const payload: InvoiceSettingsValues & { latePaymentNote?: string } = { ...data }
          if (!latePaymentEnabled) payload.latePaymentNote = ''
          handleSave('invoice', payload)
        })}
        isSaving={savingSection === 'invoice'}
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField
            label="Invoice Prefix"
            error={invoiceForm.formState.errors.invoicePrefix?.message}
            hint="Prefix for invoice numbers (e.g. INV → INV-2026-0001)"
          >
            <Input {...invoiceForm.register('invoicePrefix')} placeholder="INV" className="uppercase" />
          </FormField>
          <FormField
            label="Default Payment Terms (days)"
            error={invoiceForm.formState.errors.defaultPaymentTerms?.message}
            hint="e.g. 30 for 30 days net"
          >
            <Input
              {...invoiceForm.register('defaultPaymentTerms')}
              type="number"
              min={0}
              max={365}
              placeholder="30"
            />
          </FormField>
        </div>

        <FormField
          label="Invoice Footer"
          error={invoiceForm.formState.errors.invoiceFooter?.message}
          hint="Appears at the bottom of every invoice (e.g. payment terms, thank you message)"
        >
          <Textarea
            {...invoiceForm.register('invoiceFooter')}
            placeholder="Thank you for your business. Please make payment within 30 days."
            rows={3}
          />
        </FormField>

        <FormField
          label="Email Signature"
          error={invoiceForm.formState.errors.emailSignature?.message}
          hint="Appended to invoice emails sent to clients"
        >
          <Textarea
            {...invoiceForm.register('emailSignature')}
            placeholder="Kind regards,&#10;The Team at Acme Ltd"
            rows={3}
          />
        </FormField>

        {/* ── Late payment note toggle ── */}
        <div className="space-y-3">
          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div>
              <p className="text-sm font-medium">Late Payment Note</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Add a statutory late payment notice to invoices
              </p>
            </div>
            <Switch
              checked={latePaymentEnabled}
              onCheckedChange={setLatePaymentEnabled}
            />
          </div>
          {latePaymentEnabled && (
            <FormField
              label="Late Payment Note Text"
              error={invoiceForm.formState.errors.latePaymentNote?.message}
              hint="Under the Late Payment of Commercial Debts Act 1998"
            >
              <Textarea
                {...invoiceForm.register('latePaymentNote')}
                placeholder="We reserve the right to charge statutory interest under the Late Payment of Commercial Debts (Interest) Act 1998."
                rows={3}
              />
            </FormField>
          )}
        </div>
      </SettingsSection>

      {/* ── 5. Logo Upload ── */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-muted p-2">
              <FileTextIcon className="size-4 text-muted-foreground" />
            </div>
            <div>
              <CardTitle>Company Logo</CardTitle>
              <CardDescription>Displayed on invoices and emails</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {logoPreview ? (
            <div className="flex items-center gap-4">
              <div className="relative rounded-lg border border-border bg-muted p-3">
                <Image
                  src={logoPreview}
                  alt="Company logo preview"
                  width={160}
                  height={64}
                  className="max-h-16 w-auto object-contain"
                />
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Logo uploaded</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRemoveLogo}
                  className="text-destructive hover:text-destructive"
                >
                  <XIcon className="size-3.5" />
                  Remove Logo
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-border p-8 text-center">
              <UploadIcon className="size-8 text-muted-foreground mb-3" />
              <p className="text-sm font-medium mb-1">Upload your company logo</p>
              <p className="text-xs text-muted-foreground mb-4">
                PNG, JPG or SVG. Max 2MB. Recommended: 400×160px
              </p>
              <label htmlFor="logo-upload">
                <Button variant="outline" size="sm" nativeButton={false} render={<span />}>
                  <UploadIcon className="size-3.5" />
                  Choose File
                </Button>
                <input
                  id="logo-upload"
                  type="file"
                  accept="image/png,image/jpeg,image/svg+xml,image/webp"
                  className="sr-only"
                  onChange={handleLogoChange}
                />
              </label>
            </div>
          )}
          {isLogoUploading && (
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <span className="size-3.5 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin inline-block" />
              Uploading…
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

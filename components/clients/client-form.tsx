'use client'

import * as React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { createClient, updateClient } from '@/lib/actions/clients'
import { PAYMENT_TERMS_OPTIONS } from '@/lib/constants'
import type { Client } from '@prisma/client'

// ─── Schema ────────────────────────────────────────────────────────────────

const clientSchema = z.object({
  companyName: z.string().min(1, 'Company name is required').max(200),
  contactName: z.string().max(200).optional().or(z.literal('')),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  phone: z.string().max(50).optional().or(z.literal('')),
  vatNumber: z.string().max(50).optional().or(z.literal('')),
  addressLine1: z.string().max(200).optional().or(z.literal('')),
  addressLine2: z.string().max(200).optional().or(z.literal('')),
  city: z.string().max(100).optional().or(z.literal('')),
  county: z.string().max(100).optional().or(z.literal('')),
  postcode: z
    .string()
    .max(10)
    .optional()
    .or(z.literal(''))
    .refine(
      (val) =>
        !val ||
        val === '' ||
        /^[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}$/i.test(val),
      { message: 'Enter a valid UK postcode (e.g. SW1A 2AA)' },
    ),
  country: z.string().max(100).default('United Kingdom'),
  defaultPaymentTerms: z.coerce.number().int().min(0).default(30),
  defaultTaxRate: z.coerce.number().min(0).max(100).optional(),
  notes: z.string().max(2000).optional().or(z.literal('')),
})

type ClientFormValues = z.input<typeof clientSchema>

// ─── Props ──────────────────────────────────────────────────────────────────

interface ClientFormProps {
  orgId: string
  client?: Client | null
  onSuccess?: (client: Client) => void
  onCancel?: () => void
}

const TAX_RATE_OPTIONS = [
  { value: '20', label: '20% Standard Rate' },
  { value: '5', label: '5% Reduced Rate' },
  { value: '0', label: '0% Zero / Exempt' },
]

// ─── Component ───────────────────────────────────────────────────────────────

export function ClientForm({ orgId, client, onSuccess, onCancel }: ClientFormProps) {
  const isEditing = !!client

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ClientFormValues>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      companyName: client?.companyName ?? '',
      contactName: client?.contactName ?? '',
      email: client?.email ?? '',
      phone: client?.phone ?? '',
      vatNumber: client?.vatNumber ?? '',
      addressLine1: client?.addressLine1 ?? '',
      addressLine2: client?.addressLine2 ?? '',
      city: client?.city ?? '',
      county: client?.county ?? '',
      postcode: client?.postcode ?? '',
      country: client?.country ?? 'United Kingdom',
      defaultPaymentTerms: client?.defaultPaymentTerms ?? 30,
      defaultTaxRate: client?.defaultTaxRate
        ? Number(client.defaultTaxRate)
        : undefined,
      notes: client?.notes ?? '',
    },
  })

  async function onSubmit(values: ClientFormValues) {
    try {
      const payload = {
        companyName: values.companyName,
        contactName: values.contactName || undefined,
        email: values.email || undefined,
        phone: values.phone || undefined,
        vatNumber: values.vatNumber || undefined,
        addressLine1: values.addressLine1 || undefined,
        addressLine2: values.addressLine2 || undefined,
        city: values.city || undefined,
        county: values.county || undefined,
        postcode: values.postcode || undefined,
        country: values.country || 'United Kingdom',
        defaultPaymentTerms: values.defaultPaymentTerms !== undefined ? Number(values.defaultPaymentTerms) : undefined,
        defaultTaxRate: values.defaultTaxRate !== undefined ? Number(values.defaultTaxRate) : undefined,
        notes: values.notes || undefined,
      }

      let result: Client
      if (isEditing && client) {
        result = await updateClient(orgId, client.id, payload)
        toast.success('Client updated successfully')
      } else {
        result = await createClient(orgId, payload)
        toast.success('Client created successfully')
      }
      onSuccess?.(result)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong'
      toast.error(message)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* ── Company & Contact ─────────────────────────────────────── */}
      <section className="space-y-4">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Company Details
        </h3>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="companyName">
              Company Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="companyName"
              placeholder="Acme Ltd"
              {...register('companyName')}
              aria-invalid={!!errors.companyName}
            />
            {errors.companyName && (
              <p className="text-xs text-destructive">{errors.companyName.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="contactName">Contact Name</Label>
            <Input
              id="contactName"
              placeholder="Jane Smith"
              {...register('contactName')}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="jane@acme.co.uk"
              {...register('email')}
              aria-invalid={!!errors.email}
            />
            {errors.email && (
              <p className="text-xs text-destructive">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="+44 20 7946 0958"
              {...register('phone')}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="vatNumber">VAT Number</Label>
            <Input
              id="vatNumber"
              placeholder="GB123456789"
              {...register('vatNumber')}
            />
          </div>
        </div>
      </section>

      {/* ── Address ───────────────────────────────────────────────── */}
      <section className="space-y-4">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Address
        </h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2 space-y-1.5">
            <Label htmlFor="addressLine1">Address Line 1</Label>
            <Input
              id="addressLine1"
              placeholder="123 High Street"
              {...register('addressLine1')}
            />
          </div>

          <div className="sm:col-span-2 space-y-1.5">
            <Label htmlFor="addressLine2">Address Line 2</Label>
            <Input
              id="addressLine2"
              placeholder="Suite 4B"
              {...register('addressLine2')}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="city">City / Town</Label>
            <Input id="city" placeholder="London" {...register('city')} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="county">County</Label>
            <Input id="county" placeholder="Greater London" {...register('county')} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="postcode">Postcode</Label>
            <Input
              id="postcode"
              placeholder="SW1A 2AA"
              {...register('postcode')}
              aria-invalid={!!errors.postcode}
            />
            {errors.postcode && (
              <p className="text-xs text-destructive">{errors.postcode.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="country">Country</Label>
            <Input
              id="country"
              placeholder="United Kingdom"
              {...register('country')}
            />
          </div>
        </div>
      </section>

      {/* ── Billing Defaults ─────────────────────────────────────── */}
      <section className="space-y-4">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Billing Defaults
        </h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="defaultPaymentTerms">Default Payment Terms</Label>
            <Select
              defaultValue={String(watch('defaultPaymentTerms') ?? 30)}
              onValueChange={(v) => setValue('defaultPaymentTerms', Number(v))}
            >
              <SelectTrigger id="defaultPaymentTerms" className="w-full">
                <SelectValue placeholder="Select terms" />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_TERMS_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={String(opt.value)}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="defaultTaxRate">Default Tax Rate</Label>
            <Select
              defaultValue={
                watch('defaultTaxRate') !== undefined
                  ? String(watch('defaultTaxRate'))
                  : ''
              }
              onValueChange={(v) =>
                setValue('defaultTaxRate', v ? Number(v) : undefined)
              }
            >
              <SelectTrigger id="defaultTaxRate" className="w-full">
                <SelectValue placeholder="Select rate" />
              </SelectTrigger>
              <SelectContent>
                {TAX_RATE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </section>

      {/* ── Notes ────────────────────────────────────────────────── */}
      <section className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          rows={3}
          placeholder="Internal notes about this client…"
          {...register('notes')}
        />
      </section>

      {/* ── Actions ──────────────────────────────────────────────── */}
      <div className="flex justify-end gap-2 pt-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 size-4 animate-spin" />}
          {isEditing ? 'Save Changes' : 'Create Client'}
        </Button>
      </div>
    </form>
  )
}

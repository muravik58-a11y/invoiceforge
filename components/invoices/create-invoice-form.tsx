'use client'
import { Prisma } from '@prisma/client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { useForm, useFieldArray, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import {
  PlusIcon,
  Trash2Icon,
  ChevronLeftIcon,
  ChevronRightIcon,
  PackageIcon,
  CheckIcon,
  ChevronsUpDownIcon,
  Loader2Icon,
} from 'lucide-react'
import { addDays, format } from 'date-fns'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Separator } from '@/components/ui/separator'
import { cn, formatCurrency } from '@/lib/utils'
import { VAT_TYPE_OPTIONS } from '@/lib/constants'
import { createInvoice, updateInvoice } from '@/lib/actions/invoices'
import type { Client, Product } from '@prisma/client'

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const lineItemSchema = z.object({
  productId: z.string().optional(),
  description: z.string().min(1, 'Description is required'),
  quantity: z.coerce.number().positive('Quantity must be positive'),
  unit: z.string().optional(),
  unitPrice: z.coerce.number().nonnegative('Price must be 0 or more'),
  vatRate: z.coerce.number().min(0).max(100),
  vatType: z.string().default('STANDARD'),
})

const invoiceSchema = z.object({
  clientId: z.string().min(1, 'Please select a client'),
  issueDate: z.string().min(1, 'Issue date is required'),
  dueDate: z.string().min(1, 'Due date is required'),
  poNumber: z.string().optional(),
  reference: z.string().optional(),
  items: z.array(lineItemSchema).min(1, 'Add at least one line item'),
  discountPercent: z.coerce.number().min(0).max(100).optional(),
  notes: z.string().optional(),
  terms: z.string().optional(),
  templateId: z.string().default('modern'),
})

type InvoiceFormValues = z.input<typeof invoiceSchema>

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface EditInvoice {
  id: string
  clientId: string
  issueDate: Date
  dueDate: Date
  poNumber?: string | null
  reference?: string | null
  discountPercent: Prisma.Decimal | number
  notes?: string | null
  terms?: string | null
  templateId?: string | null
  items: Array<{
    id: string
    productId?: string | null
    description: string
    quantity: Prisma.Decimal | number
    unitPrice: Prisma.Decimal | number
    vatRate: Prisma.Decimal | number
    vatType: string
    unit?: string | null
  }>
}

interface CreateInvoiceFormProps {
  clients: Client[]
  products: Product[]
  orgId: string
  userId: string
  defaultPaymentTerms?: number
  editInvoice?: EditInvoice
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toNum(v: Prisma.Decimal | number | string | null | undefined): number {
  if (v == null) return 0
  if (typeof v === 'number') return v
  return parseFloat(v.toString())
}

const STEPS = [
  { id: 1, label: 'Client & Dates' },
  { id: 2, label: 'Line Items' },
  { id: 3, label: 'Totals & Settings' },
]

const TEMPLATES = [
  { value: 'modern', label: 'Modern' },
  { value: 'classic', label: 'Classic' },
  { value: 'minimal', label: 'Minimal' },
]

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StepIndicator({ current, steps }: { current: number; steps: typeof STEPS }) {
  return (
    <div className="flex items-center gap-0">
      {steps.map((step, i) => (
        <React.Fragment key={step.id}>
          <div className="flex items-center gap-2">
            <div
              className={cn(
                'flex size-8 items-center justify-center rounded-full text-sm font-semibold transition-colors',
                step.id < current
                  ? 'bg-primary text-primary-foreground'
                  : step.id === current
                  ? 'bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2'
                  : 'bg-muted text-muted-foreground',
              )}
            >
              {step.id < current ? <CheckIcon className="size-4" /> : step.id}
            </div>
            <span
              className={cn(
                'hidden text-sm sm:block',
                step.id === current ? 'font-semibold' : 'text-muted-foreground',
              )}
            >
              {step.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div
              className={cn(
                'mx-3 h-px flex-1 min-w-[2rem] transition-colors',
                step.id < current ? 'bg-primary' : 'bg-muted',
              )}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  )
}

function ClientCombobox({
  clients,
  value,
  onChange,
  error,
}: {
  clients: Client[]
  value: string
  onChange: (v: string) => void
  error?: string
}) {
  const [open, setOpen] = React.useState(false)
  const selected = clients.find((c) => c.id === value)

  return (
    <div>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger render={<Button variant="outline" role="combobox" aria-expanded={open} className={cn('w-full justify-between font-normal', error && 'border-destructive')} />}>
            {selected ? (
              <span className="truncate">{selected.companyName}</span>
            ) : (
              <span className="text-muted-foreground">Select a client…</span>
            )}
            <ChevronsUpDownIcon className="ml-2 size-4 shrink-0 opacity-50" />
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <Command>
            <CommandInput placeholder="Search clients…" />
            <CommandList>
              <CommandEmpty>No clients found.</CommandEmpty>
              <CommandGroup>
                {clients.map((c) => (
                  <CommandItem
                    key={c.id}
                    value={c.companyName}
                    onSelect={() => {
                      onChange(c.id)
                      setOpen(false)
                    }}
                  >
                    <CheckIcon
                      className={cn('mr-2 size-4', value === c.id ? 'opacity-100' : 'opacity-0')}
                    />
                    <div>
                      <p className="font-medium">{c.companyName}</p>
                      {c.email && (
                        <p className="text-xs text-muted-foreground">{c.email}</p>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  )
}

function ProductCombobox({
  products,
  value,
  onChange,
}: {
  products: Product[]
  value: string
  onChange: (product: Product | null) => void
}) {
  const [open, setOpen] = React.useState(false)
  const selected = products.find((p) => p.id === value)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger render={<Button variant="outline" role="combobox" size="sm" className="h-9 w-full justify-between font-normal text-xs" />}>
          {selected ? (
            <span className="truncate max-w-[120px]">{selected.name}</span>
          ) : (
            <span className="text-muted-foreground">Product…</span>
          )}
          <PackageIcon className="ml-1 size-3 shrink-0 opacity-50" />
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="start">
        <Command>
          <CommandInput placeholder="Search products…" />
          <CommandList>
            <CommandEmpty>No products found.</CommandEmpty>
            <CommandGroup>
              <CommandItem
                value="__none__"
                onSelect={() => {
                  onChange(null)
                  setOpen(false)
                }}
              >
                <span className="text-muted-foreground">Custom line item</span>
              </CommandItem>
              {products.map((p) => (
                <CommandItem
                  key={p.id}
                  value={p.name}
                  onSelect={() => {
                    onChange(p)
                    setOpen(false)
                  }}
                >
                  <CheckIcon
                    className={cn('mr-2 size-4', value === p.id ? 'opacity-100' : 'opacity-0')}
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{p.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatCurrency(toNum(p.unitPrice))} · {toNum(p.vatRate)}% VAT
                    </p>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

// ---------------------------------------------------------------------------
// Live Calculation Hook
// ---------------------------------------------------------------------------

function useInvoiceCalculations(
  items: InvoiceFormValues['items'],
  discountPercent: number,
) {
  return React.useMemo(() => {
    const subtotal = items.reduce(
      (sum, it) => sum + Number(it.quantity || 0) * Number(it.unitPrice || 0),
      0,
    )

    const discountAmount = subtotal * ((discountPercent || 0) / 100)
    const discountFactor = 1 - (discountPercent || 0) / 100

    // Build VAT breakdown
    type VatKey = string
    const vatMap = new Map<
      VatKey,
      { vatRate: number; vatType: string; netAmount: number; vatAmount: number }
    >()

    for (const it of items) {
      const lineExVat = Number(it.quantity || 0) * Number(it.unitPrice || 0)
      const discountedLine = lineExVat * discountFactor
      const lineVat = discountedLine * (Number(it.vatRate || 0) / 100)
      const key: VatKey = `${it.vatRate}-${it.vatType}`
      const existing = vatMap.get(key)
      if (existing) {
        existing.netAmount += discountedLine
        existing.vatAmount += lineVat
      } else {
        vatMap.set(key, {
          vatRate: Number(it.vatRate || 0),
          vatType: it.vatType || 'STANDARD',
          netAmount: discountedLine,
          vatAmount: lineVat,
        })
      }
    }

    const vatBreakdowns = Array.from(vatMap.values()).filter(
      (vb) => vb.netAmount > 0 || vb.vatAmount > 0,
    )
    const totalVat = vatBreakdowns.reduce((sum, vb) => sum + vb.vatAmount, 0)
    const total = subtotal - discountAmount + totalVat

    return { subtotal, discountAmount, totalVat, total, vatBreakdowns }
  }, [items, discountPercent])
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function CreateInvoiceForm({
  clients,
  products,
  orgId,
  userId,
  defaultPaymentTerms = 30,
  editInvoice,
}: CreateInvoiceFormProps) {
  const router = useRouter()
  const [step, setStep] = React.useState(1)
  const [submitting, setSubmitting] = React.useState(false)

  const isEditing = !!editInvoice

  const form = useForm<InvoiceFormValues>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: editInvoice
      ? {
          clientId: editInvoice.clientId,
          issueDate: format(new Date(editInvoice.issueDate), 'yyyy-MM-dd'),
          dueDate: format(new Date(editInvoice.dueDate), 'yyyy-MM-dd'),
          poNumber: editInvoice.poNumber ?? '',
          reference: editInvoice.reference ?? '',
          discountPercent: toNum(editInvoice.discountPercent),
          notes: editInvoice.notes ?? '',
          terms: editInvoice.terms ?? '',
          templateId: editInvoice.templateId ?? 'modern',
          items: editInvoice.items.map((it) => ({
            productId: it.productId ?? undefined,
            description: it.description,
            quantity: toNum(it.quantity),
            unitPrice: toNum(it.unitPrice),
            vatRate: toNum(it.vatRate),
            vatType: it.vatType,
            unit: it.unit ?? 'unit',
          })),
        }
      : {
          clientId: '',
          issueDate: format(new Date(), 'yyyy-MM-dd'),
          dueDate: format(addDays(new Date(), defaultPaymentTerms), 'yyyy-MM-dd'),
          poNumber: '',
          reference: '',
          discountPercent: 0,
          notes: '',
          terms: 'Payment is due within the agreed terms. Late payments may incur interest at 8% above the Bank of England base rate.',
          templateId: 'modern',
          items: [
            {
              productId: undefined,
              description: '',
              quantity: 1,
              unit: 'unit',
              unitPrice: 0,
              vatRate: 20,
              vatType: 'STANDARD',
            },
          ],
        },
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items',
  })

  const watchedItems = useWatch({ control: form.control, name: 'items' }) ?? []
  const watchedDiscount = Number(useWatch({ control: form.control, name: 'discountPercent' }) ?? 0)
  const watchedClientId = useWatch({ control: form.control, name: 'clientId' })
  const watchedIssueDate = useWatch({ control: form.control, name: 'issueDate' })

  const calcs = useInvoiceCalculations(watchedItems, watchedDiscount)

  // Auto-update due date when client or issue date changes
  React.useEffect(() => {
    if (!watchedClientId || !watchedIssueDate) return
    const client = clients.find((c) => c.id === watchedClientId)
    const terms = client?.defaultPaymentTerms ?? defaultPaymentTerms
    const issueDate = new Date(watchedIssueDate)
    if (!isNaN(issueDate.getTime())) {
      form.setValue('dueDate', format(addDays(issueDate, terms), 'yyyy-MM-dd'))
    }
  }, [watchedClientId, watchedIssueDate]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleProductSelect(index: number, product: Product | null) {
    if (!product) {
      form.setValue(`items.${index}.productId`, undefined)
      return
    }
    form.setValue(`items.${index}.productId`, product.id)
    form.setValue(`items.${index}.description`, product.description ?? product.name)
    form.setValue(`items.${index}.unitPrice`, toNum(product.unitPrice))
    form.setValue(`items.${index}.vatRate`, toNum(product.vatRate))
    form.setValue(`items.${index}.vatType`, product.vatType)
    form.setValue(`items.${index}.unit`, product.unit ?? 'unit')
  }

  function addLineItem() {
    append({
      productId: undefined,
      description: '',
      quantity: 1,
      unit: 'unit',
      unitPrice: 0,
      vatRate: 20,
      vatType: 'STANDARD',
    })
  }

  async function goNext() {
    let valid = false

    if (step === 1) {
      valid = await form.trigger(['clientId', 'issueDate', 'dueDate'])
    } else if (step === 2) {
      valid = await form.trigger(['items'])
    }

    if (valid) setStep((s) => Math.min(s + 1, 3))
  }

  async function onSubmit(values: InvoiceFormValues) {
    setSubmitting(true)
    try {
      const payload = {
        clientId: values.clientId,
        issueDate: new Date(values.issueDate),
        dueDate: new Date(values.dueDate),
        poNumber: values.poNumber || undefined,
        reference: values.reference || undefined,
        items: values.items.map((it, i) => ({
          productId: it.productId || undefined,
          description: it.description,
          quantity: Number(it.quantity),
          unitPrice: Number(it.unitPrice),
          vatRate: Number(it.vatRate),
          vatType: it.vatType,
          unit: it.unit || 'unit',
          sortOrder: i,
        })),
        discountPercent: Number(values.discountPercent ?? 0),
        notes: values.notes || undefined,
        terms: values.terms || undefined,
        templateId: values.templateId,
      }

      if (isEditing && editInvoice) {
        await updateInvoice(orgId, editInvoice.id, userId, payload as any)
        toast.success('Invoice updated successfully')
        router.push(`/invoices/${editInvoice.id}`)
      } else {
        const invoice = await createInvoice(orgId, userId, payload as any)
        toast.success('Invoice created successfully')
        router.push(`/invoices/${(invoice as any).id}`)
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save invoice')
    } finally {
      setSubmitting(false)
    }
  }

  // ---------------------------------------------------------------------------
  // Step 1: Client & Dates
  // ---------------------------------------------------------------------------
  function renderStep1() {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold">Client & Dates</h2>
          <p className="text-sm text-muted-foreground">
            Select the client and set invoice dates.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          {/* Client */}
          <div className="sm:col-span-2">
            <Label htmlFor="clientId" className="mb-2 block">
              Client <span className="text-destructive">*</span>
            </Label>
            <ClientCombobox
              clients={clients}
              value={form.watch('clientId')}
              onChange={(id) => form.setValue('clientId', id, { shouldValidate: true })}
              error={form.formState.errors.clientId?.message}
            />
          </div>

          {/* Issue Date */}
          <div>
            <Label htmlFor="issueDate" className="mb-2 block">
              Issue Date <span className="text-destructive">*</span>
            </Label>
            <Input
              id="issueDate"
              type="date"
              {...form.register('issueDate')}
              className={cn(form.formState.errors.issueDate && 'border-destructive')}
            />
            {form.formState.errors.issueDate && (
              <p className="mt-1 text-xs text-destructive">
                {form.formState.errors.issueDate.message}
              </p>
            )}
          </div>

          {/* Due Date */}
          <div>
            <Label htmlFor="dueDate" className="mb-2 block">
              Due Date <span className="text-destructive">*</span>
            </Label>
            <Input
              id="dueDate"
              type="date"
              {...form.register('dueDate')}
              className={cn(form.formState.errors.dueDate && 'border-destructive')}
            />
            {form.formState.errors.dueDate && (
              <p className="mt-1 text-xs text-destructive">
                {form.formState.errors.dueDate.message}
              </p>
            )}
            {watchedClientId && (
              <p className="mt-1 text-xs text-muted-foreground">
                Auto-set from client payment terms (
                {clients.find((c) => c.id === watchedClientId)?.defaultPaymentTerms ??
                  defaultPaymentTerms}{' '}
                days).
              </p>
            )}
          </div>

          {/* PO Number */}
          <div>
            <Label htmlFor="poNumber" className="mb-2 block">
              PO Number
              <span className="ml-1 text-xs text-muted-foreground">(optional)</span>
            </Label>
            <Input
              id="poNumber"
              placeholder="e.g. PO-2024-001"
              {...form.register('poNumber')}
            />
          </div>

          {/* Reference */}
          <div>
            <Label htmlFor="reference" className="mb-2 block">
              Reference
              <span className="ml-1 text-xs text-muted-foreground">(optional)</span>
            </Label>
            <Input
              id="reference"
              placeholder="e.g. Project Alpha"
              {...form.register('reference')}
            />
          </div>
        </div>

        {/* Client preview */}
        {watchedClientId && (() => {
          const client = clients.find((c) => c.id === watchedClientId)
          if (!client) return null
          return (
            <div className="rounded-lg border bg-muted/30 p-4 text-sm space-y-1">
              <p className="font-semibold">{client.companyName}</p>
              {client.contactName && (
                <p className="text-muted-foreground">{client.contactName}</p>
              )}
              {client.email && <p className="text-muted-foreground">{client.email}</p>}
              {(client.addressLine1 || client.city || client.postcode) && (
                <p className="text-muted-foreground">
                  {[client.addressLine1, client.city, client.postcode]
                    .filter(Boolean)
                    .join(', ')}
                </p>
              )}
              {client.vatNumber && (
                <p className="text-muted-foreground">VAT: {client.vatNumber}</p>
              )}
            </div>
          )
        })()}
      </div>
    )
  }

  // ---------------------------------------------------------------------------
  // Step 2: Line Items
  // ---------------------------------------------------------------------------
  function renderStep2() {
    return (
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Line Items</h2>
          <p className="text-sm text-muted-foreground">
            Add the products or services for this invoice.
          </p>
        </div>

        {form.formState.errors.items?.root && (
          <p className="text-sm text-destructive">
            {form.formState.errors.items.root.message}
          </p>
        )}

        <div className="space-y-3">
          {/* Header row (hidden on mobile) */}
          <div className="hidden grid-cols-[minmax(120px,1fr)_minmax(200px,2fr)_80px_80px_100px_120px_100px_40px] gap-2 text-xs font-medium text-muted-foreground px-1 sm:grid">
            <span>Product</span>
            <span>Description</span>
            <span>Qty</span>
            <span>Unit</span>
            <span>Unit Price</span>
            <span>VAT</span>
            <span className="text-right">Line Total</span>
            <span />
          </div>

          {fields.map((field, index) => {
            const qty = Number(watchedItems[index]?.quantity || 0)
            const price = Number(watchedItems[index]?.unitPrice || 0)
            const vatRate = Number(watchedItems[index]?.vatRate || 0)
            const lineTotalExVat = qty * price
            const lineVat = lineTotalExVat * (vatRate / 100)
            const lineTotal = lineTotalExVat + lineVat

            return (
              <div
                key={field.id}
                className="rounded-lg border bg-card p-3 space-y-3 sm:p-0 sm:bg-transparent sm:border-0 sm:grid sm:grid-cols-[minmax(120px,1fr)_minmax(200px,2fr)_80px_80px_100px_120px_100px_40px] sm:gap-2 sm:items-start"
              >
                {/* Product selector */}
                <div>
                  <Label className="mb-1 block text-xs sm:hidden">Product</Label>
                  <ProductCombobox
                    products={products}
                    value={watchedItems[index]?.productId ?? ''}
                    onChange={(product) => handleProductSelect(index, product)}
                  />
                </div>

                {/* Description */}
                <div>
                  <Label className="mb-1 block text-xs sm:hidden">Description</Label>
                  <Input
                    placeholder="Description"
                    {...form.register(`items.${index}.description`)}
                    className={cn(
                      'h-9 text-sm',
                      form.formState.errors.items?.[index]?.description &&
                        'border-destructive',
                    )}
                  />
                  {form.formState.errors.items?.[index]?.description && (
                    <p className="mt-0.5 text-xs text-destructive">
                      {form.formState.errors.items[index]?.description?.message}
                    </p>
                  )}
                </div>

                {/* Qty */}
                <div>
                  <Label className="mb-1 block text-xs sm:hidden">Qty</Label>
                  <Input
                    type="number"
                    step="0.001"
                    min="0"
                    placeholder="1"
                    {...form.register(`items.${index}.quantity`)}
                    className="h-9 text-sm"
                  />
                </div>

                {/* Unit */}
                <div>
                  <Label className="mb-1 block text-xs sm:hidden">Unit</Label>
                  <Input
                    placeholder="unit"
                    {...form.register(`items.${index}.unit`)}
                    className="h-9 text-sm"
                  />
                </div>

                {/* Unit Price */}
                <div>
                  <Label className="mb-1 block text-xs sm:hidden">Unit Price (ex-VAT)</Label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                      £
                    </span>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      {...form.register(`items.${index}.unitPrice`)}
                      className="h-9 pl-6 text-sm"
                    />
                  </div>
                </div>

                {/* VAT */}
                <div>
                  <Label className="mb-1 block text-xs sm:hidden">VAT</Label>
                  <Select
                    value={`${watchedItems[index]?.vatRate ?? 20}-${watchedItems[index]?.vatType ?? 'STANDARD'}`}
                    onValueChange={(v) => {
                      const opt = VAT_TYPE_OPTIONS.find(
                        (o) => `${o.rate}-${o.value}` === v,
                      )
                      if (opt) {
                        form.setValue(`items.${index}.vatRate`, opt.rate)
                        form.setValue(`items.${index}.vatType`, opt.value)
                      }
                    }}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {VAT_TYPE_OPTIONS.map((opt) => (
                        <SelectItem
                          key={opt.value}
                          value={`${opt.rate}-${opt.value}`}
                          className="text-xs"
                        >
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Line Total */}
                <div className="flex items-center sm:justify-end">
                  <Label className="mr-2 text-xs sm:hidden">Total:</Label>
                  <div className="text-right">
                    <p className="text-sm font-semibold tabular-nums">
                      {formatCurrency(lineTotal)}
                    </p>
                    {vatRate > 0 && (
                      <p className="text-xs text-muted-foreground tabular-nums">
                        +{formatCurrency(lineVat)} VAT
                      </p>
                    )}
                  </div>
                </div>

                {/* Remove */}
                <div className="flex items-start justify-end sm:justify-center sm:pt-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="size-9 p-0 text-muted-foreground hover:text-destructive"
                    onClick={() => remove(index)}
                    disabled={fields.length === 1}
                    aria-label="Remove line item"
                  >
                    <Trash2Icon className="size-4" />
                  </Button>
                </div>
              </div>
            )
          })}
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addLineItem}
          className="w-full border-dashed"
        >
          <PlusIcon className="mr-1.5 size-4" />
          Add Line Item
        </Button>

        {/* Running subtotal */}
        <div className="rounded-lg border bg-muted/20 p-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Subtotal (ex-VAT)</span>
            <span className="font-medium tabular-nums">
              {formatCurrency(calcs.subtotal)}
            </span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>VAT (estimate)</span>
            <span className="tabular-nums">{formatCurrency(calcs.totalVat)}</span>
          </div>
          <Separator />
          <div className="flex justify-between font-semibold text-base">
            <span>Total (inc-VAT)</span>
            <span className="tabular-nums">{formatCurrency(calcs.total)}</span>
          </div>
        </div>
      </div>
    )
  }

  // ---------------------------------------------------------------------------
  // Step 3: Totals & Settings
  // ---------------------------------------------------------------------------
  function renderStep3() {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold">Totals & Settings</h2>
          <p className="text-sm text-muted-foreground">
            Review totals, add a discount, and customise your invoice.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Left: Totals */}
          <div className="space-y-4">
            {/* Discount */}
            <div>
              <Label htmlFor="discountPercent" className="mb-2 block">
                Discount %{' '}
                <span className="text-xs text-muted-foreground">(optional)</span>
              </Label>
              <div className="relative max-w-[160px]">
                <Input
                  id="discountPercent"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  placeholder="0"
                  {...form.register('discountPercent')}
                  className="pr-8"
                />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  %
                </span>
              </div>
            </div>

            {/* Totals breakdown */}
            <div className="rounded-xl border bg-card p-5 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal (ex-VAT)</span>
                <span className="font-medium tabular-nums">
                  {formatCurrency(calcs.subtotal)}
                </span>
              </div>

              {(watchedDiscount ?? 0) > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Discount ({watchedDiscount}%)</span>
                  <span className="tabular-nums">
                    −{formatCurrency(calcs.discountAmount)}
                  </span>
                </div>
              )}

              <Separator />

              {/* VAT breakdown */}
              {calcs.vatBreakdowns.map((vb, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    VAT @ {vb.vatRate}%{' '}
                    <span className="text-xs">
                      (on {formatCurrency(vb.netAmount)})
                    </span>
                  </span>
                  <span className="tabular-nums">
                    {formatCurrency(vb.vatAmount)}
                  </span>
                </div>
              ))}

              {calcs.vatBreakdowns.length > 0 && <Separator />}

              <div className="flex justify-between">
                <span className="text-lg font-bold">Total</span>
                <span className="text-lg font-bold tabular-nums text-primary">
                  {formatCurrency(calcs.total)}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">All amounts in GBP (inc-VAT)</p>
            </div>

            {/* Template selector */}
            <div>
              <Label className="mb-2 block">Invoice Template</Label>
              <div className="grid grid-cols-3 gap-3">
                {TEMPLATES.map((tpl) => {
                  const selected = form.watch('templateId') === tpl.value
                  return (
                    <button
                      key={tpl.value}
                      type="button"
                      onClick={() => form.setValue('templateId', tpl.value)}
                      className={cn(
                        'rounded-lg border p-3 text-sm font-medium transition-all',
                        selected
                          ? 'border-primary bg-primary/5 text-primary ring-1 ring-primary'
                          : 'hover:border-muted-foreground/50',
                      )}
                    >
                      {tpl.label}
                      {selected && (
                        <CheckIcon className="ml-1 inline-block size-3.5" />
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Right: Notes & Terms */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="notes" className="mb-2 block">
                Notes{' '}
                <span className="text-xs text-muted-foreground">(visible on invoice)</span>
              </Label>
              <Textarea
                id="notes"
                placeholder="Any additional notes for your client…"
                rows={4}
                {...form.register('notes')}
              />
            </div>

            <div>
              <Label htmlFor="terms" className="mb-2 block">
                Payment Terms{' '}
                <span className="text-xs text-muted-foreground">(visible on invoice)</span>
              </Label>
              <Textarea
                id="terms"
                placeholder="Payment terms and conditions…"
                rows={5}
                {...form.register('terms')}
              />
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-16">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            {isEditing ? 'Edit Invoice' : 'New Invoice'}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isEditing
              ? `Editing ${editInvoice?.id}`
              : 'Create a new invoice for your client.'}
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ChevronLeftIcon className="mr-1 size-4" />
          Back
        </Button>
      </div>

      {/* Step indicator */}
      <StepIndicator current={step} steps={STEPS} />

      {/* Form */}
      <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}
        </div>

        {/* Navigation */}
        <div className="mt-6 flex items-center justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={() => setStep((s) => Math.max(s - 1, 1))}
            disabled={step === 1}
          >
            <ChevronLeftIcon className="mr-1.5 size-4" />
            Back
          </Button>

          <div className="flex items-center gap-3">
            {step < 3 ? (
              <Button type="button" onClick={goNext}>
                Next
                <ChevronRightIcon className="ml-1.5 size-4" />
              </Button>
            ) : (
              <Button type="submit" disabled={submitting} className="min-w-[140px]">
                {submitting ? (
                  <>
                    <Loader2Icon className="mr-2 size-4 animate-spin" />
                    {isEditing ? 'Saving…' : 'Creating…'}
                  </>
                ) : isEditing ? (
                  'Save Changes'
                ) : (
                  'Create Invoice'
                )}
              </Button>
            )}
          </div>
        </div>
      </form>

      {/* Live total bar */}
      {calcs.total > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 py-3 px-4">
          <div className="mx-auto flex max-w-5xl items-center justify-between text-sm">
            <div className="flex gap-6">
              <span className="text-muted-foreground">
                Subtotal:{' '}
                <span className="font-medium text-foreground">
                  {formatCurrency(calcs.subtotal)}
                </span>
              </span>
              <span className="text-muted-foreground">
                VAT:{' '}
                <span className="font-medium text-foreground">
                  {formatCurrency(calcs.totalVat)}
                </span>
              </span>
            </div>
            <div className="font-bold text-lg">
              Total:{' '}
              <span className="text-primary">{formatCurrency(calcs.total)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

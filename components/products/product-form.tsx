'use client'

import * as React from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { createProduct, updateProduct } from '@/lib/actions/products'
import { VAT_TYPE_OPTIONS } from '@/lib/constants'
import { formatCurrency, calculateVAT } from '@/lib/utils'
import type { Product, VatType } from '@prisma/client'

// ─── Schema ────────────────────────────────────────────────────────────────

const productSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  description: z.string().max(2000).optional().or(z.literal('')),
  sku: z.string().max(100).optional().or(z.literal('')),
  unitPrice: z.coerce
    .number()
    .positive('Price must be greater than 0'),
  vatRate: z.coerce.number().min(0).max(100).default(20),
  vatType: z.enum(['STANDARD', 'REDUCED', 'ZERO', 'EXEMPT', 'REVERSE_CHARGE'] as const).default('STANDARD'),
  unit: z.string().max(50).default('each'),
  category: z.string().max(100).optional().or(z.literal('')),
  stockLevel: z.coerce.number().int().min(0).optional().or(z.literal('')),
  reorderPoint: z.coerce.number().int().min(0).optional().or(z.literal('')),
  isService: z.boolean().default(false),
  isActive: z.boolean().default(true),
})

type ProductFormValues = z.input<typeof productSchema>

// ─── Props ──────────────────────────────────────────────────────────────────

interface ProductFormProps {
  orgId: string
  product?: Product | null
  onSuccess?: (product: Product) => void
  onCancel?: () => void
}

const UNIT_OPTIONS = [
  { value: 'each', label: 'Each' },
  { value: 'hour', label: 'Hour' },
  { value: 'day', label: 'Day' },
  { value: 'kg', label: 'kg' },
  { value: 'm', label: 'Metre (m)' },
  { value: 'm²', label: 'Square Metre (m²)' },
  { value: 'project', label: 'Project' },
]

const VAT_RATE_OPTIONS = [
  { value: '20', label: '20% – Standard Rate' },
  { value: '5', label: '5% – Reduced Rate' },
  { value: '0', label: '0% – Zero Rated / Exempt' },
]

// ─── Component ───────────────────────────────────────────────────────────────

export function ProductForm({ orgId, product, onSuccess, onCancel }: ProductFormProps) {
  const isEditing = !!product

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    control,
    formState: { errors, isSubmitting },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: product?.name ?? '',
      description: product?.description ?? '',
      sku: product?.sku ?? '',
      unitPrice: product?.unitPrice ? Number(product.unitPrice) : undefined,
      vatRate: product?.vatRate ? Number(product.vatRate) : 20,
      vatType: (product?.vatType ?? 'STANDARD') as VatType,
      unit: product?.unit ?? 'each',
      category: product?.category ?? '',
      stockLevel: product?.stockLevel ?? undefined,
      reorderPoint: product?.reorderPoint ?? undefined,
      isService: product?.isService ?? false,
      isActive: product?.isActive ?? true,
    },
  })

  const watchedPrice = watch('unitPrice')
  const watchedVatRate = watch('vatRate')
  const watchedIsService = watch('isService')

  const { vatAmount, incVat } = React.useMemo(() => {
    const price = Number(watchedPrice) || 0
    const rate = Number(watchedVatRate) || 0
    return calculateVAT(price, rate)
  }, [watchedPrice, watchedVatRate])

  async function onSubmit(values: ProductFormValues) {
    try {
      const payload = {
        name: values.name,
        description: values.description || undefined,
        sku: values.sku || undefined,
        unitPrice: Number(values.unitPrice),
        vatRate: Number(values.vatRate),
        vatType: values.vatType as VatType,
        unit: values.unit,
        category: values.category || undefined,
        stockLevel: values.stockLevel !== undefined && values.stockLevel !== ('' as unknown as number)
          ? Number(values.stockLevel)
          : undefined,
        reorderPoint: values.reorderPoint !== undefined && values.reorderPoint !== ('' as unknown as number)
          ? Number(values.reorderPoint)
          : undefined,
        isService: values.isService,
      }

      let result: Product
      if (isEditing && product) {
        result = await updateProduct(orgId, product.id, payload)
        toast.success('Product updated successfully')
      } else {
        result = await createProduct(orgId, payload)
        toast.success('Product created successfully')
      }
      onSuccess?.(result)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong'
      toast.error(message)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* ── Basic Info ──────────────────────────────────────────── */}
      <section className="space-y-4">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Basic Information
        </h3>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2 space-y-1.5">
            <Label htmlFor="name">
              Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              placeholder="Web Development Services"
              {...register('name')}
              aria-invalid={!!errors.name}
            />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="sm:col-span-2 space-y-1.5">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              rows={2}
              placeholder="Brief description for invoice line items…"
              {...register('description')}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="sku">SKU / Code</Label>
            <Input id="sku" placeholder="WEB-001" {...register('sku')} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="category">Category</Label>
            <Input
              id="category"
              placeholder="Services, Software, Hardware…"
              {...register('category')}
            />
          </div>
        </div>
      </section>

      {/* ── Pricing ─────────────────────────────────────────────── */}
      <section className="space-y-4">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Pricing (ex-VAT)
        </h3>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="unitPrice">
              Unit Price (£, ex-VAT) <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                £
              </span>
              <Input
                id="unitPrice"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                className="pl-6"
                {...register('unitPrice')}
                aria-invalid={!!errors.unitPrice}
              />
            </div>
            {errors.unitPrice && (
              <p className="text-xs text-destructive">{errors.unitPrice.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="unit">Unit</Label>
            <Controller
              name="unit"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="unit" className="w-full">
                    <SelectValue placeholder="Select unit" />
                  </SelectTrigger>
                  <SelectContent>
                    {UNIT_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="vatRate">VAT Rate</Label>
            <Controller
              name="vatRate"
              control={control}
              render={({ field }) => (
                <Select
                  value={String(field.value)}
                  onValueChange={(v) => field.onChange(Number(v))}
                >
                  <SelectTrigger id="vatRate" className="w-full">
                    <SelectValue placeholder="Select VAT rate" />
                  </SelectTrigger>
                  <SelectContent>
                    {VAT_RATE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="vatType">VAT Type</Label>
            <Controller
              name="vatType"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="vatType" className="w-full">
                    <SelectValue placeholder="Select VAT type" />
                  </SelectTrigger>
                  <SelectContent>
                    {VAT_TYPE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
        </div>

        {/* Live price preview */}
        {Number(watchedPrice) > 0 && (
          <div className="rounded-lg border bg-muted/30 p-4 text-sm space-y-1.5">
            <p className="font-medium text-muted-foreground text-xs uppercase tracking-wide mb-2">
              Price Preview
            </p>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Ex-VAT</span>
              <span className="font-medium">{formatCurrency(Number(watchedPrice) || 0)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">VAT ({Number(watchedVatRate)}%)</span>
              <span>{formatCurrency(vatAmount)}</span>
            </div>
            <div className="flex justify-between border-t pt-1.5 mt-1.5">
              <span className="font-semibold">Total inc-VAT</span>
              <span className="font-semibold text-primary">{formatCurrency(incVat)}</span>
            </div>
          </div>
        )}
      </section>

      {/* ── Inventory ───────────────────────────────────────────── */}
      {!watchedIsService && (
        <section className="space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Inventory
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="stockLevel">Current Stock Level</Label>
              <Input
                id="stockLevel"
                type="number"
                min="0"
                step="1"
                placeholder="100"
                {...register('stockLevel')}
              />
              <p className="text-xs text-muted-foreground">Leave blank for services or untracked items.</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="reorderPoint">Reorder Point</Label>
              <Input
                id="reorderPoint"
                type="number"
                min="0"
                step="1"
                placeholder="10"
                {...register('reorderPoint')}
              />
              <p className="text-xs text-muted-foreground">Alert threshold for low stock.</p>
            </div>
          </div>
        </section>
      )}

      {/* ── Flags ───────────────────────────────────────────────── */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Controller
            name="isService"
            control={control}
            render={({ field }) => (
              <Checkbox
                id="isService"
                checked={field.value}
                onCheckedChange={field.onChange}
              />
            )}
          />
          <Label htmlFor="isService" className="cursor-pointer">
            This is a service (no stock tracking)
          </Label>
        </div>

        <div className="flex items-center gap-2">
          <Controller
            name="isActive"
            control={control}
            render={({ field }) => (
              <Checkbox
                id="isActive"
                checked={field.value}
                onCheckedChange={field.onChange}
              />
            )}
          />
          <Label htmlFor="isActive" className="cursor-pointer">
            Active (visible in invoice line items)
          </Label>
        </div>
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
          {isEditing ? 'Save Changes' : 'Create Product'}
        </Button>
      </div>
    </form>
  )
}

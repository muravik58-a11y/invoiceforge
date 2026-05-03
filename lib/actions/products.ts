'use server'

import { revalidatePath } from 'next/cache'
import prisma from '@/lib/prisma'
import type { Product, Prisma, VatType } from '@prisma/client'
import { serialize } from '@/lib/serialize'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CreateProductData {
  name: string
  description?: string
  sku?: string
  unitPrice: number       // stored as Decimal; pass as a number (e.g. 9999 = £99.99)
  vatRate?: number        // percentage, e.g. 20 for 20%
  vatType?: VatType
  unit?: string
  category?: string
  stockLevel?: number
  reorderPoint?: number
  isService?: boolean
}

export interface UpdateProductData extends Partial<CreateProductData> {}

export interface PaginatedProducts {
  products: Product[]
  total: number
  page: number
  limit: number
  totalPages: number
}

// ---------------------------------------------------------------------------
// getProducts
// ---------------------------------------------------------------------------

/**
 * Fetch a paginated, optionally-filtered list of active products/services for
 * an organisation.
 *
 * @param orgId  - The InvoiceForge organisation ID
 * @param search - Optional substring to match against name, description or SKU
 * @param page   - 1-based page number (default 1)
 * @param limit  - Items per page (default 20)
 */
export async function getProducts(
  orgId: string,
  search?: string,
  page = 1,
  limit = 20,
): Promise<PaginatedProducts> {
  if (!orgId) throw new Error('orgId is required')

  const skip = (page - 1) * limit

  const where: Prisma.ProductWhereInput = {
    organizationId: orgId,
    isActive: true,
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
            { sku: { contains: search, mode: 'insensitive' } },
            { category: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {}),
  }

  try {
    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
      }),
      prisma.product.count({ where }),
    ])

    return {
      products,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    }
  } catch (error) {
    console.error('[getProducts]', error)
    throw new Error('Failed to fetch products')
  }
}

// ---------------------------------------------------------------------------
// getProduct
// ---------------------------------------------------------------------------

/**
 * Fetch a single product, ensuring it belongs to the given organisation.
 *
 * @param orgId     - The InvoiceForge organisation ID
 * @param productId - The product's Prisma ID
 */
export async function getProduct(
  orgId: string,
  productId: string,
): Promise<Product | null> {
  if (!orgId) throw new Error('orgId is required')
  if (!productId) throw new Error('productId is required')

  try {
    const product = await prisma.product.findFirst({
      where: { id: productId, organizationId: orgId },
    })

    return product
  } catch (error) {
    console.error('[getProduct]', error)
    throw new Error('Failed to fetch product')
  }
}

// ---------------------------------------------------------------------------
// createProduct
// ---------------------------------------------------------------------------

/**
 * Create a new product or service within an organisation.
 *
 * @param orgId - The InvoiceForge organisation ID
 * @param data  - Product fields
 */
export async function createProduct(
  orgId: string,
  data: CreateProductData,
): Promise<Product> {
  if (!orgId) throw new Error('orgId is required')
  if (!data.name) throw new Error('name is required')
  if (data.unitPrice === undefined || data.unitPrice === null) {
    throw new Error('unitPrice is required')
  }

  try {
    const product = await prisma.product.create({
      data: {
        organizationId: orgId,
        name: data.name,
        description: data.description,
        sku: data.sku,
        unitPrice: data.unitPrice,
        vatRate: data.vatRate ?? 20,
        vatType: data.vatType ?? 'STANDARD',
        unit: data.unit ?? 'unit',
        category: data.category,
        stockLevel: data.stockLevel,
        reorderPoint: data.reorderPoint,
        isService: data.isService ?? false,
      },
    })

    revalidatePath('/products')
    return serialize(product) as typeof product
  } catch (error) {
    console.error('[createProduct]', error)
    throw new Error('Failed to create product')
  }
}

// ---------------------------------------------------------------------------
// updateProduct
// ---------------------------------------------------------------------------

/**
 * Update an existing product.
 *
 * @param orgId     - The InvoiceForge organisation ID
 * @param productId - The product's Prisma ID
 * @param data      - Fields to update
 */
export async function updateProduct(
  orgId: string,
  productId: string,
  data: UpdateProductData,
): Promise<Product> {
  if (!orgId) throw new Error('orgId is required')
  if (!productId) throw new Error('productId is required')

  const existing = await prisma.product.findFirst({
    where: { id: productId, organizationId: orgId },
    select: { id: true },
  })

  if (!existing) throw new Error('Product not found')

  try {
    const product = await prisma.product.update({
      where: { id: productId },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.sku !== undefined && { sku: data.sku }),
        ...(data.unitPrice !== undefined && { unitPrice: data.unitPrice }),
        ...(data.vatRate !== undefined && { vatRate: data.vatRate }),
        ...(data.vatType !== undefined && { vatType: data.vatType }),
        ...(data.unit !== undefined && { unit: data.unit }),
        ...(data.category !== undefined && { category: data.category }),
        ...(data.stockLevel !== undefined && { stockLevel: data.stockLevel }),
        ...(data.reorderPoint !== undefined && { reorderPoint: data.reorderPoint }),
        ...(data.isService !== undefined && { isService: data.isService }),
      },
    })

    revalidatePath('/products')
    revalidatePath(`/products/${productId}`)
    return serialize(product) as typeof product
  } catch (error) {
    console.error('[updateProduct]', error)
    throw new Error('Failed to update product')
  }
}

// ---------------------------------------------------------------------------
// deleteProduct
// ---------------------------------------------------------------------------

/**
 * Soft-delete a product by setting isActive to false.
 * Preserves historical line-item data on existing invoices.
 *
 * @param orgId     - The InvoiceForge organisation ID
 * @param productId - The product's Prisma ID
 */
export async function deleteProduct(
  orgId: string,
  productId: string,
): Promise<void> {
  if (!orgId) throw new Error('orgId is required')
  if (!productId) throw new Error('productId is required')

  const existing = await prisma.product.findFirst({
    where: { id: productId, organizationId: orgId },
    select: { id: true },
  })

  if (!existing) throw new Error('Product not found')

  try {
    await prisma.product.update({
      where: { id: productId },
      data: { isActive: false },
    })

    revalidatePath('/products')
  } catch (error) {
    console.error('[deleteProduct]', error)
    throw new Error('Failed to delete product')
  }
}

'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { type ColumnDef } from '@tanstack/react-table'
import {
  PlusIcon,
  SearchIcon,
  PencilIcon,
  Trash2Icon,
  PackageIcon,
  WrenchIcon,
} from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@/components/ui/tabs'
import { DataTable } from '@/components/shared/data-table'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { PageHeader } from '@/components/shared/page-header'
import { ProductForm } from '@/components/products/product-form'
import { deleteProduct } from '@/lib/actions/products'
import { VAT_TYPE_LABELS } from '@/lib/constants'
import { formatCurrency, cn } from '@/lib/utils'
import type { Product, VatType } from '@prisma/client'

// ─────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────

interface ProductsPageClientProps {
  products: Product[]
  orgId: string
}

// ─────────────────────────────────────────────
// Stock level cell
// ─────────────────────────────────────────────

function StockCell({ product }: { product: Product }) {
  if (product.isService || product.stockLevel == null) {
    return <span className="text-muted-foreground text-xs italic">N/A</span>
  }

  const isLow =
    product.reorderPoint != null && product.stockLevel <= product.reorderPoint

  return (
    <span
      className={cn(
        'font-medium',
        isLow ? 'text-red-600' : 'text-green-600',
      )}
    >
      {product.stockLevel}
      {isLow && (
        <span className="ml-1 text-xs font-normal text-red-500">(low)</span>
      )}
    </span>
  )
}

// ─────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────

export function ProductsPageClient({ products, orgId }: ProductsPageClientProps) {
  const router = useRouter()

  const [search, setSearch] = React.useState('')
  const [categoryFilter, setCategoryFilter] = React.useState<string>('all')
  const [tab, setTab] = React.useState<'all' | 'products' | 'services'>('all')
  const [showAddDialog, setShowAddDialog] = React.useState(false)
  const [editingProduct, setEditingProduct] = React.useState<Product | null>(null)
  const [deletingProductId, setDeletingProductId] = React.useState<string | null>(null)
  const [deleteLoading, setDeleteLoading] = React.useState(false)

  // ── Derived category list ───────────────────
  const categories = React.useMemo(() => {
    const cats = Array.from(
      new Set(products.map((p) => p.category).filter(Boolean) as string[]),
    )
    return cats.sort()
  }, [products])

  // ── Filtered data ───────────────────────────
  const filtered = React.useMemo(() => {
    return products.filter((p) => {
      const matchTab =
        tab === 'all' ||
        (tab === 'services' && p.isService) ||
        (tab === 'products' && !p.isService)

      const matchSearch =
        !search.trim() ||
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.sku?.toLowerCase().includes(search.toLowerCase()) ||
        p.category?.toLowerCase().includes(search.toLowerCase())

      const matchCategory =
        categoryFilter === 'all' || p.category === categoryFilter

      return matchTab && matchSearch && matchCategory
    })
  }, [products, tab, search, categoryFilter])

  // ── Delete handler ──────────────────────────
  async function handleDelete() {
    if (!deletingProductId) return
    setDeleteLoading(true)
    try {
      await deleteProduct(orgId, deletingProductId)
      toast.success('Product deleted')
      router.refresh()
    } catch {
      toast.error('Failed to delete product')
    } finally {
      setDeleteLoading(false)
      setDeletingProductId(null)
    }
  }

  // ── Column definitions ──────────────────────
  const columns: ColumnDef<Product>[] = [
    {
      accessorKey: 'sku',
      header: 'SKU',
      cell: ({ getValue }) =>
        getValue<string | null>() ? (
          <span className="font-mono text-xs text-muted-foreground">
            {getValue<string>()}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      accessorKey: 'name',
      header: 'Name',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          {row.original.isService ? (
            <WrenchIcon className="size-3.5 shrink-0 text-blue-500" />
          ) : (
            <PackageIcon className="size-3.5 shrink-0 text-purple-500" />
          )}
          <span className="font-medium">{row.original.name}</span>
        </div>
      ),
    },
    {
      accessorKey: 'category',
      header: 'Category',
      cell: ({ getValue }) => {
        const cat = getValue<string | null>()
        return cat ? (
          <Badge variant="secondary" className="text-xs">
            {cat}
          </Badge>
        ) : (
          <span className="text-muted-foreground">—</span>
        )
      },
    },
    {
      accessorKey: 'unitPrice',
      header: 'Unit Price (ex-VAT)',
      cell: ({ getValue }) => (
        <span className="font-medium tabular-nums">
          {formatCurrency(Number(getValue<string>()))}
        </span>
      ),
    },
    {
      accessorKey: 'vatRate',
      header: 'VAT Rate',
      cell: ({ row }) => (
        <span className="text-sm">
          {Number(row.original.vatRate)}%{' '}
          <span className="text-xs text-muted-foreground">
            ({VAT_TYPE_LABELS[row.original.vatType as VatType]})
          </span>
        </span>
      ),
    },
    {
      accessorKey: 'stockLevel',
      header: 'Stock',
      cell: ({ row }) => <StockCell product={row.original} />,
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Edit product"
            onClick={() => setEditingProduct(row.original)}
          >
            <PencilIcon className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Delete product"
            onClick={() => setDeletingProductId(row.original.id)}
          >
            <Trash2Icon className="size-3.5 text-destructive" />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Products & Services"
        description="Manage your catalogue of products and services for invoice line items."
      >
        <Button size="sm" onClick={() => setShowAddDialog(true)}>
          <PlusIcon className="mr-1.5 size-4" />
          Add Product / Service
        </Button>
      </PageHeader>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-48 max-w-sm">
          <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
          <Input
            className="pl-8"
            placeholder="Search name, SKU, category…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {categories.length > 0 && (
          <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v ?? '')}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="All categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Tab switcher */}
      <Tabs
        value={tab}
        onValueChange={(v) => setTab(v as typeof tab)}
      >
        <TabsList>
          <TabsTrigger value="all">
            All ({products.length})
          </TabsTrigger>
          <TabsTrigger value="products">
            <PackageIcon className="mr-1.5 size-3.5" />
            Products ({products.filter((p) => !p.isService).length})
          </TabsTrigger>
          <TabsTrigger value="services">
            <WrenchIcon className="mr-1.5 size-3.5" />
            Services ({products.filter((p) => p.isService).length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-4">
          <DataTable
            columns={columns}
            data={filtered}
            pageSize={10}
            emptyTitle={search ? 'No matching items' : 'No products or services yet'}
            emptyDescription={
              search
                ? 'Try a different search term or clear filters.'
                : 'Add your first product or service to get started.'
            }
            emptyIcon={<PackageIcon className="size-10 text-muted-foreground/40" />}
          />
        </TabsContent>

        <TabsContent value="products" className="mt-4">
          <DataTable
            columns={columns}
            data={filtered}
            pageSize={10}
            emptyTitle="No products"
            emptyDescription="No physical products found with current filters."
            emptyIcon={<PackageIcon className="size-10 text-muted-foreground/40" />}
          />
        </TabsContent>

        <TabsContent value="services" className="mt-4">
          <DataTable
            columns={columns}
            data={filtered}
            pageSize={10}
            emptyTitle="No services"
            emptyDescription="No services found with current filters."
            emptyIcon={<WrenchIcon className="size-10 text-muted-foreground/40" />}
          />
        </TabsContent>
      </Tabs>

      {/* Add / Edit Dialog */}
      <Dialog
        open={showAddDialog || !!editingProduct}
        onOpenChange={(open) => {
          if (!open) {
            setShowAddDialog(false)
            setEditingProduct(null)
          }
        }}
      >
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingProduct ? 'Edit Product / Service' : 'Add Product / Service'}
            </DialogTitle>
          </DialogHeader>
          <ProductForm
            orgId={orgId}
            product={editingProduct}
            onSuccess={() => {
              setShowAddDialog(false)
              setEditingProduct(null)
              router.refresh()
            }}
            onCancel={() => {
              setShowAddDialog(false)
              setEditingProduct(null)
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <ConfirmDialog
        open={!!deletingProductId}
        onOpenChange={(open) => !open && setDeletingProductId(null)}
        title="Delete Product"
        description="This will remove the product from your catalogue. It will no longer appear in invoice line item search. Existing invoices are not affected."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDelete}
        loading={deleteLoading}
      />
    </div>
  )
}

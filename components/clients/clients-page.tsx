'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { type ColumnDef } from '@tanstack/react-table'
import {
  PlusIcon,
  SearchIcon,
  PencilIcon,
  Trash2Icon,
  DownloadIcon,
  UploadIcon,
  UsersIcon,
} from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { DataTable } from '@/components/shared/data-table'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { PageHeader } from '@/components/shared/page-header'
import { ClientForm } from '@/components/clients/client-form'
import { deleteClient } from '@/lib/actions/clients'
import { formatCurrency } from '@/lib/utils'
import type { Client } from '@prisma/client'

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

interface ClientWithStats extends Client {
  totalInvoiced?: number
  totalPaid?: number
  outstanding?: number
}

interface ClientsPageClientProps {
  clients: Client[]
  orgId: string
}

// ─────────────────────────────────────────────
// CSV helpers
// ─────────────────────────────────────────────

function exportClientsCSV(clients: Client[]) {
  const headers = [
    'companyName',
    'contactName',
    'email',
    'phone',
    'vatNumber',
    'addressLine1',
    'addressLine2',
    'city',
    'county',
    'postcode',
    'country',
    'defaultPaymentTerms',
    'notes',
  ]
  const rows = clients.map((c) =>
    [
      c.companyName,
      c.contactName ?? '',
      c.email ?? '',
      c.phone ?? '',
      c.vatNumber ?? '',
      c.addressLine1 ?? '',
      c.addressLine2 ?? '',
      c.city ?? '',
      c.county ?? '',
      c.postcode ?? '',
      c.country ?? '',
      c.defaultPaymentTerms ?? '',
      c.notes ?? '',
    ]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(','),
  )
  const csv = [headers.join(','), ...rows].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `clients-${new Date().toISOString().split('T')[0]}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// ─────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────

export function ClientsPageClient({ clients, orgId }: ClientsPageClientProps) {
  const router = useRouter()

  const [search, setSearch] = React.useState('')
  const [showAddDialog, setShowAddDialog] = React.useState(false)
  const [editingClient, setEditingClient] = React.useState<Client | null>(null)
  const [deletingClientId, setDeletingClientId] = React.useState<string | null>(null)
  const [deleteLoading, setDeleteLoading] = React.useState(false)

  // ── Derived filtered list ───────────────────
  const filtered = React.useMemo(() => {
    if (!search.trim()) return clients
    const q = search.toLowerCase()
    return clients.filter(
      (c) =>
        c.companyName.toLowerCase().includes(q) ||
        c.contactName?.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q),
    )
  }, [clients, search])

  // ── Delete handler ──────────────────────────
  async function handleDelete() {
    if (!deletingClientId) return
    setDeleteLoading(true)
    try {
      await deleteClient(orgId, deletingClientId)
      toast.success('Client deleted')
      router.refresh()
    } catch {
      toast.error('Failed to delete client')
    } finally {
      setDeleteLoading(false)
      setDeletingClientId(null)
    }
  }

  // ── Column definitions ──────────────────────
  const columns: ColumnDef<ClientWithStats>[] = [
    {
      accessorKey: 'companyName',
      header: 'Company',
      cell: ({ row }) => (
        <button
          className="text-left font-medium text-foreground hover:text-primary transition-colors"
          onClick={() => router.push(`/clients/${row.original.id}`)}
        >
          {row.original.companyName}
        </button>
      ),
    },
    {
      accessorKey: 'contactName',
      header: 'Contact',
      cell: ({ getValue }) => getValue<string | null>() ?? '—',
    },
    {
      accessorKey: 'email',
      header: 'Email',
      cell: ({ getValue }) => {
        const email = getValue<string | null>()
        return email ? (
          <a href={`mailto:${email}`} className="text-primary hover:underline">
            {email}
          </a>
        ) : (
          '—'
        )
      },
    },
    {
      accessorKey: 'phone',
      header: 'Phone',
      cell: ({ getValue }) => getValue<string | null>() ?? '—',
    },
    {
      accessorKey: 'outstanding',
      header: 'Outstanding',
      cell: ({ row }) => {
        const v = row.original.outstanding
        return v !== undefined ? (
          <span className={v > 0 ? 'text-amber-600 font-medium' : 'text-muted-foreground'}>
            {formatCurrency(v)}
          </span>
        ) : (
          '—'
        )
      },
    },
    {
      accessorKey: 'totalPaid',
      header: 'Total Paid',
      cell: ({ row }) => {
        const v = row.original.totalPaid
        return v !== undefined ? (
          <span className="text-green-600 font-medium">{formatCurrency(v)}</span>
        ) : (
          '—'
        )
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Edit client"
            onClick={(e) => {
              e.stopPropagation()
              setEditingClient(row.original)
            }}
          >
            <PencilIcon className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Delete client"
            onClick={(e) => {
              e.stopPropagation()
              setDeletingClientId(row.original.id)
            }}
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
        title="Clients"
        description="Manage your clients and their billing details."
      >
        <Button variant="outline" size="sm" onClick={() => exportClientsCSV(clients)}>
          <DownloadIcon className="mr-1.5 size-4" />
          Export CSV
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            const input = document.createElement('input')
            input.type = 'file'
            input.accept = '.csv'
            input.onchange = (e) => {
              const file = (e.target as HTMLInputElement).files?.[0]
              if (file) toast.info(`CSV import: "${file.name}" – use the import API to process.`)
            }
            input.click()
          }}
        >
          <UploadIcon className="mr-1.5 size-4" />
          Import CSV
        </Button>
        <Button size="sm" onClick={() => setShowAddDialog(true)}>
          <PlusIcon className="mr-1.5 size-4" />
          Add Client
        </Button>
      </PageHeader>

      {/* Search */}
      <div className="relative max-w-sm">
        <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
        <Input
          className="pl-8"
          placeholder="Search by name, email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={filtered as ClientWithStats[]}
        pageSize={10}
        emptyTitle={search ? 'No matching clients' : 'No clients yet'}
        emptyDescription={
          search
            ? 'Try a different search term.'
            : 'Add your first client to get started.'
        }
        emptyIcon={<UsersIcon className="size-10 text-muted-foreground/40" />}
      />

      {/* Add / Edit Dialog */}
      <Dialog
        open={showAddDialog || !!editingClient}
        onOpenChange={(open) => {
          if (!open) {
            setShowAddDialog(false)
            setEditingClient(null)
          }
        }}
      >
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingClient ? 'Edit Client' : 'Add New Client'}</DialogTitle>
          </DialogHeader>
          <ClientForm
            orgId={orgId}
            client={editingClient}
            onSuccess={() => {
              setShowAddDialog(false)
              setEditingClient(null)
              router.refresh()
            }}
            onCancel={() => {
              setShowAddDialog(false)
              setEditingClient(null)
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <ConfirmDialog
        open={!!deletingClientId}
        onOpenChange={(open) => !open && setDeletingClientId(null)}
        title="Delete Client"
        description="This will permanently remove the client from your account. Their invoice history will be preserved. This action cannot be undone."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDelete}
        loading={deleteLoading}
      />
    </div>
  )
}

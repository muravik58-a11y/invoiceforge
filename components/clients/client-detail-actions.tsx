'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { PencilIcon, Trash2Icon } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { ClientForm } from '@/components/clients/client-form'
import { deleteClient } from '@/lib/actions/clients'
import type { Client } from '@prisma/client'

interface ClientDetailActionsProps {
  orgId: string
  client: Client
}

export function ClientDetailActions({ orgId, client }: ClientDetailActionsProps) {
  const router = useRouter()
  const [editOpen, setEditOpen] = React.useState(false)
  const [deleteOpen, setDeleteOpen] = React.useState(false)
  const [deleteLoading, setDeleteLoading] = React.useState(false)

  async function handleDelete() {
    setDeleteLoading(true)
    try {
      await deleteClient(orgId, client.id)
      toast.success('Client deleted')
      router.push('/clients')
      router.refresh()
    } catch {
      toast.error('Failed to delete client')
    } finally {
      setDeleteLoading(false)
      setDeleteOpen(false)
    }
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
          <PencilIcon className="mr-1.5 size-4" />
          Edit
        </Button>
        <Button variant="destructive" size="sm" onClick={() => setDeleteOpen(true)}>
          <Trash2Icon className="mr-1.5 size-4" />
          Delete
        </Button>
      </div>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Client</DialogTitle>
          </DialogHeader>
          <ClientForm
            orgId={orgId}
            client={client}
            onSuccess={() => {
              setEditOpen(false)
              router.refresh()
            }}
            onCancel={() => setEditOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete Client"
        description={`Are you sure you want to delete "${client.companyName}"? Their invoice history will be preserved but the client will be removed from your active list.`}
        confirmLabel="Delete Client"
        variant="destructive"
        onConfirm={handleDelete}
        loading={deleteLoading}
      />
    </>
  )
}

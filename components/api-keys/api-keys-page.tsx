'use client'

import * as React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { format } from 'date-fns'
import { toast } from 'sonner'
import {
  PlusIcon,
  CopyIcon,
  Trash2Icon,
  KeyIcon,
  ShieldAlertIcon,
  CheckIcon,
  Loader2Icon,
  FlaskConicalIcon,
  EyeOffIcon,
} from 'lucide-react'
import type { ApiKey } from '@prisma/client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { PageHeader } from '@/components/shared/page-header'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { createApiKey, revokeApiKey } from '@/lib/actions/api-keys'
import { formatDate } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const createSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  expiresAt: z.string().optional(),
})

type CreateFormValues = z.infer<typeof createSchema>

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ApiKeysPageClientProps {
  apiKeys: ApiKey[]
  orgId: string
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ApiKeysPageClient({ apiKeys: initialKeys, orgId }: ApiKeysPageClientProps) {
  const [apiKeys, setApiKeys] = React.useState<ApiKey[]>(initialKeys)
  const [createOpen, setCreateOpen] = React.useState(false)
  const [newRawKey, setNewRawKey] = React.useState<string | null>(null)
  const [copied, setCopied] = React.useState(false)
  const [revokeTarget, setRevokeTarget] = React.useState<string | null>(null)
  const [revokeLoading, setRevokeLoading] = React.useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateFormValues>({ resolver: zodResolver(createSchema) })

  // ── Create key ────────────────────────────────────────────────────────────
  async function onCreateSubmit(values: CreateFormValues) {
    try {
      const expiresAt = values.expiresAt ? new Date(values.expiresAt) : undefined
      const { apiKey, rawKey } = await createApiKey(orgId, values.name, expiresAt)
      setApiKeys((prev) => [apiKey, ...prev])
      setNewRawKey(rawKey)
      setCreateOpen(false)
      reset()
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to create API key')
    }
  }

  // ── Copy key ──────────────────────────────────────────────────────────────
  async function handleCopy(text: string) {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      toast.success('API key copied to clipboard')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Failed to copy to clipboard')
    }
  }

  // ── Revoke key ────────────────────────────────────────────────────────────
  async function handleRevoke() {
    if (!revokeTarget) return
    setRevokeLoading(true)
    try {
      await revokeApiKey(orgId, revokeTarget)
      setApiKeys((prev) =>
        prev.map((k) => (k.id === revokeTarget ? { ...k, isActive: false } : k)),
      )
      toast.success('API key revoked')
      setRevokeTarget(null)
    } catch {
      toast.error('Failed to revoke API key')
    } finally {
      setRevokeLoading(false)
    }
  }

  const isExpired = (key: ApiKey) =>
    key.expiresAt ? new Date(key.expiresAt) < new Date() : false

  return (
    <div className="space-y-6">
      <PageHeader
        title="API Keys"
        description="Manage API keys for programmatic access to InvoiceForge UK."
      >
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <PlusIcon className="mr-2 h-4 w-4" />
          Create API Key
        </Button>
      </PageHeader>

      {/* ── Beta banner ── */}
      <Alert className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/20">
        <FlaskConicalIcon className="h-4 w-4 text-amber-600" />
        <AlertTitle className="text-amber-800 dark:text-amber-400">Coming Soon / Beta</AlertTitle>
        <AlertDescription className="text-amber-700 dark:text-amber-300">
          The InvoiceForge UK REST API is currently in private beta. API keys can be created now,
          but full documentation and endpoints are coming soon. Contact support to request early
          access.
        </AlertDescription>
      </Alert>

      {/* ── Keys Table ── */}
      {apiKeys.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
          <KeyIcon className="mb-3 h-10 w-10 text-muted-foreground/50" />
          <p className="text-sm font-medium text-muted-foreground">No API keys yet</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Create your first API key to get started.
          </p>
          <Button size="sm" className="mt-4" onClick={() => setCreateOpen(true)}>
            <PlusIcon className="mr-2 h-4 w-4" />
            Create API Key
          </Button>
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Key Prefix</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Last Used</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {apiKeys.map((key) => {
                const expired = isExpired(key)
                return (
                  <TableRow key={key.id} className={!key.isActive || expired ? 'opacity-60' : ''}>
                    <TableCell className="font-medium">{key.name}</TableCell>
                    <TableCell>
                      <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">
                        {key.keyPrefix}…
                      </code>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(key.createdAt)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {key.lastUsedAt ? formatDate(key.lastUsedAt) : 'Never'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {key.expiresAt ? (
                        <span className={expired ? 'text-red-500' : ''}>
                          {formatDate(key.expiresAt)}
                        </span>
                      ) : (
                        'Never'
                      )}
                    </TableCell>
                    <TableCell>
                      {!key.isActive ? (
                        <Badge variant="destructive">Revoked</Badge>
                      ) : expired ? (
                        <Badge variant="outline" className="text-red-500 border-red-300">
                          Expired
                        </Badge>
                      ) : (
                        <Badge className="bg-green-100 text-green-700 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400">
                          Active
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {key.isActive && !expired && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setRevokeTarget(key.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2Icon className="mr-1 h-4 w-4" />
                          Revoke
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* ── Code Example ── */}
      <div className="rounded-lg border bg-muted/50 p-5">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
          <KeyIcon className="h-4 w-4" />
          How to use your API key
        </h3>
        <p className="mb-3 text-sm text-muted-foreground">
          Include your API key in the{' '}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">Authorization</code> header of
          every request:
        </p>
        <pre className="overflow-x-auto rounded-md bg-gray-900 p-4 text-sm text-green-400">
          <code>{`curl -X GET \\
  https://invoiceforge.co.uk/api/v1/invoices \\
  -H "Authorization: Bearer ifuk_your_api_key_here" \\
  -H "Content-Type: application/json"`}</code>
        </pre>
        <p className="mt-3 text-xs text-muted-foreground">
          Keep your API key secret. Never expose it in client-side code or public repositories.
        </p>
      </div>

      {/* ── Create Dialog ── */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create API Key</DialogTitle>
            <DialogDescription>
              Give your key a descriptive name so you can identify it later. The key will only be
              shown once — store it securely.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit(onCreateSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="key-name">Name *</Label>
              <Input
                id="key-name"
                placeholder="e.g. Production, CI/CD Pipeline, Zapier"
                {...register('name')}
              />
              {errors.name && (
                <p className="text-xs text-destructive">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="key-expires">Expiry Date (optional)</Label>
              <Input
                id="key-expires"
                type="date"
                min={format(new Date(), 'yyyy-MM-dd')}
                {...register('expiresAt')}
              />
              <p className="text-xs text-muted-foreground">
                Leave blank for a key that never expires.
              </p>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => { setCreateOpen(false); reset() }}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />}
                Create Key
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── New Key Display Dialog ── */}
      <Dialog open={!!newRawKey} onOpenChange={(open) => { if (!open) setNewRawKey(null) }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-600">
              <CheckIcon className="h-5 w-5" />
              API Key Created
            </DialogTitle>
            <DialogDescription>
              Your new API key has been created. Copy it now — it will{' '}
              <strong>not be shown again</strong> for security reasons.
            </DialogDescription>
          </DialogHeader>

          <Alert className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/20">
            <ShieldAlertIcon className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-700 dark:text-amber-300">
              Store this key somewhere safe (e.g. a password manager or secrets vault). You
              cannot retrieve it again once you close this dialog.
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label>Your API Key</Label>
            <div className="flex gap-2">
              <code className="flex-1 overflow-x-auto rounded-md bg-muted px-3 py-2 text-sm font-mono break-all">
                {newRawKey}
              </code>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => handleCopy(newRawKey!)}
              >
                {copied ? (
                  <CheckIcon className="h-4 w-4 text-green-500" />
                ) : (
                  <CopyIcon className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-md border p-3 text-sm text-muted-foreground">
            <EyeOffIcon className="h-4 w-4 shrink-0" />
            <span>
              This is the only time you will see this key. If you lose it, you will need to revoke
              it and create a new one.
            </span>
          </div>

          <DialogFooter>
            <Button onClick={() => setNewRawKey(null)}>
              I have saved my key — Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Revoke Confirm ── */}
      <ConfirmDialog
        open={!!revokeTarget}
        onOpenChange={(open) => { if (!open) setRevokeTarget(null) }}
        title="Revoke API key?"
        description="This will immediately invalidate the key. Any integrations using it will stop working. This cannot be undone."
        onConfirm={handleRevoke}
        variant="destructive"
        confirmLabel="Revoke"
        loading={revokeLoading}
      />
    </div>
  )
}

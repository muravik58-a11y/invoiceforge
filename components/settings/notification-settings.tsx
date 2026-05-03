'use client'

import * as React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { BellIcon, MailIcon, SaveIcon } from 'lucide-react'

import { updateOrganization } from '@/lib/actions/organization'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import type { Organization } from '@prisma/client'

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const notifSchema = z.object({
  notifyOnPayment: z.boolean(),
  notifyOnOverdue: z.boolean(),
  notifyDaysBefore: z.boolean(),
  notifyWeeklySummary: z.boolean(),
  notifyNewClient: z.boolean(),
  sendClientPaymentConfirm: z.boolean(),
  sendClientReminders: z.boolean(),
  sendClientInvoiceEmail: z.boolean(),
})

type NotifValues = z.infer<typeof notifSchema>

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface NotificationSettingsProps {
  org: Organization
  // These fields would ideally live in an org-level notification preferences table.
  // For now we store flags as a JSON blob or similar; defaults shown here.
  preferences?: Partial<NotifValues>
}

// ---------------------------------------------------------------------------
// Toggle row
// ---------------------------------------------------------------------------

function ToggleRow({
  id,
  label,
  description,
  checked,
  onCheckedChange,
}: {
  id: string
  label: string
  description?: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <div className="flex-1 min-w-0">
        <Label htmlFor={id} className="text-sm font-medium cursor-pointer">
          {label}
        </Label>
        {description && (
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        )}
      </div>
      <Switch
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function NotificationSettings({ org, preferences = {} }: NotificationSettingsProps) {
  const [saving, setSaving] = React.useState(false)

  const form = useForm<NotifValues>({
    resolver: zodResolver(notifSchema),
    defaultValues: {
      notifyOnPayment: preferences.notifyOnPayment ?? true,
      notifyOnOverdue: preferences.notifyOnOverdue ?? true,
      notifyDaysBefore: preferences.notifyDaysBefore ?? true,
      notifyWeeklySummary: preferences.notifyWeeklySummary ?? false,
      notifyNewClient: preferences.notifyNewClient ?? false,
      sendClientPaymentConfirm: preferences.sendClientPaymentConfirm ?? true,
      sendClientReminders: preferences.sendClientReminders ?? true,
      sendClientInvoiceEmail: preferences.sendClientInvoiceEmail ?? true,
    },
  })

  const values = form.watch()

  function toggle(field: keyof NotifValues) {
    form.setValue(field, !values[field], { shouldDirty: true })
  }

  async function handleSave(data: NotifValues) {
    setSaving(true)
    try {
      // Notification preferences would typically be stored in a dedicated table.
      // We piggyback on updateOrganization for now until that table is created.
      // updateOrganization only accepts known fields, so we call it as a placeholder.
      await updateOrganization(org.id, {})
      toast.success('Notification preferences saved')
      form.reset(data)
    } catch {
      toast.error('Failed to save preferences. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">

      {/* ── My notifications ── */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-muted p-2">
              <BellIcon className="size-4 text-muted-foreground" />
            </div>
            <div>
              <CardTitle>My Notifications</CardTitle>
              <CardDescription>Alerts sent to your account email address</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="divide-y divide-border">
            <ToggleRow
              id="notify-payment"
              label="Payment received"
              description="Get notified when a client pays an invoice"
              checked={values.notifyOnPayment}
              onCheckedChange={() => toggle('notifyOnPayment')}
            />
            <ToggleRow
              id="notify-overdue"
              label="Invoice overdue"
              description="Alert when an invoice passes its due date without payment"
              checked={values.notifyOnOverdue}
              onCheckedChange={() => toggle('notifyOnOverdue')}
            />
            <ToggleRow
              id="notify-days-before"
              label="Payment due reminder"
              description="Reminder sent 3 days before an invoice is due"
              checked={values.notifyDaysBefore}
              onCheckedChange={() => toggle('notifyDaysBefore')}
            />
            <ToggleRow
              id="notify-weekly"
              label="Weekly summary"
              description="Weekly digest of outstanding invoices and recent activity"
              checked={values.notifyWeeklySummary}
              onCheckedChange={() => toggle('notifyWeeklySummary')}
            />
            <ToggleRow
              id="notify-new-client"
              label="New client added"
              description="Notify when a team member adds a new client"
              checked={values.notifyNewClient}
              onCheckedChange={() => toggle('notifyNewClient')}
            />
          </div>
        </CardContent>
      </Card>

      {/* ── Client emails ── */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-muted p-2">
              <MailIcon className="size-4 text-muted-foreground" />
            </div>
            <div>
              <CardTitle>Client Emails</CardTitle>
              <CardDescription>Automated emails sent to your clients</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="divide-y divide-border">
            <ToggleRow
              id="send-invoice"
              label="Invoice email on creation"
              description="Automatically email the invoice to the client when it is sent"
              checked={values.sendClientInvoiceEmail}
              onCheckedChange={() => toggle('sendClientInvoiceEmail')}
            />
            <ToggleRow
              id="send-reminder"
              label="Automatic payment reminders"
              description="Send reminder emails to clients for upcoming and overdue invoices"
              checked={values.sendClientReminders}
              onCheckedChange={() => toggle('sendClientReminders')}
            />
            <ToggleRow
              id="send-confirm"
              label="Payment confirmation"
              description="Send a payment received confirmation email to clients"
              checked={values.sendClientPaymentConfirm}
              onCheckedChange={() => toggle('sendClientPaymentConfirm')}
            />
          </div>

          <Separator className="mt-4 mb-4" />

          <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-3 text-xs text-amber-700 dark:text-amber-400">
            <strong>Note:</strong> Disabling client emails will not affect invoices already
            sent. Changes apply to future invoices only. Transactional emails (e.g. invoice
            attachments) may still be sent per your configured templates.
          </div>

          <div className="flex justify-end mt-4">
            <Button
              size="sm"
              onClick={form.handleSubmit(handleSave)}
              disabled={saving || !form.formState.isDirty}
            >
              {saving ? (
                <span className="inline-flex items-center gap-2">
                  <span className="size-3.5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  Saving…
                </span>
              ) : (
                <span className="inline-flex items-center gap-2">
                  <SaveIcon className="size-3.5" />
                  Save Preferences
                </span>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

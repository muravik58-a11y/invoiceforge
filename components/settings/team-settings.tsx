'use client'

import * as React from 'react'
import { useOrganization, useUser } from '@clerk/nextjs'
// OrganizationMembershipResource is typed inline below
import {
  UserPlusIcon,
  MailIcon,
  MoreVerticalIcon,
  ShieldIcon,
  EyeIcon,
  Calculator,
  Trash2Icon,
  Crown,
} from 'lucide-react'
import { toast } from 'sonner'

import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

// ---------------------------------------------------------------------------
// Role config
// ---------------------------------------------------------------------------

const ROLE_CONFIG: Record<
  string,
  { label: string; colorClass: string; icon: React.ElementType; description: string }
> = {
  'org:admin': {
    label: 'Admin',
    colorClass: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    icon: ShieldIcon,
    description: 'Full access except billing',
  },
  'org:owner': {
    label: 'Owner',
    colorClass: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
    icon: Crown,
    description: 'Full access including billing and deletion',
  },
  'org:accountant': {
    label: 'Accountant',
    colorClass: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
    icon: Calculator,
    description: 'View invoices, exports, and reports',
  },
  'org:viewer': {
    label: 'Viewer',
    colorClass: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
    icon: EyeIcon,
    description: 'Read-only access',
  },
  // Clerk default roles
  'org:member': {
    label: 'Member',
    colorClass: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
    icon: ShieldIcon,
    description: 'Standard member access',
  },
}

function getRoleConfig(role: string) {
  return (
    ROLE_CONFIG[role] ?? {
      label: role.replace('org:', '').replace(/^\w/, (c) => c.toUpperCase()),
      colorClass: 'bg-muted text-muted-foreground',
      icon: ShieldIcon,
      description: 'Custom role',
    }
  )
}

// ---------------------------------------------------------------------------
// Member row
// ---------------------------------------------------------------------------

function MemberRow({
  membership,
  isCurrentUser,
  onRemove,
  onRoleChange,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  membership: any
  isCurrentUser: boolean
  onRemove: (id: string) => void
  onRoleChange: (id: string, role: string) => void
}) {
  const roleConfig = getRoleConfig(membership.role)
  const RoleIcon = roleConfig.icon
  const member = membership.publicUserData

  return (
    <div className="flex items-center gap-4 rounded-lg border border-border px-4 py-3">
      {/* Avatar */}
      <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted font-medium text-sm uppercase">
        {member?.firstName?.[0] ?? member?.identifier?.[0] ?? '?'}
      </div>

      {/* Name & email */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">
          {member?.firstName && member?.lastName
            ? `${member.firstName} ${member.lastName}`
            : member?.identifier ?? 'Unknown'}
          {isCurrentUser && (
            <span className="ml-2 text-xs text-muted-foreground">(you)</span>
          )}
        </p>
        <p className="text-xs text-muted-foreground truncate">{member?.identifier ?? ''}</p>
      </div>

      {/* Role badge */}
      <span
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium',
          roleConfig.colorClass,
        )}
      >
        <RoleIcon className="size-3" />
        {roleConfig.label}
      </span>

      {/* Actions */}
      {!isCurrentUser && (
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="size-8 shrink-0" />}>
            <MoreVerticalIcon className="size-4" />
            <span className="sr-only">Member actions</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onRoleChange(membership.id, 'org:admin')}>
              Make Admin
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onRoleChange(membership.id, 'org:member')}>
              Make Member
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onRoleChange(membership.id, 'org:viewer')}>
              Make Viewer
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onRemove(membership.id)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2Icon className="size-4" />
              Remove from Team
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Invite dialog
// ---------------------------------------------------------------------------

function InviteDialog({ onInvite }: { onInvite: (email: string, role: string) => Promise<void> }) {
  const [open, setOpen] = React.useState(false)
  const [email, setEmail] = React.useState('')
  const [role, setRole] = React.useState('org:member')
  const [loading, setLoading] = React.useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setLoading(true)
    try {
      await onInvite(email.trim(), role)
      toast.success(`Invitation sent to ${email}`)
      setOpen(false)
      setEmail('')
      setRole('org:member')
    } catch (err) {
      toast.error('Failed to send invitation. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>
        <UserPlusIcon className="size-3.5" />
        Invite Member
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite Team Member</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="invite-email">Email Address</Label>
            <div className="relative">
              <MailIcon className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                id="invite-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="colleague@example.com"
                className="pl-9"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="invite-role">Role</Label>
            <Select value={role} onValueChange={(v) => v && setRole(v)}>
              <SelectTrigger id="invite-role" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(ROLE_CONFIG).map(([key, config]) => (
                  <SelectItem key={key} value={key}>
                    <span className="flex items-center gap-2">
                      <config.icon className="size-4" />
                      <span>
                        <span className="font-medium">{config.label}</span>
                        <span className="text-muted-foreground text-xs ml-2">
                          — {config.description}
                        </span>
                      </span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? 'Sending…' : 'Send Invitation'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function TeamSettings() {
  const { organization, memberships, invitations } = useOrganization({
    memberships: { infinite: false },
    invitations: { infinite: false },
  })
  const { user } = useUser()

  const members = memberships?.data ?? []
  const pendingInvites = invitations?.data ?? []

  async function handleInvite(email: string, role: string) {
    if (!organization) throw new Error('No organisation')
    await organization.inviteMember({ emailAddress: email, role })
    await invitations?.revalidate?.()
  }

  async function handleRemove(membershipId: string) {
    const membership = members.find((m) => m.id === membershipId)
    if (!membership) return
    try {
      await membership.destroy()
      await memberships?.revalidate?.()
      toast.success('Member removed from team')
    } catch {
      toast.error('Failed to remove member')
    }
  }

  async function handleRoleChange(membershipId: string, newRole: string) {
    const membership = members.find((m) => m.id === membershipId)
    if (!membership) return
    try {
      await membership.update({ role: newRole })
      await memberships?.revalidate?.()
      toast.success('Role updated')
    } catch {
      toast.error('Failed to update role')
    }
  }

  async function handleRevokeInvite(invitationId: string) {
    const invitation = pendingInvites.find((i) => i.id === invitationId)
    if (!invitation) return
    try {
      await invitation.revoke()
      await invitations?.revalidate?.()
      toast.success('Invitation revoked')
    } catch {
      toast.error('Failed to revoke invitation')
    }
  }

  return (
    <div className="space-y-6">
      {/* ── Current members ── */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Team Members</CardTitle>
              <CardDescription>
                {members.length} member{members.length !== 1 ? 's' : ''} in your organisation
              </CardDescription>
            </div>
            <InviteDialog onInvite={handleInvite} />
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {members.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-muted-foreground text-sm gap-2">
              <UserPlusIcon className="size-8 opacity-40" />
              <p>No members yet. Invite your team to get started.</p>
            </div>
          ) : (
            members.map((membership) => (
              <MemberRow
                key={membership.id}
                membership={membership}
                isCurrentUser={membership.publicUserData?.userId === user?.id}
                onRemove={handleRemove}
                onRoleChange={handleRoleChange}
              />
            ))
          )}
        </CardContent>
      </Card>

      {/* ── Pending invitations ── */}
      {pendingInvites.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Pending Invitations</CardTitle>
            <CardDescription>
              {pendingInvites.length} invitation{pendingInvites.length !== 1 ? 's' : ''} awaiting acceptance
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingInvites.map((invite) => {
              const roleConfig = getRoleConfig(invite.role)
              const RoleIcon = roleConfig.icon
              return (
                <div
                  key={invite.id}
                  className="flex items-center gap-4 rounded-lg border border-dashed border-border px-4 py-3"
                >
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted/50">
                    <MailIcon className="size-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{invite.emailAddress}</p>
                    <p className="text-xs text-muted-foreground">Invitation pending</p>
                  </div>
                  <span
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium',
                      roleConfig.colorClass,
                    )}
                  >
                    <RoleIcon className="size-3" />
                    {roleConfig.label}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRevokeInvite(invite.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    Revoke
                  </Button>
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}

      {/* ── Role descriptions ── */}
      <Card>
        <CardHeader>
          <CardTitle>Role Permissions</CardTitle>
          <CardDescription>What each role can do in InvoiceForge</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {Object.entries(ROLE_CONFIG).map(([key, config]) => {
              const RoleIcon = config.icon
              return (
                <div
                  key={key}
                  className="flex items-start gap-3 rounded-lg border border-border p-3"
                >
                  <span
                    className={cn(
                      'inline-flex size-8 shrink-0 items-center justify-center rounded-lg',
                      config.colorClass,
                    )}
                  >
                    <RoleIcon className="size-4" />
                  </span>
                  <div>
                    <p className="text-sm font-medium">{config.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{config.description}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

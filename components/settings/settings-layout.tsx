'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  BuildingIcon,
  CreditCardIcon,
  UsersIcon,
  BellIcon,
  KeyIcon,
  PaletteIcon,
} from 'lucide-react'

import { cn } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Nav items
// ---------------------------------------------------------------------------

const NAV_ITEMS = [
  {
    href: '/settings/company',
    label: 'Company Profile',
    icon: BuildingIcon,
    description: 'Business details, address, banking',
  },
  {
    href: '/settings/billing',
    label: 'Billing & Plan',
    icon: CreditCardIcon,
    description: 'Subscription, usage, invoices',
  },
  {
    href: '/settings/team',
    label: 'Team Members',
    icon: UsersIcon,
    description: 'Invite and manage team access',
  },
  {
    href: '/settings/appearance',
    label: 'Invoice Templates',
    icon: PaletteIcon,
    description: 'PDF template and branding',
  },
  {
    href: '/settings/notifications',
    label: 'Email & Notifications',
    icon: BellIcon,
    description: 'Notification preferences',
  },
  {
    href: '/api-keys',
    label: 'API Keys',
    icon: KeyIcon,
    description: 'Manage API access tokens',
  },
] as const

// ---------------------------------------------------------------------------
// Layout component
// ---------------------------------------------------------------------------

interface SettingsLayoutProps {
  children: React.ReactNode
}

export function SettingsLayout({ children }: SettingsLayoutProps) {
  const pathname = usePathname()

  return (
    <div className="space-y-6">
      {/* ── Page header ── */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Manage your account, company details, and preferences
        </p>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
        {/* ── Sidebar navigation ── */}
        <aside className="w-full lg:w-56 shrink-0">
          <nav className="space-y-1">
            {NAV_ITEMS.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
              const Icon = item.icon

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors',
                    isActive
                      ? 'danger' in item && item.danger
                        ? 'bg-destructive/10 text-destructive'
                        : 'bg-primary/10 text-primary font-medium'
                      : 'danger' in item && item.danger
                      ? 'text-destructive/70 hover:bg-destructive/5 hover:text-destructive'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                  )}
                >
                  <Icon
                    className={cn(
                      'size-4 shrink-0',
                      isActive
                        ? 'danger' in item && item.danger
                          ? 'text-destructive'
                          : 'text-primary'
                        : 'danger' in item && item.danger
                        ? 'text-destructive/60'
                        : 'text-muted-foreground',
                    )}
                  />
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </nav>
        </aside>

        {/* ── Main content ── */}
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  )
}

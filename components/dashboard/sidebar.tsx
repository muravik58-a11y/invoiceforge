'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import {
  LayoutDashboard,
  FileText,
  Users,
  Package,
  CreditCard,
  BarChart3,
  Bell,
  Settings,
  Key,
  ChevronDown,
  Zap,
  Sparkles,
  Moon,
  Sun,
} from 'lucide-react'
import { useTheme } from 'next-themes'
import { OrganizationSwitcher, UserButton } from '@clerk/nextjs'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface NavSubItem {
  label: string
  href: string
}

interface NavItem {
  label: string
  href: string
  icon: React.ElementType
  badge?: number
  children?: NavSubItem[]
}

const navItems: NavItem[] = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    label: 'Invoices',
    href: '/invoices',
    icon: FileText,
    children: [
      { label: 'All Invoices', href: '/invoices' },
      { label: 'Create New', href: '/invoices/new' },
      { label: 'Recurring', href: '/invoices/recurring' },
    ],
  },
  {
    label: 'Clients',
    href: '/clients',
    icon: Users,
  },
  {
    label: 'Products',
    href: '/products',
    icon: Package,
  },
  {
    label: 'Payments',
    href: '/payments',
    icon: CreditCard,
  },
  {
    label: 'Reports',
    href: '/reports',
    icon: BarChart3,
  },
  {
    label: 'Notifications',
    href: '/notifications',
    icon: Bell,
  },
]

const bottomNavItems: NavItem[] = [
  {
    label: 'Settings',
    href: '/settings',
    icon: Settings,
  },
  {
    label: 'API Keys',
    href: '/api-keys',
    icon: Key,
  },
]

interface DashboardSidebarProps {
  plan?: 'free' | 'pro' | 'enterprise'
}

export function DashboardSidebar({ plan = 'free' }: DashboardSidebarProps) {
  const isFreePlan = plan === 'free'
  const pathname = usePathname()
  const { theme, setTheme } = useTheme()
  const [invoicesExpanded, setInvoicesExpanded] = useState(
    pathname.startsWith('/invoices')
  )

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard'
    }
    return pathname === href || pathname.startsWith(href + '/')
  }

  const isParentActive = (item: NavItem) => {
    if (item.children) {
      return item.children.some((child) => isActive(child.href)) || isActive(item.href)
    }
    return isActive(item.href)
  }

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }

  const renderNavItem = (item: NavItem) => {
    const Icon = item.icon
    const active = isParentActive(item)
    const hasChildren = !!item.children
    const isInvoices = item.label === 'Invoices'

    if (hasChildren) {
      return (
        <li key={item.href}>
          <button
            onClick={() => {
              if (isInvoices) setInvoicesExpanded((prev) => !prev)
            }}
            className={cn(
              'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              active
                ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span className="flex-1 text-left">{item.label}</span>
            {item.badge !== undefined && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-600 px-1.5 text-[10px] font-semibold text-white tabular-nums">
                {item.badge}
              </span>
            )}
            <ChevronDown
              className={cn(
                'h-3.5 w-3.5 shrink-0 transition-transform duration-200',
                invoicesExpanded && isInvoices ? 'rotate-180' : ''
              )}
            />
          </button>

          {/* Collapsible sub-items */}
          {isInvoices && invoicesExpanded && (
            <ul className="mt-0.5 space-y-0.5 pl-4 pr-1">
              {item.children!.map((child) => (
                <li key={child.href}>
                  <Link
                    href={child.href}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3 py-1.5 text-sm transition-colors',
                      isActive(child.href)
                        ? 'bg-sidebar-accent font-medium text-sidebar-accent-foreground'
                        : 'text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                    )}
                  >
                    <span className="h-1 w-1 rounded-full bg-current opacity-60 shrink-0" />
                    {child.label}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </li>
      )
    }

    return (
      <li key={item.href}>
        <Link
          href={item.href}
          className={cn(
            'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
            active
              ? 'bg-sidebar-accent text-sidebar-accent-foreground'
              : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
          )}
        >
          <Icon className="h-4 w-4 shrink-0" />
          <span className="flex-1">{item.label}</span>
          {item.badge !== undefined && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-600 px-1.5 text-[10px] font-semibold text-white tabular-nums">
              {item.badge}
            </span>
          )}
        </Link>
      </li>
    )
  }

  return (
    <aside
      className="fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-sidebar-border bg-sidebar"
      aria-label="Main navigation"
    >
      {/* ── Logo ── */}
      <div className="flex h-16 shrink-0 items-center gap-2 border-b border-sidebar-border px-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 shadow-sm">
          <Zap className="h-4 w-4 text-white" />
        </div>
        <span className="text-base font-semibold tracking-tight text-sidebar-foreground">
          InvoiceForge UK
        </span>
      </div>

      {/* ── Org switcher ── */}
      <div className="shrink-0 border-b border-sidebar-border px-4 py-3">
        <OrganizationSwitcher
          hidePersonal
          appearance={{
            elements: {
              rootBox: 'w-full',
              organizationSwitcherTrigger:
                'w-full rounded-lg px-2 py-1.5 text-sm text-sidebar-foreground hover:bg-sidebar-accent transition-colors justify-start',
              organizationSwitcherPopoverCard: 'shadow-lg border border-border',
            },
          }}
        />
      </div>

      {/* ── Primary nav ── */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-0.5" role="list">
          {navItems.map(renderNavItem)}
        </ul>

        <Separator className="my-3" />

        {/* Bottom / utility nav */}
        <ul className="space-y-0.5" role="list">
          {bottomNavItems.map(renderNavItem)}
        </ul>
      </nav>

      {/* ── Plan indicator ── */}
      <div className="shrink-0 px-3 pb-2">
        {isFreePlan ? (
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 dark:border-blue-900 dark:bg-blue-950/30">
            <div className="mb-2 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-blue-600" />
              <span className="text-xs font-semibold text-blue-800 dark:text-blue-300">
                Upgrade to Pro
              </span>
            </div>
            <p className="mb-3 text-[11px] leading-relaxed text-blue-700 dark:text-blue-400">
              Unlock unlimited invoices, custom branding, and priority support.
            </p>
            <Button
              size="sm"
              className="w-full bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700"
              nativeButton={false} render={<Link href="/settings/billing" />}
            >
              Upgrade Now
            </Button>
          </div>
        ) : (
          <Link
            href="/settings/billing"
            className="flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 transition-colors hover:bg-blue-100 dark:border-blue-900 dark:bg-blue-950/30 dark:hover:bg-blue-950/50"
          >
            <Sparkles className="h-4 w-4 shrink-0 text-blue-600" />
            <span className="flex-1 text-xs font-semibold text-blue-800 dark:text-blue-300">
              {plan === 'enterprise' ? 'Enterprise' : 'Pro'}
            </span>
            <span className="rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
              Active
            </span>
          </Link>
        )}
      </div>

      {/* ── Footer: theme toggle + user button ── */}
      <div className="shrink-0 border-t border-sidebar-border px-3 py-3">
        <div className="flex items-center justify-between px-1">
          <UserButton
            appearance={{
              elements: {
                avatarBox: 'h-8 w-8',
                userButtonPopoverCard: 'shadow-lg border border-border',
              },
            }}
          />

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={toggleTheme}
                    aria-label="Toggle theme"
                    className="text-sidebar-foreground/70 hover:text-sidebar-foreground"
                  >
                    <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                    <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                  </Button>
                }
              />
              <TooltipContent side="right">Toggle theme</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    </aside>
  )
}

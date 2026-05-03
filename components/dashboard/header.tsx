'use client'

import React from 'react'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import Link from 'next/link'
import { Menu, Search, Bell, Sun, Moon } from 'lucide-react'
import { useTheme } from 'next-themes'
import { UserButton } from '@clerk/nextjs'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { MobileNav } from '@/components/dashboard/mobile-nav'

// ─── Route → display label mapping ────────────────────────────────────────────

const routeLabels: Record<string, string> = {
  dashboard: 'Dashboard',
  invoices: 'Invoices',
  new: 'Create New',
  recurring: 'Recurring',
  clients: 'Clients',
  products: 'Products',
  payments: 'Payments',
  reports: 'Reports',
  notifications: 'Notifications',
  settings: 'Settings',
  'api-keys': 'API Keys',
  billing: 'Billing',
  profile: 'Profile',
  team: 'Team',
}

function getPageTitle(pathname: string): string {
  const segments = pathname.split('/').filter(Boolean)
  // Last meaningful segment
  const last = segments[segments.length - 1]
  return routeLabels[last] ?? last?.replace(/-/g, ' ') ?? 'Dashboard'
}

interface BreadcrumbSegment {
  label: string
  href: string
  isCurrent: boolean
}

function getBreadcrumbs(pathname: string): BreadcrumbSegment[] {
  const segments = pathname.split('/').filter(Boolean)
  // Always start from /dashboard
  const crumbs: BreadcrumbSegment[] = []
  let accPath = ''

  segments.forEach((seg, i) => {
    accPath += `/${seg}`
    const label = routeLabels[seg] ?? seg.replace(/-/g, ' ')
    crumbs.push({
      label: label.charAt(0).toUpperCase() + label.slice(1),
      href: accPath,
      isCurrent: i === segments.length - 1,
    })
  })

  return crumbs
}

// ─────────────────────────────────────────────────────────────────────────────

interface DashboardHeaderProps {
  /** Unread notification count — shown as badge on bell icon */
  unreadCount?: number
}

export function DashboardHeader({ unreadCount = 0 }: DashboardHeaderProps) {
  const pathname = usePathname()
  const { theme, setTheme } = useTheme()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  const pageTitle = getPageTitle(pathname)
  const breadcrumbs = getBreadcrumbs(pathname)
  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark')

  return (
    <>
      <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-4 border-b border-border bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:px-6">
        {/* Mobile hamburger */}
        <Button
          variant="ghost"
          size="icon-sm"
          className="lg:hidden"
          onClick={() => setMobileNavOpen(true)}
          aria-label="Open navigation menu"
        >
          <Menu className="h-5 w-5" />
        </Button>

        {/* Page title + breadcrumbs */}
        <div className="flex flex-1 flex-col gap-0.5 overflow-hidden">
          <h1 className="truncate text-base font-semibold text-foreground leading-none">
            {pageTitle}
          </h1>

          {/* Show breadcrumbs only when deeper than top-level */}
          {breadcrumbs.length > 1 && (
            <Breadcrumb className="hidden sm:block">
              <BreadcrumbList>
                {breadcrumbs.map((crumb, i) => (
                  <React.Fragment key={crumb.href}>
                    <BreadcrumbItem>
                      {crumb.isCurrent ? (
                        <BreadcrumbPage className="text-xs">
                          {crumb.label}
                        </BreadcrumbPage>
                      ) : (
                        <BreadcrumbLink
                          render={
                            <Link
                              href={crumb.href}
                              className="text-xs hover:text-foreground"
                            />
                          }
                        >
                          {crumb.label}
                        </BreadcrumbLink>
                      )}
                    </BreadcrumbItem>
                    {!crumb.isCurrent && <BreadcrumbSeparator />}
                  </React.Fragment>
                ))}
              </BreadcrumbList>
            </Breadcrumb>
          )}
        </div>

        {/* Right-side actions */}
        <div className="flex items-center gap-1">
          <TooltipProvider>
            {/* Search */}
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Search (⌘K)"
                    onClick={() => {
                      document.dispatchEvent(
                        new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true })
                      )
                    }}
                  >
                    <Search className="h-4 w-4" />
                  </Button>
                }
              />
              <TooltipContent>Search (⌘K)</TooltipContent>
            </Tooltip>

            {/* Notifications */}
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
                    className="relative"
                    nativeButton={false}
                    render={<Link href="/notifications" />}
                  >
                    <Bell className="h-4 w-4" />
                    {unreadCount > 0 && (
                      <span
                        className={cn(
                          'absolute -right-0.5 -top-0.5 flex items-center justify-center rounded-full bg-blue-600 text-white',
                          unreadCount > 9
                            ? 'h-4 min-w-4 px-1 text-[9px]'
                            : 'h-4 w-4 text-[10px]'
                        )}
                        aria-hidden="true"
                      >
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    )}
                  </Button>
                }
              />
              <TooltipContent>Notifications</TooltipContent>
            </Tooltip>

            {/* Theme toggle */}
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={toggleTheme}
                    aria-label="Toggle theme"
                  >
                    <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                    <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                  </Button>
                }
              />
              <TooltipContent>Toggle theme</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* User button */}
          <div className="ml-1">
            <UserButton
              appearance={{
                elements: {
                  avatarBox: 'h-8 w-8',
                  userButtonPopoverCard: 'shadow-lg border border-border',
                },
              }}
            />
          </div>
        </div>
      </header>

      {/* Mobile slide-in navigation */}
      <MobileNav open={mobileNavOpen} onOpenChange={setMobileNavOpen} />
    </>
  )
}

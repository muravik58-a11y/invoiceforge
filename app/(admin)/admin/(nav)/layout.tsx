import Link from 'next/link'
import { LayoutDashboard, Settings, Sliders, FileText, LogOut } from 'lucide-react'
import { adminLogout } from '@/lib/actions/admin'

const navLinks = [
  { href: '/admin/overview', label: 'Overview', icon: LayoutDashboard },
  { href: '/admin/settings', label: 'App Settings', icon: Settings },
  { href: '/admin/plans', label: 'Plan Limits', icon: Sliders },
  { href: '/admin/legal', label: 'Legal Pages', icon: FileText },
]

export default function AdminNavLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      {/* ── Sidebar ── */}
      <aside className="fixed inset-y-0 left-0 z-40 flex w-56 flex-col border-r border-gray-800 bg-gray-900">
        {/* Logo */}
        <div className="flex h-14 shrink-0 items-center gap-2.5 border-b border-gray-800 px-4">
          <span className="flex h-7 w-7 items-center justify-center rounded bg-red-600 text-xs font-black text-white">
            A
          </span>
          <span className="text-sm font-semibold tracking-tight">Admin</span>
          <span className="rounded-full bg-red-900/60 px-1.5 py-0.5 text-[10px] font-medium text-red-300">
            INTERNAL
          </span>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-4">
          <ul className="space-y-0.5">
            {navLinks.map(({ href, label, icon: Icon }) => (
              <li key={href}>
                <Link
                  href={href}
                  className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-gray-400 transition-colors hover:bg-gray-800 hover:text-gray-100"
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* Sign out */}
        <div className="shrink-0 border-t border-gray-800 p-3">
          <form action={adminLogout}>
            <button
              type="submit"
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-gray-500 transition-colors hover:bg-gray-800 hover:text-gray-100"
            >
              <LogOut className="h-4 w-4 shrink-0" />
              Sign out
            </button>
          </form>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="ml-56 flex min-h-screen flex-1 flex-col">
        <main className="flex-1 p-8">{children}</main>
      </div>
    </div>
  )
}

export type {
  Organization,
  Client,
  Product,
  Invoice,
  InvoiceItem,
  VatBreakdown,
  Payment,
  RecurringInvoice,
  AuditLog,
  Notification,
  ApiKey,
} from '@prisma/client'

// ─────────────────────────────────────────────
// DASHBOARD STATS
// ─────────────────────────────────────────────

export interface DashboardStats {
  revenueThisMonth: number
  revenueLastMonth: number
  outstandingAmount: number
  overdueAmount: number
  totalInvoices: number
  paidInvoices: number
  overdueInvoices: number
  draftInvoices: number
  topClients: TopClient[]
  recentInvoices: RecentInvoice[]
}

export interface TopClient {
  id: string
  companyName: string
  totalRevenue: number
  invoiceCount: number
}

export interface RecentInvoice {
  id: string
  invoiceNumber: string
  clientName: string
  total: number
  status: string
  dueDate: Date
}

export interface MonthlyRevenue {
  month: string
  revenue: number
  paid: number
  outstanding: number
}

// ─────────────────────────────────────────────
// INVOICE FORM DATA
// ─────────────────────────────────────────────

export type InvoiceFormData = {
  clientId: string
  issueDate: Date
  dueDate: Date
  items: InvoiceItemFormData[]
  discountPercent?: number
  notes?: string
  terms?: string
  templateId?: string
  poNumber?: string
  reference?: string
}

export type InvoiceItemFormData = {
  productId?: string
  description: string
  quantity: number
  unitPrice: number
  vatRate: number
  vatType: string
  unit?: string
}

// ─────────────────────────────────────────────
// NAV / UI HELPERS
// ─────────────────────────────────────────────

export interface NavItem {
  label: string
  href: string
  icon: React.ElementType
  badge?: number
  children?: NavSubItem[]
}

export interface NavSubItem {
  label: string
  href: string
}

import { VatType, InvoiceStatus, PaymentMethod, SubscriptionPlan } from "@prisma/client";

// ─────────────────────────────────────────────
// VAT
// ─────────────────────────────────────────────

/** Default VAT percentage for each VatType. */
export const VAT_RATES: Record<VatType, number> = {
  STANDARD: 20,
  REDUCED: 5,
  ZERO: 0,
  EXEMPT: 0,
  REVERSE_CHARGE: 0,
};

/** Human-readable label for each VatType. */
export const VAT_TYPE_LABELS: Record<VatType, string> = {
  STANDARD: "Standard Rate (20%)",
  REDUCED: "Reduced Rate (5%)",
  ZERO: "Zero Rated (0%)",
  EXEMPT: "VAT Exempt",
  REVERSE_CHARGE: "Reverse Charge",
};

/** Ordered list of VAT types for select menus. */
export const VAT_TYPE_OPTIONS = (
  Object.keys(VAT_RATES) as VatType[]
).map((type) => ({
  value: type,
  label: VAT_TYPE_LABELS[type],
  rate: VAT_RATES[type],
}));

// ─────────────────────────────────────────────
// INVOICE STATUS
// ─────────────────────────────────────────────

export interface InvoiceStatusMeta {
  label: string;
  /** Tailwind background colour class */
  color: string;
  /** Tailwind text colour class */
  textColor: string;
  /** Tailwind border colour class */
  borderColor: string;
  /** Hex colour for PDF / email use */
  hex: string;
}

export const INVOICE_STATUSES: Record<InvoiceStatus, InvoiceStatusMeta> = {
  DRAFT: {
    label: "Draft",
    color: "bg-gray-100",
    textColor: "text-gray-700",
    borderColor: "border-gray-300",
    hex: "#6B7280",
  },
  SENT: {
    label: "Sent",
    color: "bg-blue-100",
    textColor: "text-blue-700",
    borderColor: "border-blue-300",
    hex: "#2563EB",
  },
  PAID: {
    label: "Paid",
    color: "bg-green-100",
    textColor: "text-green-700",
    borderColor: "border-green-300",
    hex: "#16A34A",
  },
  PARTIAL: {
    label: "Partially Paid",
    color: "bg-yellow-100",
    textColor: "text-yellow-700",
    borderColor: "border-yellow-300",
    hex: "#CA8A04",
  },
  OVERDUE: {
    label: "Overdue",
    color: "bg-red-100",
    textColor: "text-red-700",
    borderColor: "border-red-300",
    hex: "#DC2626",
  },
  CANCELLED: {
    label: "Cancelled",
    color: "bg-slate-100",
    textColor: "text-slate-500",
    borderColor: "border-slate-300",
    hex: "#94A3B8",
  },
};

/** Ordered list of invoice statuses for filters / selects. */
export const INVOICE_STATUS_OPTIONS = (
  Object.keys(INVOICE_STATUSES) as InvoiceStatus[]
).map((status) => ({
  value: status,
  ...INVOICE_STATUSES[status],
}));

// ─────────────────────────────────────────────
// PAYMENT METHODS
// ─────────────────────────────────────────────

export interface PaymentMethodMeta {
  label: string;
  icon: string; // Lucide icon name
}

export const PAYMENT_METHODS: Record<PaymentMethod, PaymentMethodMeta> = {
  BANK_TRANSFER: { label: "Bank Transfer",   icon: "Building2" },
  CARD:          { label: "Credit / Debit Card", icon: "CreditCard" },
  CASH:          { label: "Cash",            icon: "Banknote" },
  CHEQUE:        { label: "Cheque",          icon: "FileText" },
  STRIPE:        { label: "Stripe Online",   icon: "Zap" },
  OTHER:         { label: "Other",           icon: "MoreHorizontal" },
};

/** Ordered list of payment methods for select menus. */
export const PAYMENT_METHOD_OPTIONS = (
  Object.keys(PAYMENT_METHODS) as PaymentMethod[]
).map((method) => ({
  value: method,
  ...PAYMENT_METHODS[method],
}));

// ─────────────────────────────────────────────
// SUBSCRIPTION / PLAN LIMITS
// ─────────────────────────────────────────────

export interface PlanLimits {
  /** Max invoices per month. -1 = unlimited */
  invoices: number;
  /** Max clients. -1 = unlimited */
  clients: number;
  /** Max products / services. -1 = unlimited */
  products: number;
  /** Max team members (org seats). -1 = unlimited */
  members: number;
  /** API access allowed */
  apiAccess: boolean;
  /** White-labelled PDF templates */
  customTemplates: boolean;
  /** Recurring invoices */
  recurringInvoices: boolean;
}

export const PLAN_LIMITS: Record<SubscriptionPlan, PlanLimits> = {
  FREE: {
    invoices: 5,
    clients: 5,
    products: 10,
    members: 1,
    apiAccess: false,
    customTemplates: false,
    recurringInvoices: false,
  },
  PRO: {
    invoices: 100,
    clients: 50,
    products: 200,
    members: 5,
    apiAccess: true,
    customTemplates: true,
    recurringInvoices: true,
  },
  ENTERPRISE: {
    invoices: -1,
    clients: -1,
    products: -1,
    members: -1,
    apiAccess: true,
    customTemplates: true,
    recurringInvoices: true,
  },
};

export const PLAN_LABELS: Record<SubscriptionPlan, string> = {
  FREE: "Free",
  PRO: "Pro",
  ENTERPRISE: "Enterprise",
};

// ─────────────────────────────────────────────
// DEFAULT PAYMENT TERMS
// ─────────────────────────────────────────────

export const PAYMENT_TERMS_OPTIONS = [
  { value: 0,   label: "Due on receipt" },
  { value: 7,   label: "Net 7 – 7 days" },
  { value: 14,  label: "Net 14 – 14 days" },
  { value: 30,  label: "Net 30 – 30 days" },
  { value: 45,  label: "Net 45 – 45 days" },
  { value: 60,  label: "Net 60 – 60 days" },
  { value: 90,  label: "Net 90 – 90 days" },
];

// ─────────────────────────────────────────────
// CURRENCY
// ─────────────────────────────────────────────

export const SUPPORTED_CURRENCIES = [
  { value: "GBP", label: "GBP – British Pound Sterling (£)" },
  { value: "EUR", label: "EUR – Euro (€)" },
  { value: "USD", label: "USD – US Dollar ($)" },
  { value: "CAD", label: "CAD – Canadian Dollar (CA$)" },
  { value: "AUD", label: "AUD – Australian Dollar (A$)" },
];

export const DEFAULT_CURRENCY = "GBP";

// ─────────────────────────────────────────────
// APP
// ─────────────────────────────────────────────

export const APP_NAME = "InvoiceForge UK";
export const APP_DESCRIPTION =
  "Professional UK invoice management for small businesses & freelancers.";

/** Minimum invoice amount in GBP (to avoid Stripe minimum charge issues). */
export const MIN_INVOICE_AMOUNT_GBP = 0.5;

/** Maximum line items per invoice. */
export const MAX_LINE_ITEMS = 100;

/** HMRC-mandated minimum period to retain invoice records (years). */
export const HMRC_RECORD_RETENTION_YEARS = 6;

// ─────────────────────────────────────────────
// RECURRING INVOICE FREQUENCIES
// ─────────────────────────────────────────────

export const RECURRING_FREQUENCY_LABELS: Record<string, string> = {
  WEEKLY: "Weekly",
  MONTHLY: "Monthly",
  QUARTERLY: "Quarterly (every 3 months)",
  ANNUALLY: "Annually (yearly)",
};

export const RECURRING_FREQUENCY_OPTIONS = Object.entries(
  RECURRING_FREQUENCY_LABELS
).map(([value, label]) => ({ value, label }));

// ─────────────────────────────────────────────
// AUDIT ACTIONS
// ─────────────────────────────────────────────

export const AUDIT_ACTIONS = {
  // Invoices
  INVOICE_CREATED: "invoice.created",
  INVOICE_UPDATED: "invoice.updated",
  INVOICE_DELETED: "invoice.deleted",
  INVOICE_SENT: "invoice.sent",
  INVOICE_CANCELLED: "invoice.cancelled",
  INVOICE_MARKED_PAID: "invoice.marked_paid",
  INVOICE_PDF_GENERATED: "invoice.pdf_generated",

  // Clients
  CLIENT_CREATED: "client.created",
  CLIENT_UPDATED: "client.updated",
  CLIENT_DELETED: "client.deleted",

  // Products
  PRODUCT_CREATED: "product.created",
  PRODUCT_UPDATED: "product.updated",
  PRODUCT_DELETED: "product.deleted",

  // Payments
  PAYMENT_RECORDED: "payment.recorded",
  PAYMENT_DELETED: "payment.deleted",

  // Organisation
  ORG_UPDATED: "organisation.updated",
  ORG_SUBSCRIPTION_CHANGED: "organisation.subscription_changed",

  // API Keys
  API_KEY_CREATED: "apikey.created",
  API_KEY_REVOKED: "apikey.revoked",
} as const;

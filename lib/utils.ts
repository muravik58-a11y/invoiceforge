import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format a number as GBP currency.
 * @param amount - The amount in pounds (not pence)
 * @param options - Intl.NumberFormatOptions overrides
 */
export function formatCurrency(
  amount: number,
  options?: Intl.NumberFormatOptions,
): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    ...options,
  }).format(amount)
}

/**
 * Format a Date (or ISO string) as a UK-locale date string.
 * Default: "14 Apr 2026" (day-first, abbreviated month, full year)
 */
export function formatDate(
  date: Date | string,
  options?: Intl.DateTimeFormatOptions,
): string {
  const d = typeof date === "string" ? new Date(date) : date
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    ...options,
  }).format(d)
}

/**
 * Return the abbreviated month name for a given Date, e.g. "Apr".
 */
export function formatMonthShort(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", { month: "short" }).format(date)
}

/**
 * Calculate VAT breakdown for a given ex-VAT price and rate.
 * @param exVatPrice     - Price excluding VAT (in pounds)
 * @param vatRatePercent - VAT percentage, e.g. 20 for 20%
 */
export function calculateVAT(
  exVatPrice: number,
  vatRatePercent: number,
): { vatAmount: number; incVat: number } {
  const vatAmount = (exVatPrice * vatRatePercent) / 100
  return {
    vatAmount,
    incVat: exVatPrice + vatAmount,
  }
}

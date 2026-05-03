/**
 * Invoice PDF generator for InvoiceForge UK
 * Runs server-side only via @react-pdf/renderer
 * Supports 'modern' and 'classic' template styles
 */

import React from 'react'
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
  renderToBuffer,
} from '@react-pdf/renderer'
import type { Style } from '@react-pdf/types'

// ---------------------------------------------------------------------------
// UK Formatting helpers
// ---------------------------------------------------------------------------

function formatGBP(amount: number | string | { toString(): string }): string {
  const num = typeof amount === 'number' ? amount : parseFloat(amount.toString())
  return `£${num.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatUKDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()
  return `${dd}/${mm}/${yyyy}`
}

function toNum(v: { toString(): string } | number): number {
  return typeof v === 'number' ? v : parseFloat(v.toString())
}

// ---------------------------------------------------------------------------
// Colour palettes per template
// ---------------------------------------------------------------------------

interface Palette {
  primary: string
  primaryLight: string
  accent: string
  textDark: string
  textMid: string
  textLight: string
  border: string
  rowAlt: string
  white: string
}

const modernPalette: Palette = {
  primary: '#2563EB',
  primaryLight: '#EFF6FF',
  accent: '#1D4ED8',
  textDark: '#111827',
  textMid: '#374151',
  textLight: '#6B7280',
  border: '#E5E7EB',
  rowAlt: '#F9FAFB',
  white: '#FFFFFF',
}

const classicPalette: Palette = {
  primary: '#1C1C1C',
  primaryLight: '#F5F5F5',
  accent: '#333333',
  textDark: '#1C1C1C',
  textMid: '#333333',
  textLight: '#666666',
  border: '#CCCCCC',
  rowAlt: '#FAFAFA',
  white: '#FFFFFF',
}

function brandedPalette(brandColor: string): Palette {
  const colour = brandColor?.match(/^#[0-9A-Fa-f]{6}$/) ? brandColor : '#2563EB'
  return {
    primary: colour,
    primaryLight: '#F8F9FA',
    accent: colour,
    textDark: '#111827',
    textMid: '#374151',
    textLight: '#6B7280',
    border: '#E5E7EB',
    rowAlt: '#F9FAFB',
    white: '#FFFFFF',
  }
}

// ---------------------------------------------------------------------------
// StyleSheet factory
// ---------------------------------------------------------------------------

function makeStyles(palette: Palette) {
  return StyleSheet.create({
    page: {
      fontFamily: 'Helvetica',
      fontSize: 9,
      color: palette.textDark,
      paddingTop: 36,
      paddingBottom: 60,
      paddingHorizontal: 48,
      backgroundColor: palette.white,
    },

    // ── Header ───────────────────────────────────────────────────────────────
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 28,
      paddingBottom: 20,
      borderBottomWidth: 2,
      borderBottomColor: palette.primary,
    },
    headerLeft: {
      flexDirection: 'column',
      maxWidth: '55%',
    },
    headerRight: {
      flexDirection: 'column',
      alignItems: 'flex-end',
    },
    logo: {
      width: 90,
      height: 40,
      objectFit: 'contain',
      marginBottom: 6,
    },
    companyName: {
      fontSize: 13,
      fontFamily: 'Helvetica-Bold',
      color: palette.textDark,
      marginBottom: 3,
    },
    companyAddress: {
      fontSize: 8.5,
      color: palette.textLight,
      lineHeight: 1.5,
    },
    invoiceTitle: {
      fontSize: 26,
      fontFamily: 'Helvetica-Bold',
      color: palette.primary,
      letterSpacing: 1,
      marginBottom: 6,
    },
    invoiceNumber: {
      fontSize: 11,
      fontFamily: 'Helvetica-Bold',
      color: palette.textDark,
      marginBottom: 2,
    },
    invoiceMeta: {
      fontSize: 8.5,
      color: palette.textLight,
      marginTop: 2,
    },
    invoiceMetaValue: {
      color: palette.textMid,
      fontFamily: 'Helvetica-Bold',
    },

    // ── Status badge ─────────────────────────────────────────────────────────
    statusBadge: {
      marginTop: 6,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 4,
      alignSelf: 'flex-start',
    },
    statusText: {
      fontSize: 7.5,
      fontFamily: 'Helvetica-Bold',
      letterSpacing: 0.5,
    },

    // ── Addresses (Bill To / dates) ──────────────────────────────────────────
    addressRow: {
      flexDirection: 'row',
      marginBottom: 20,
      gap: 24,
    },
    addressBox: {
      flex: 1,
      padding: 12,
      backgroundColor: palette.primaryLight,
      borderRadius: 4,
      borderLeftWidth: 3,
      borderLeftColor: palette.primary,
    },
    addressBoxTitle: {
      fontSize: 7.5,
      fontFamily: 'Helvetica-Bold',
      color: palette.primary,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      marginBottom: 6,
    },
    addressClientName: {
      fontSize: 10,
      fontFamily: 'Helvetica-Bold',
      color: palette.textDark,
      marginBottom: 3,
    },
    addressLine: {
      fontSize: 8.5,
      color: palette.textMid,
      lineHeight: 1.5,
    },
    metaBox: {
      flex: 1,
      padding: 12,
      backgroundColor: palette.primaryLight,
      borderRadius: 4,
      borderLeftWidth: 3,
      borderLeftColor: palette.border,
    },
    metaRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 5,
    },
    metaLabel: {
      fontSize: 8,
      color: palette.textLight,
    },
    metaValue: {
      fontSize: 8.5,
      fontFamily: 'Helvetica-Bold',
      color: palette.textDark,
    },
    metaValueDue: {
      fontSize: 8.5,
      fontFamily: 'Helvetica-Bold',
      color: palette.primary,
    },

    // ── Items table ──────────────────────────────────────────────────────────
    tableContainer: {
      marginBottom: 16,
    },
    tableHeader: {
      flexDirection: 'row',
      backgroundColor: palette.primary,
      paddingVertical: 7,
      paddingHorizontal: 8,
      borderRadius: 3,
      marginBottom: 2,
    },
    tableHeaderText: {
      fontFamily: 'Helvetica-Bold',
      fontSize: 8,
      color: palette.white,
      letterSpacing: 0.3,
    },
    tableRow: {
      flexDirection: 'row',
      paddingVertical: 6,
      paddingHorizontal: 8,
      borderBottomWidth: 1,
      borderBottomColor: palette.border,
      alignItems: 'center',
    },
    tableRowAlt: {
      backgroundColor: palette.rowAlt,
    },
    tableCellDesc: {
      flex: 3.5,
      fontSize: 8.5,
      color: palette.textDark,
    },
    tableCellDescSub: {
      fontSize: 7.5,
      color: palette.textLight,
      marginTop: 2,
    },
    tableCellQty: {
      flex: 0.8,
      fontSize: 8.5,
      color: palette.textMid,
      textAlign: 'right',
    },
    tableCellPrice: {
      flex: 1.2,
      fontSize: 8.5,
      color: palette.textMid,
      textAlign: 'right',
    },
    tableCellVat: {
      flex: 1,
      fontSize: 8.5,
      color: palette.textMid,
      textAlign: 'right',
    },
    tableCellVatAmt: {
      flex: 1.2,
      fontSize: 8.5,
      color: palette.textMid,
      textAlign: 'right',
    },
    tableCellTotal: {
      flex: 1.3,
      fontSize: 8.5,
      fontFamily: 'Helvetica-Bold',
      color: palette.textDark,
      textAlign: 'right',
    },

    // ── Totals block ─────────────────────────────────────────────────────────
    totalsContainer: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      marginBottom: 20,
    },
    totalsTable: {
      width: '45%',
    },
    totalsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 4,
      paddingHorizontal: 10,
      borderBottomWidth: 1,
      borderBottomColor: palette.border,
    },
    totalsLabel: {
      fontSize: 8.5,
      color: palette.textLight,
    },
    totalsValue: {
      fontSize: 8.5,
      color: palette.textMid,
      fontFamily: 'Helvetica-Bold',
    },
    totalsDivider: {
      borderBottomWidth: 2,
      borderBottomColor: palette.primary,
    },
    totalsFinalRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 8,
      paddingHorizontal: 10,
      backgroundColor: palette.primary,
      borderRadius: 3,
      marginTop: 2,
    },
    totalsFinalLabel: {
      fontSize: 10,
      fontFamily: 'Helvetica-Bold',
      color: palette.white,
    },
    totalsFinalValue: {
      fontSize: 10,
      fontFamily: 'Helvetica-Bold',
      color: palette.white,
    },
    totalsDiscountRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 4,
      paddingHorizontal: 10,
    },
    totalsDiscountLabel: {
      fontSize: 8.5,
      color: '#DC2626',
    },
    totalsDiscountValue: {
      fontSize: 8.5,
      color: '#DC2626',
      fontFamily: 'Helvetica-Bold',
    },

    // ── VAT breakdown table ──────────────────────────────────────────────────
    vatBreakdownContainer: {
      marginBottom: 20,
    },
    vatBreakdownTitle: {
      fontSize: 8.5,
      fontFamily: 'Helvetica-Bold',
      color: palette.textMid,
      marginBottom: 4,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    vatBreakdownHeader: {
      flexDirection: 'row',
      backgroundColor: palette.border,
      paddingVertical: 4,
      paddingHorizontal: 8,
    },
    vatBreakdownHeaderText: {
      fontFamily: 'Helvetica-Bold',
      fontSize: 7.5,
      color: palette.textMid,
    },
    vatBreakdownRow: {
      flexDirection: 'row',
      paddingVertical: 4,
      paddingHorizontal: 8,
      borderBottomWidth: 1,
      borderBottomColor: palette.border,
    },
    vatCell1: { flex: 2, fontSize: 8 },
    vatCell2: { flex: 1.5, fontSize: 8, textAlign: 'right' },
    vatCell3: { flex: 1.5, fontSize: 8, textAlign: 'right' },

    // ── Payment details ──────────────────────────────────────────────────────
    paymentContainer: {
      marginBottom: 16,
      padding: 12,
      backgroundColor: palette.primaryLight,
      borderRadius: 4,
    },
    paymentTitle: {
      fontSize: 8.5,
      fontFamily: 'Helvetica-Bold',
      color: palette.primary,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
      marginBottom: 8,
    },
    paymentRow: {
      flexDirection: 'row',
      marginBottom: 3,
    },
    paymentLabel: {
      fontSize: 8,
      color: palette.textLight,
      width: 90,
    },
    paymentValue: {
      fontSize: 8.5,
      color: palette.textDark,
      fontFamily: 'Helvetica-Bold',
    },

    // ── Notes / Terms ────────────────────────────────────────────────────────
    sectionTitle: {
      fontSize: 8.5,
      fontFamily: 'Helvetica-Bold',
      color: palette.textMid,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 4,
    },
    notesBox: {
      padding: 10,
      backgroundColor: palette.rowAlt,
      borderRadius: 3,
      borderWidth: 1,
      borderColor: palette.border,
      marginBottom: 12,
    },
    notesText: {
      fontSize: 8.5,
      color: palette.textMid,
      lineHeight: 1.5,
    },

    // ── Late payment note ────────────────────────────────────────────────────
    latePaymentNote: {
      padding: 8,
      backgroundColor: '#FEF3C7',
      borderLeftWidth: 3,
      borderLeftColor: '#F59E0B',
      marginBottom: 12,
      borderRadius: 3,
    },
    latePaymentNoteText: {
      fontSize: 7.5,
      color: '#92400E',
    },

    // ── Footer ───────────────────────────────────────────────────────────────
    footer: {
      position: 'absolute',
      bottom: 24,
      left: 48,
      right: 48,
      borderTopWidth: 1,
      borderTopColor: palette.border,
      paddingTop: 8,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-end',
    },
    footerLeft: {
      flexDirection: 'column',
    },
    footerText: {
      fontSize: 7.5,
      color: palette.textLight,
      lineHeight: 1.5,
    },
    footerPageNum: {
      fontSize: 7.5,
      color: palette.textLight,
    },

    // ── Overdue / Paid watermark ─────────────────────────────────────────────
    watermark: {
      position: 'absolute',
      top: '40%',
      left: 0,
      right: 0,
      textAlign: 'center',
      fontSize: 72,
      fontFamily: 'Helvetica-Bold',
      opacity: 0.06,
      transform: 'rotate(-30deg)',
    },
  })
}

// ---------------------------------------------------------------------------
// Status badge helper
// ---------------------------------------------------------------------------

const STATUS_COLOURS: Record<string, { bg: string; color: string }> = {
  DRAFT: { bg: '#F3F4F6', color: '#6B7280' },
  SENT: { bg: '#EFF6FF', color: '#2563EB' },
  PAID: { bg: '#F0FDF4', color: '#16A34A' },
  PARTIAL: { bg: '#FEF3C7', color: '#D97706' },
  OVERDUE: { bg: '#FEF2F2', color: '#DC2626' },
  CANCELLED: { bg: '#F3F4F6', color: '#9CA3AF' },
}

const VAT_TYPE_LABELS: Record<string, string> = {
  STANDARD: 'Standard Rate (20%)',
  REDUCED: 'Reduced Rate (5%)',
  ZERO: 'Zero Rate (0%)',
  EXEMPT: 'Exempt',
  REVERSE_CHARGE: 'Reverse Charge',
}

// ---------------------------------------------------------------------------
// InvoiceDocument component
// ---------------------------------------------------------------------------

interface InvoiceDocumentProps {
  invoice: any
  organization: any
  template: 'modern' | 'classic' | 'branded'
}

function InvoiceDocument({ invoice, organization, template }: InvoiceDocumentProps) {
  const palette =
    template === 'classic'
      ? classicPalette
      : template === 'branded'
        ? brandedPalette(organization.brandColor ?? '#2563EB')
        : modernPalette
  const styles = makeStyles(palette)

  const subtotal = toNum(invoice.subtotal)
  const discountAmount = toNum(invoice.discountAmount ?? 0)
  const discountPercent = toNum(invoice.discountPercent ?? 0)
  const vatAmount = toNum(invoice.vatAmount)
  const total = toNum(invoice.total)
  const amountPaid = toNum(invoice.amountPaid ?? 0)
  const balanceDue = Math.max(0, total - amountPaid)

  const org = organization
  const client = invoice.client
  const status = invoice.status as string
  const statusColour = STATUS_COLOURS[status] ?? STATUS_COLOURS.DRAFT

  // Build company address lines
  const orgAddressLines: string[] = [
    org.addressLine1,
    org.addressLine2,
    [org.city, org.county, org.postcode].filter(Boolean).join(', '),
    org.country,
  ].filter(Boolean)

  const clientAddressLines: string[] = [
    client.addressLine1,
    client.addressLine2,
    [client.city, client.county, client.postcode].filter(Boolean).join(', '),
    client.country,
  ].filter(Boolean)

  const hasBankDetails = org.bankName || org.bankSortCode || org.bankAccountNumber || org.bankIban
  const hasVatBreakdown = invoice.vatBreakdowns && invoice.vatBreakdowns.length > 0

  return (
    <Document
      title={`Invoice ${invoice.invoiceNumber}`}
      author={org.companyName ?? org.name}
      subject={`Invoice ${invoice.invoiceNumber} for ${client.companyName}`}
      creator="InvoiceForge UK"
    >
      <Page size="A4" style={styles.page}>
        {/* Watermark for paid/overdue invoices */}
        {(status === 'PAID' || status === 'OVERDUE' || status === 'CANCELLED') && (
          <Text style={styles.watermark}>{status}</Text>
        )}

        {/* ── HEADER ─────────────────────────────────────────────────────── */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            {org.logo ? (
              <Image src={org.logo} style={styles.logo} />
            ) : null}
            <Text style={styles.companyName}>{org.companyName ?? org.name}</Text>
            {orgAddressLines.map((line, i) => (
              <Text key={i} style={styles.companyAddress}>{line}</Text>
            ))}
            {org.vatNumber && (
              <Text style={[styles.companyAddress, { marginTop: 4 }]}>
                VAT Reg No: {org.vatNumber}
              </Text>
            )}
            {org.companyNumber && (
              <Text style={styles.companyAddress}>
                Company No: {org.companyNumber}
              </Text>
            )}
          </View>

          <View style={styles.headerRight}>
            <Text style={styles.invoiceTitle}>INVOICE</Text>
            <Text style={styles.invoiceNumber}>{invoice.invoiceNumber}</Text>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: statusColour.bg },
              ]}
            >
              <Text style={[styles.statusText, { color: statusColour.color }]}>
                {status}
              </Text>
            </View>
            {invoice.poNumber && (
              <Text style={[styles.invoiceMeta, { marginTop: 6 }]}>
                PO Number: <Text style={styles.invoiceMetaValue}>{invoice.poNumber}</Text>
              </Text>
            )}
            {invoice.reference && (
              <Text style={styles.invoiceMeta}>
                Reference: <Text style={styles.invoiceMetaValue}>{invoice.reference}</Text>
              </Text>
            )}
          </View>
        </View>

        {/* ── BILL TO + INVOICE DATES ──────────────────────────────────────── */}
        <View style={styles.addressRow}>
          <View style={styles.addressBox}>
            <Text style={styles.addressBoxTitle}>Bill To</Text>
            <Text style={styles.addressClientName}>{client.companyName}</Text>
            {client.contactName && (
              <Text style={styles.addressLine}>{client.contactName}</Text>
            )}
            {clientAddressLines.map((line, i) => (
              <Text key={i} style={styles.addressLine}>{line}</Text>
            ))}
            {client.email && (
              <Text style={[styles.addressLine, { marginTop: 4 }]}>{client.email}</Text>
            )}
            {client.phone && (
              <Text style={styles.addressLine}>{client.phone}</Text>
            )}
            {client.vatNumber && (
              <Text style={[styles.addressLine, { marginTop: 4 }]}>
                VAT: {client.vatNumber}
              </Text>
            )}
          </View>

          <View style={styles.metaBox}>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Issue Date</Text>
              <Text style={styles.metaValue}>{formatUKDate(invoice.issueDate)}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Due Date</Text>
              <Text style={styles.metaValueDue}>{formatUKDate(invoice.dueDate)}</Text>
            </View>
            {invoice.sentAt && (
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Sent</Text>
                <Text style={styles.metaValue}>{formatUKDate(invoice.sentAt)}</Text>
              </View>
            )}
            <View style={[styles.metaRow, { marginTop: 8, borderTopWidth: 1, borderTopColor: palette.border, paddingTop: 6 }]}>
              <Text style={styles.metaLabel}>Total Due</Text>
              <Text style={[styles.metaValue, { fontSize: 11, color: palette.primary }]}>
                {formatGBP(total)}
              </Text>
            </View>
            {amountPaid > 0 && (
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Amount Paid</Text>
                <Text style={[styles.metaValue, { color: '#16A34A' }]}>{formatGBP(amountPaid)}</Text>
              </View>
            )}
            {amountPaid > 0 && balanceDue > 0 && (
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Balance Due</Text>
                <Text style={[styles.metaValue, { color: '#DC2626' }]}>{formatGBP(balanceDue)}</Text>
              </View>
            )}
          </View>
        </View>

        {/* ── ITEMS TABLE ─────────────────────────────────────────────────── */}
        <View style={styles.tableContainer}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderText, { flex: 3.5 }]}>Description</Text>
            <Text style={[styles.tableHeaderText, { flex: 0.8, textAlign: 'right' }]}>Qty</Text>
            <Text style={[styles.tableHeaderText, { flex: 1.2, textAlign: 'right' }]}>Unit Price</Text>
            <Text style={[styles.tableHeaderText, { flex: 1, textAlign: 'right' }]}>VAT %</Text>
            <Text style={[styles.tableHeaderText, { flex: 1.2, textAlign: 'right' }]}>VAT Amt</Text>
            <Text style={[styles.tableHeaderText, { flex: 1.3, textAlign: 'right' }]}>Total (ex VAT)</Text>
          </View>

          {(invoice.items ?? []).map((item: any, idx: number) => {
            const lineTotalExVat = toNum(item.lineTotalExVat)
            const vatAmt = toNum(item.vatAmount)
            const qty = toNum(item.quantity)
            const unitPrice = toNum(item.unitPrice)
            const vatRate = toNum(item.vatRate)
            const isAlt = idx % 2 !== 0

            return (
              <View
                key={item.id ?? idx}
                style={[styles.tableRow, isAlt ? styles.tableRowAlt : {}]}
              >
                <View style={{ flex: 3.5 }}>
                  <Text style={styles.tableCellDesc}>{item.description}</Text>
                  {item.unit && item.unit !== 'unit' && (
                    <Text style={styles.tableCellDescSub}>Unit: {item.unit}</Text>
                  )}
                </View>
                <Text style={styles.tableCellQty}>
                  {qty % 1 === 0 ? qty.toFixed(0) : qty.toFixed(2)}
                </Text>
                <Text style={styles.tableCellPrice}>{formatGBP(unitPrice)}</Text>
                <Text style={styles.tableCellVat}>{vatRate}%</Text>
                <Text style={styles.tableCellVatAmt}>{formatGBP(vatAmt)}</Text>
                <Text style={styles.tableCellTotal}>{formatGBP(lineTotalExVat)}</Text>
              </View>
            )
          })}
        </View>

        {/* ── TOTALS ──────────────────────────────────────────────────────── */}
        <View style={styles.totalsContainer}>
          <View style={styles.totalsTable}>
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>Subtotal (ex VAT)</Text>
              <Text style={styles.totalsValue}>{formatGBP(subtotal)}</Text>
            </View>

            {discountAmount > 0 && (
              <View style={styles.totalsDiscountRow}>
                <Text style={styles.totalsDiscountLabel}>
                  Discount ({discountPercent}%)
                </Text>
                <Text style={styles.totalsDiscountValue}>–{formatGBP(discountAmount)}</Text>
              </View>
            )}

            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>VAT</Text>
              <Text style={styles.totalsValue}>{formatGBP(vatAmount)}</Text>
            </View>

            <View style={styles.totalsFinalRow}>
              <Text style={styles.totalsFinalLabel}>TOTAL (inc VAT)</Text>
              <Text style={styles.totalsFinalValue}>{formatGBP(total)}</Text>
            </View>

            {amountPaid > 0 && (
              <View style={[styles.totalsRow, { marginTop: 4 }]}>
                <Text style={[styles.totalsLabel, { color: '#16A34A' }]}>Amount Paid</Text>
                <Text style={[styles.totalsValue, { color: '#16A34A' }]}>{formatGBP(amountPaid)}</Text>
              </View>
            )}

            {balanceDue > 0 && amountPaid > 0 && (
              <View style={[styles.totalsRow, { borderTopWidth: 2, borderTopColor: '#DC2626' }]}>
                <Text style={[styles.totalsLabel, { color: '#DC2626', fontFamily: 'Helvetica-Bold' }]}>
                  Balance Due
                </Text>
                <Text style={[styles.totalsValue, { color: '#DC2626' }]}>{formatGBP(balanceDue)}</Text>
              </View>
            )}
          </View>
        </View>

        {/* ── VAT BREAKDOWN TABLE ──────────────────────────────────────────── */}
        {hasVatBreakdown && vatAmount > 0 && (
          <View style={styles.vatBreakdownContainer}>
            <Text style={styles.vatBreakdownTitle}>VAT Summary</Text>
            <View style={styles.vatBreakdownHeader}>
              <Text style={[styles.vatBreakdownHeaderText, { flex: 2 }]}>VAT Rate</Text>
              <Text style={[styles.vatBreakdownHeaderText, { flex: 1.5, textAlign: 'right' }]}>Net Amount</Text>
              <Text style={[styles.vatBreakdownHeaderText, { flex: 1.5, textAlign: 'right' }]}>VAT Amount</Text>
            </View>
            {(invoice.vatBreakdowns ?? []).map((vb: any, i: number) => {
              const vatType = vb.vatType as string
              const vatRate = toNum(vb.vatRate)
              const label = VAT_TYPE_LABELS[vatType] ?? `${vatType} (${vatRate}%)`
              return (
                <View key={i} style={styles.vatBreakdownRow}>
                  <Text style={[styles.vatCell1, { color: palette.textMid }]}>{label}</Text>
                  <Text style={[styles.vatCell2, { color: palette.textMid }]}>
                    {formatGBP(toNum(vb.netAmount))}
                  </Text>
                  <Text style={[styles.vatCell3, { fontFamily: 'Helvetica-Bold', color: palette.textDark }]}>
                    {formatGBP(toNum(vb.vatAmount))}
                  </Text>
                </View>
              )
            })}
          </View>
        )}

        {/* ── BANK / PAYMENT DETAILS ───────────────────────────────────────── */}
        {hasBankDetails && (
          <View style={styles.paymentContainer}>
            <Text style={styles.paymentTitle}>Payment Details</Text>
            {org.bankName && (
              <View style={styles.paymentRow}>
                <Text style={styles.paymentLabel}>Bank</Text>
                <Text style={styles.paymentValue}>{org.bankName}</Text>
              </View>
            )}
            {org.bankSortCode && (
              <View style={styles.paymentRow}>
                <Text style={styles.paymentLabel}>Sort Code</Text>
                <Text style={styles.paymentValue}>{org.bankSortCode}</Text>
              </View>
            )}
            {org.bankAccountNumber && (
              <View style={styles.paymentRow}>
                <Text style={styles.paymentLabel}>Account Number</Text>
                <Text style={styles.paymentValue}>{org.bankAccountNumber}</Text>
              </View>
            )}
            {org.bankIban && (
              <View style={styles.paymentRow}>
                <Text style={styles.paymentLabel}>IBAN</Text>
                <Text style={styles.paymentValue}>{org.bankIban}</Text>
              </View>
            )}
            {org.bankSwift && (
              <View style={styles.paymentRow}>
                <Text style={styles.paymentLabel}>BIC/SWIFT</Text>
                <Text style={styles.paymentValue}>{org.bankSwift}</Text>
              </View>
            )}
            {org.paymentReference && (
              <View style={styles.paymentRow}>
                <Text style={styles.paymentLabel}>Payment Reference</Text>
                <Text style={styles.paymentValue}>{org.paymentReference} / {invoice.invoiceNumber}</Text>
              </View>
            )}
            {invoice.stripePaymentLinkUrl && (
              <View style={[styles.paymentRow, { marginTop: 6 }]}>
                <Text style={styles.paymentLabel}>Pay Online</Text>
                <Text style={[styles.paymentValue, { color: palette.primary }]}>
                  {invoice.stripePaymentLinkUrl}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* ── NOTES ───────────────────────────────────────────────────────── */}
        {invoice.notes && (
          <View style={{ marginBottom: 12 }}>
            <Text style={styles.sectionTitle}>Notes</Text>
            <View style={styles.notesBox}>
              <Text style={styles.notesText}>{invoice.notes}</Text>
            </View>
          </View>
        )}

        {/* ── TERMS ───────────────────────────────────────────────────────── */}
        {invoice.terms && (
          <View style={{ marginBottom: 12 }}>
            <Text style={styles.sectionTitle}>Terms & Conditions</Text>
            <View style={styles.notesBox}>
              <Text style={styles.notesText}>{invoice.terms}</Text>
            </View>
          </View>
        )}

        {/* ── INVOICE FOOTER TEXT ──────────────────────────────────────────── */}
        {org.invoiceFooter && (
          <View style={{ marginBottom: 12 }}>
            <Text style={styles.notesText}>{org.invoiceFooter}</Text>
          </View>
        )}

        {/* ── LATE PAYMENT NOTE ────────────────────────────────────────────── */}
        {org.latePaymentNote && (
          <View style={styles.latePaymentNote}>
            <Text style={styles.latePaymentNoteText}>{org.latePaymentNote}</Text>
          </View>
        )}

        {/* ── FOOTER ──────────────────────────────────────────────────────── */}
        <View style={styles.footer} fixed>
          <View style={styles.footerLeft}>
            <Text style={styles.footerText}>
              {[
                org.companyName ?? org.name,
                org.companyNumber ? `Company No: ${org.companyNumber}` : null,
                org.vatNumber ? `VAT Reg: ${org.vatNumber}` : null,
              ]
                .filter(Boolean)
                .join('  |  ')}
            </Text>
            {orgAddressLines.length > 0 && (
              <Text style={styles.footerText}>
                {orgAddressLines.join(', ')}
              </Text>
            )}
          </View>
          <Text
            style={styles.footerPageNum}
            render={({ pageNumber, totalPages }) =>
              `Page ${pageNumber} of ${totalPages}`
            }
          />
        </View>
      </Page>
    </Document>
  )
}

// ---------------------------------------------------------------------------
// generateInvoicePdf  – exported public API
// ---------------------------------------------------------------------------

/**
 * Render an invoice to a PDF buffer.
 *
 * @param invoice      - Invoice with all relations (items, vatBreakdowns, client, payments)
 * @param organization - Organisation record
 * @param template     - 'modern' (default), 'classic', or 'branded' (uses org.brandColor)
 */
export async function generateInvoicePdf(
  invoice: any,
  organization: any,
  template: 'modern' | 'classic' | 'branded' = 'modern',
): Promise<Buffer> {
  // Prefer the organisation's stored brandColor for modern template
  const templateChoice =
    template === 'classic' ? 'classic' : 'modern'

  const doc = (
    <InvoiceDocument
      invoice={invoice}
      organization={organization}
      template={templateChoice}
    />
  )

  try {
    const buffer = await renderToBuffer(doc)
    return Buffer.from(buffer)
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('[generateInvoicePdf]', msg)
    throw new Error(`PDF generation failed: ${msg}`)
  }
}

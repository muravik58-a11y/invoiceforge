import { Badge } from '@/components/ui/badge'
import { INVOICE_STATUSES } from '@/lib/constants'
import { cn } from '@/lib/utils'
import type { InvoiceStatus } from '@prisma/client'

interface StatusBadgeProps {
  status: InvoiceStatus
  className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const meta = INVOICE_STATUSES[status]

  return (
    <Badge
      variant="outline"
      className={cn(
        'font-medium border',
        meta.color,
        meta.textColor,
        meta.borderColor,
        className,
      )}
    >
      {meta.label}
    </Badge>
  )
}

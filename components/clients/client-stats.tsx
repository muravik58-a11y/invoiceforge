import { DollarSign, TrendingUp, Clock, CalendarDays } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency, formatDate } from '@/lib/utils'

interface ClientStatsProps {
  totalInvoiced: number
  totalPaid: number
  outstanding: number
  lastInvoiceDate: Date | null
}

export function ClientStats({
  totalInvoiced,
  totalPaid,
  outstanding,
  lastInvoiceDate,
}: ClientStatsProps) {
  const stats = [
    {
      title: 'Total Invoiced',
      value: formatCurrency(totalInvoiced),
      icon: TrendingUp,
      description: 'Lifetime invoiced amount',
      className: 'text-blue-600',
    },
    {
      title: 'Total Paid',
      value: formatCurrency(totalPaid),
      icon: DollarSign,
      description: 'Amount received',
      className: 'text-green-600',
    },
    {
      title: 'Outstanding',
      value: formatCurrency(outstanding),
      icon: Clock,
      description: 'Unpaid balance',
      className: outstanding > 0 ? 'text-amber-600' : 'text-green-600',
    },
    {
      title: 'Last Invoice',
      value: lastInvoiceDate ? formatDate(lastInvoiceDate) : 'No invoices',
      icon: CalendarDays,
      description: 'Most recent invoice date',
      className: 'text-purple-600',
    },
  ]

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <Card key={stat.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {stat.title}
            </CardTitle>
            <stat.icon className={`size-4 ${stat.className}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stat.value}</div>
            <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

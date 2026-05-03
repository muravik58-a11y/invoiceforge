import { type ReactNode } from 'react'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

type Variant = 'default' | 'success' | 'warning' | 'danger'

interface StatsCardProps {
  /** Card heading label */
  title: string
  /** Primary display value (already formatted) */
  value: string
  /** Secondary line below the value */
  description?: ReactNode
  /**
   * Percentage change vs previous period.
   * Positive = up, negative = down, 0 / undefined = neutral
   */
  trend?: number
  /** Label suffix next to the trend, e.g. "vs last month" */
  trendLabel?: string
  /** Lucide icon component */
  icon?: ReactNode
  /** Visual variant — affects icon & accent colours */
  variant?: Variant
  className?: string
}

// ─────────────────────────────────────────────
// Variant style maps
// ─────────────────────────────────────────────

const iconContainerVariants: Record<Variant, string> = {
  default: 'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400',
  success: 'bg-green-50 text-green-600 dark:bg-green-950/40 dark:text-green-400',
  warning: 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400',
  danger:  'bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400',
}

// ─────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────

export function StatsCard({
  title,
  value,
  description,
  trend,
  trendLabel = 'vs last month',
  icon,
  variant = 'default',
  className,
}: StatsCardProps) {
  const hasTrend = trend !== undefined && trend !== null
  const isUp    = hasTrend && trend > 0
  const isDown  = hasTrend && trend < 0
  const isFlat  = hasTrend && trend === 0

  const trendColor = isUp
    ? 'text-green-600 dark:text-green-400'
    : isDown
    ? 'text-red-600 dark:text-red-400'
    : 'text-muted-foreground'

  const TrendIcon = isUp ? TrendingUp : isDown ? TrendingDown : Minus

  return (
    <Card className={cn('relative overflow-hidden', className)}>
      {/* Subtle top-border accent */}
      <div
        aria-hidden
        className={cn(
          'absolute inset-x-0 top-0 h-0.5',
          variant === 'success' && 'bg-green-500',
          variant === 'warning' && 'bg-amber-500',
          variant === 'danger'  && 'bg-red-500',
          variant === 'default' && 'bg-blue-500',
        )}
      />

      <CardHeader className="flex flex-row items-start justify-between pb-2 pt-5">
        <CardTitle className="text-sm font-medium text-muted-foreground tracking-wide uppercase">
          {title}
        </CardTitle>

        {icon && (
          <span
            className={cn(
              'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
              iconContainerVariants[variant],
            )}
          >
            {icon}
          </span>
        )}
      </CardHeader>

      <CardContent className="pt-0 pb-5">
        {/* Primary value */}
        <p className="text-3xl font-extrabold tracking-tight leading-none text-foreground">
          {value}
        </p>

        {/* Description */}
        {description && (
          <p className="mt-1.5 text-sm text-muted-foreground">{description}</p>
        )}

        {/* Trend indicator */}
        {hasTrend && (
          <div className={cn('mt-3 flex items-center gap-1.5 text-xs font-medium', trendColor)}>
            <TrendIcon className="h-3.5 w-3.5 shrink-0" aria-hidden />
            <span>
              {isFlat ? 'No change' : `${isUp ? '+' : ''}${trend.toFixed(1)}%`}
              {trendLabel && (
                <span className="ml-1 font-normal text-muted-foreground">
                  {trendLabel}
                </span>
              )}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

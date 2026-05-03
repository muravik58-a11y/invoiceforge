import { Prisma } from '@prisma/client'

/**
 * Recursively convert Prisma Decimal → number and Date → ISO string
 * so the result is safe to pass from Server Components to Client Components.
 */
export function serialize<T>(value: T): T {
  if (value === null || value === undefined) return value
  if (value instanceof Prisma.Decimal) return parseFloat(value.toString()) as unknown as T
  if (value instanceof Date) return value.toISOString() as unknown as T
  if (Array.isArray(value)) return value.map(serialize) as unknown as T
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value as object)) {
      out[k] = serialize(v)
    }
    return out as T
  }
  return value
}

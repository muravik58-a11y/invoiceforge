import { NextResponse } from 'next/server'
import { getPlanPrices } from '@/lib/actions/admin'

export const dynamic = 'force-dynamic'

export async function GET() {
  const prices = await getPlanPrices()
  return NextResponse.json(prices)
}
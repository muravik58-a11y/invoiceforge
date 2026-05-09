import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const isAdminRoute = createRouteMatcher(['/admin(.*)'])
const isAdminLoginRoute = createRouteMatcher(['/admin/login'])

const isPublicAppRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/webhooks(.*)',
  '/api/stripe/webhook',
  '/api/prices',
  '/(terms|privacy|cookies|gdpr)',
])

const isLandingPage = createRouteMatcher(['/'])

// ── Edge-compatible HMAC-SHA256 verification ──────────────────────────────────

function hexToUint8(hex: string): Uint8Array {
  const arr = new Uint8Array(hex.length / 2)
  for (let i = 0; i < hex.length; i += 2) {
    arr[i / 2] = parseInt(hex.substring(i, i + 2), 16)
  }
  return arr
}

async function verifyAdminToken(token: string): Promise<boolean> {
  const secret = process.env.ADMIN_SESSION_SECRET ?? 'dev-secret-change-in-production'
  const lastDot = token.lastIndexOf('.')
  if (lastDot < 1) return false

  const payload = token.slice(0, lastDot)
  const mac = token.slice(lastDot + 1)

  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify'],
  )

  let valid: boolean
  try {
    valid = await crypto.subtle.verify(
      'HMAC',
      key,
      hexToUint8(mac).buffer as ArrayBuffer,
      enc.encode(payload).buffer as ArrayBuffer,
    )
  } catch {
    return false
  }
  if (!valid) return false

  const parts = payload.split(':')
  const issuedAt = Number(parts[parts.length - 1])
  return !isNaN(issuedAt) && Date.now() - issuedAt <= 24 * 60 * 60 * 1000
}

// ── Proxy (Next.js 16 convention, replaces middleware.ts) ────────────────────

export default clerkMiddleware(async (auth, req: NextRequest) => {
  // Admin routes use their own session — completely independent of Clerk
  if (isAdminRoute(req)) {
    if (isAdminLoginRoute(req)) return NextResponse.next()

    const token = req.cookies.get('admin_session')?.value
    if (!token || !(await verifyAdminToken(token))) {
      return NextResponse.redirect(new URL('/admin/login', req.url))
    }
    return NextResponse.next()
  }

  // Regular app routes: Clerk auth
  if (!isPublicAppRoute(req)) {
    await auth.protect()
  }

  // Logged-in users should never see the landing page — redirect to dashboard
  if (isLandingPage(req)) {
    const { userId } = await auth()
    if (userId) {
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }
  }
})

export const config = {
  matcher: ['/((?!.+\\.[\\w]+$|_next).*)', '/', '/(api|trpc)(.*)'],
}

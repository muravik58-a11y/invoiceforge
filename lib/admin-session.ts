import { createHmac, timingSafeEqual } from 'crypto'
import { cookies } from 'next/headers'

const COOKIE = 'admin_session'
const TTL_MS = 24 * 60 * 60 * 1000

function secret() {
  return process.env.ADMIN_SESSION_SECRET ?? 'dev-secret-change-in-production'
}

function sign(payload: string): string {
  const mac = createHmac('sha256', secret()).update(payload).digest('hex')
  return `${payload}.${mac}`
}

function verify(token: string): string | null {
  const lastDot = token.lastIndexOf('.')
  if (lastDot < 1) return null
  const payload = token.slice(0, lastDot)
  const mac = token.slice(lastDot + 1)
  const expected = createHmac('sha256', secret()).update(payload).digest('hex')
  try {
    if (!timingSafeEqual(Buffer.from(mac, 'hex'), Buffer.from(expected, 'hex'))) return null
  } catch {
    return null
  }
  const parts = payload.split(':')
  const issuedAt = Number(parts[parts.length - 1])
  if (isNaN(issuedAt) || Date.now() - issuedAt > TTL_MS) return null
  return payload
}

export function makeSessionToken(username: string): string {
  return sign(`${username}:${Date.now()}`)
}

export async function getAdminSession(): Promise<{ username: string } | null> {
  const jar = await cookies()
  const raw = jar.get(COOKIE)?.value
  if (!raw) return null
  const payload = verify(raw)
  if (!payload) return null
  const username = payload.split(':')[0]
  return { username }
}

export async function setAdminSession(token: string): Promise<void> {
  const jar = await cookies()
  jar.set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/admin',
    maxAge: 60 * 60 * 24,
  })
}

export async function clearAdminSession(): Promise<void> {
  const jar = await cookies()
  jar.delete(COOKIE)
}

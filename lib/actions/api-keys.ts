'use server'

import crypto from 'crypto'
import { revalidatePath } from 'next/cache'
import prisma from '@/lib/prisma'
import type { ApiKey } from '@prisma/client'

// ---------------------------------------------------------------------------
// getApiKeys
// ---------------------------------------------------------------------------

/**
 * Fetch all API keys for an organisation. The raw key is never returned
 * after creation — only the prefix and metadata are shown.
 *
 * @param orgId - The InvoiceForge organisation ID
 */
export async function getApiKeys(orgId: string): Promise<ApiKey[]> {
  if (!orgId) throw new Error('orgId is required')

  try {
    const keys = await prisma.apiKey.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: 'desc' },
    })

    return keys
  } catch (error) {
    console.error('[getApiKeys]', error)
    throw new Error('Failed to fetch API keys')
  }
}

// ---------------------------------------------------------------------------
// createApiKey
// ---------------------------------------------------------------------------

/**
 * Generate a new API key for an organisation.
 *
 * Key format: "ifuk_" + 64 hex characters (32 random bytes)
 * Only the SHA-256 hash is stored. The full key is returned ONCE.
 *
 * @param orgId     - The InvoiceForge organisation ID
 * @param name      - Human-readable label for the key
 * @param expiresAt - Optional expiry date
 * @returns         - The created ApiKey record plus the raw (full) key string
 */
export async function createApiKey(
  orgId: string,
  name: string,
  expiresAt?: Date,
): Promise<{ apiKey: ApiKey; rawKey: string }> {
  if (!orgId) throw new Error('orgId is required')
  if (!name || name.trim().length === 0) throw new Error('name is required')

  // Generate key: "ifuk_" + 32 random bytes (64 hex chars)
  const randomBytes = crypto.randomBytes(32).toString('hex')
  const rawKey = `ifuk_${randomBytes}`

  // Store only the SHA-256 hash
  const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex')

  // Store the first 12 characters of the raw key as the prefix (for display)
  const keyPrefix = rawKey.substring(0, 12)

  try {
    const apiKey = await prisma.apiKey.create({
      data: {
        organizationId: orgId,
        name: name.trim(),
        keyHash,
        keyPrefix,
        isActive: true,
        expiresAt: expiresAt ?? null,
      },
    })

    revalidatePath('/api-keys')
    return { apiKey, rawKey }
  } catch (error) {
    console.error('[createApiKey]', error)
    throw new Error('Failed to create API key')
  }
}

// ---------------------------------------------------------------------------
// revokeApiKey
// ---------------------------------------------------------------------------

/**
 * Revoke (deactivate) an API key. The key record is retained for audit
 * purposes but can no longer be used for authentication.
 *
 * @param orgId - The InvoiceForge organisation ID (for ownership check)
 * @param keyId - The ApiKey Prisma ID
 */
export async function revokeApiKey(orgId: string, keyId: string): Promise<void> {
  if (!orgId) throw new Error('orgId is required')
  if (!keyId) throw new Error('keyId is required')

  try {
    const existing = await prisma.apiKey.findFirst({
      where: { id: keyId, organizationId: orgId },
      select: { id: true },
    })

    if (!existing) {
      throw new Error('API key not found or does not belong to this organisation')
    }

    await prisma.apiKey.update({
      where: { id: keyId },
      data: { isActive: false },
    })

    revalidatePath('/api-keys')
  } catch (error) {
    console.error('[revokeApiKey]', error)
    throw new Error('Failed to revoke API key')
  }
}

// ---------------------------------------------------------------------------
// verifyApiKey (utility — not exported as server action, for middleware use)
// ---------------------------------------------------------------------------

/**
 * Verify an incoming raw API key and return the associated organisation ID
 * if valid and active. Updates lastUsedAt on success.
 *
 * @param rawKey - The raw "ifuk_..." key string from the Authorization header
 * @returns      - The organisationId, or null if invalid/expired/revoked
 */
export async function verifyApiKey(rawKey: string): Promise<string | null> {
  if (!rawKey) return null

  const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex')

  try {
    const apiKey = await prisma.apiKey.findUnique({
      where: { keyHash },
      select: {
        id: true,
        organizationId: true,
        isActive: true,
        expiresAt: true,
      },
    })

    if (!apiKey || !apiKey.isActive) return null
    if (apiKey.expiresAt && apiKey.expiresAt < new Date()) return null

    // Update last used timestamp (fire-and-forget)
    prisma.apiKey
      .update({ where: { id: apiKey.id }, data: { lastUsedAt: new Date() } })
      .catch(() => {})

    return apiKey.organizationId
  } catch (error) {
    console.error('[verifyApiKey]', error)
    return null
  }
}

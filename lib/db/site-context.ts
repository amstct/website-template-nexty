import 'server-only'

import { db } from '@/lib/db'
import { sites } from '@/lib/db/schema'
import { withTimeout } from '@/lib/timeout'
import { eq } from 'drizzle-orm'

const SITE_ID_LOOKUP_TIMEOUT_MS = 3000
const SITE_ID_FAILURE_CACHE_MS = 30_000

let cachedSiteId: string | null = null
let siteIdPromise: Promise<string | null> | null = null
let siteIdFailureUntil = 0

/**
 * Resolves NEXT_PUBLIC_SITE_NAME to a site_id UUID.
 * Returns null when the database is unavailable instead of blocking callers.
 */
export async function tryGetSiteId(): Promise<string | null> {
  if (cachedSiteId) return cachedSiteId

  if (Date.now() < siteIdFailureUntil) {
    return null
  }

  if (!siteIdPromise) {
    siteIdPromise = resolveSiteId().finally(() => {
      siteIdPromise = null
    })
  }

  return siteIdPromise
}

/**
 * Same as tryGetSiteId but throws when site_id cannot be resolved.
 * Use in admin/auth flows that require a valid site scope.
 */
export async function getSiteId(): Promise<string> {
  const siteId = await tryGetSiteId()
  if (!siteId) {
    throw new Error('Unable to resolve site ID')
  }
  return siteId
}

async function resolveSiteId(): Promise<string | null> {
  const siteName = process.env.NEXT_PUBLIC_SITE_NAME
  if (!siteName) {
    console.error(
      'NEXT_PUBLIC_SITE_NAME environment variable is not set. Required for multi-site filtering.'
    )
    markSiteLookupFailed()
    return null
  }

  try {
    const results = await withTimeout(
      db
        .select({ id: sites.id })
        .from(sites)
        .where(eq(sites.name, siteName))
        .limit(1),
      SITE_ID_LOOKUP_TIMEOUT_MS,
      'Site ID lookup timed out'
    )

    if (!results[0]) {
      console.error(
        `No site found with name "${siteName}". Create it in the sites table first.`
      )
      markSiteLookupFailed()
      return null
    }

    cachedSiteId = results[0].id
    return cachedSiteId
  } catch (error) {
    console.error('Failed to resolve site ID:', error)
    markSiteLookupFailed()
    return null
  }
}

function markSiteLookupFailed() {
  siteIdFailureUntil = Date.now() + SITE_ID_FAILURE_CACHE_MS
}

/**
 * Clears the cached site_id. Useful for testing or after seeding.
 */
export function clearSiteCache(): void {
  cachedSiteId = null
  siteIdPromise = null
  siteIdFailureUntil = 0
}

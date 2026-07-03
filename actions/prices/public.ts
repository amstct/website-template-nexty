'use server';

import { actionResponse, ActionResult } from '@/lib/action-response';
import { db, isDatabaseEnabled } from '@/lib/db';
import { pricingPlans as pricingPlansSchema } from '@/lib/db/schema';
import { tryGetSiteId } from '@/lib/db/site-context';
import { withTimeout } from '@/lib/timeout';
import { and, asc, eq } from 'drizzle-orm';
import 'server-only';

const PRICING_QUERY_TIMEOUT_MS = 3000;

type PricingPlan = typeof pricingPlansSchema.$inferSelect

/**
 * Public List - Returns all active pricing plans for the current environment
 * Filtering by groupSlug is handled on the frontend for better flexibility and caching
 */
export async function getPublicPricingPlans(): Promise<ActionResult<PricingPlan[]>> {
  if (!isDatabaseEnabled) {
    return actionResponse.success([])
  }

  try {
    const siteId = await tryGetSiteId()
    if (!siteId) {
      return actionResponse.success([])
    }

    const environment = process.env.NODE_ENV === 'production' ? 'live' : 'test'

    const plans = await withTimeout(
      db
        .select()
        .from(pricingPlansSchema)
        .where(
          and(
            eq(pricingPlansSchema.siteId, siteId),
            eq(pricingPlansSchema.environment, environment),
            eq(pricingPlansSchema.isActive, true)
          )
        )
        .orderBy(asc(pricingPlansSchema.displayOrder)),
      PRICING_QUERY_TIMEOUT_MS,
      'Pricing query timed out'
    );

    return actionResponse.success((plans as unknown as PricingPlan[]) || [])
  } catch (error) {
    console.error('Unexpected error in getPublicPricingPlans:', error)
    return actionResponse.success([])
  }
}

'use server';
import {
  retrieveCreemSubscription
} from '@/lib/creem/client';
import { db } from '@/lib/db';
import {
  pricingPlans as pricingPlansSchema,
  subscriptions as subscriptionsSchema
} from '@/lib/db/schema';
import { getSiteId } from '@/lib/db/site-context';
import { and, eq, InferInsertModel } from 'drizzle-orm';

function toDate(value?: string | null) {
  if (!value) {
    return null;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export async function syncCreemSubscriptionData(
  subscriptionId: string,
  initialMetadata?: Record<string, any>
): Promise<void> {

  const subscription = await retrieveCreemSubscription(subscriptionId);
  const siteId = await getSiteId();

  const metadata = {
    ...(subscription.metadata ?? {}),
    ...(initialMetadata ?? {}),
  };

  let userId = subscription.metadata?.userId;
  let planId = subscription.metadata?.planId;
  let productId = subscription.product.id;

  if (!userId) {
    try {
      const storeSubscription = await db
        .select({ userId: subscriptionsSchema.userId })
        .from(subscriptionsSchema)
        .where(and(eq(subscriptionsSchema.subscriptionId, subscriptionId), eq(subscriptionsSchema.siteId, siteId)))
        .limit(1);
      userId = storeSubscription[0]?.userId;
    } catch (err) {
      console.error(`Error retrieving user for subscription ${subscription.id}:`, err);
    }
  }

  if (!planId) {
    const [planRow] = await db
      .select({ id: pricingPlansSchema.id })
      .from(pricingPlansSchema)
      .where(and(eq(pricingPlansSchema.creemProductId, productId), eq(pricingPlansSchema.siteId, siteId)))
      .limit(1);
    if (planRow) {
      planId = planRow.id;
    }
  }

  const subscriptionData: InferInsertModel<typeof subscriptionsSchema> = {
    userId,
    planId: planId ?? null,
    provider: 'creem',
    subscriptionId: subscription.id,
    customerId: subscription.customer.id,
    priceId: subscription.items?.[0]?.price_id ?? '',
    productId: productId,
    status: subscription.status,
    currentPeriodStart: toDate(subscription.current_period_start_date),
    currentPeriodEnd: toDate(subscription.current_period_end_date),
    cancelAtPeriodEnd: subscription.status === 'scheduled_cancel',
    canceledAt: toDate(subscription.canceled_at),
    endedAt: subscription.status === 'canceled' ? toDate(subscription.current_period_end_date) : null,
    trialStart: null,
    trialEnd: null,
    siteId: siteId,
    metadata: {
      ...metadata,
      creemSubscriptionId: subscription.id,
      creemCustomerId: subscription.customer.id,
      creemProductId: productId,
    },
  };

  const { ...updateData } = subscriptionData;

  await db
    .insert(subscriptionsSchema)
    .values(subscriptionData)
    .onConflictDoUpdate({
      target: subscriptionsSchema.subscriptionId,
      set: updateData,
    });
}


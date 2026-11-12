import { prisma } from '@/lib/db/prisma';
import { requireTenantUser } from '@/lib/auth/session';

export type EffectiveSubscriptionStatus = 'TRIAL' | 'ACTIVE' | 'PAST_DUE' | 'GRACE_PERIOD' | 'SUSPENDED' | 'CANCELLED' | 'NO_SUBSCRIPTION';

/**
 * Apply subscription expiry transitions safely. Conditional updateMany calls
 * prevent concurrent requests/cron runs from writing duplicate transitions.
 * Grace duration defaults to seven days and can be set to 1..30 days.
 */
export async function refreshTenantSubscription(tenantId: string) {
  let subscription = await prisma.subscription.findUnique({ where: { tenantId } });
  if (!subscription) return { subscription: null, effectiveStatus: 'NO_SUBSCRIPTION' as const };

  const now = new Date();
  const configuredDays = Number.parseInt(process.env.SUBSCRIPTION_GRACE_DAYS || '7', 10);
  const graceDays = Number.isInteger(configuredDays) && configuredDays >= 1 && configuredDays <= 30 ? configuredDays : 7;

  if (subscription.status === 'ACTIVE' && subscription.currentPeriodEnd && subscription.currentPeriodEnd <= now) {
    const graceEnd = new Date(subscription.currentPeriodEnd.getTime() + graceDays * 24 * 60 * 60 * 1000);
    await prisma.$transaction(async (tx) => {
      const changed = await tx.subscription.updateMany({
        where: { id: subscription!.id, status: 'ACTIVE', currentPeriodEnd: { lte: now } },
        data: { status: 'GRACE_PERIOD', gracePeriodEndsAt: graceEnd },
      });
      if (changed.count === 1) {
        await tx.auditLog.create({ data: { action: 'SUBSCRIPTION_AUTO_ENTERED_GRACE_PERIOD', entityType: 'Subscription', entityId: subscription!.id } });
      }
    });
    subscription = await prisma.subscription.findUnique({ where: { id: subscription.id } });
  }

  if (subscription?.status === 'GRACE_PERIOD' && subscription.gracePeriodEndsAt && subscription.gracePeriodEndsAt <= now) {
    await prisma.$transaction(async (tx) => {
      const changed = await tx.subscription.updateMany({
        where: { id: subscription!.id, status: 'GRACE_PERIOD', gracePeriodEndsAt: { lte: now } },
        data: { status: 'SUSPENDED' },
      });
      if (changed.count === 1) {
        await tx.auditLog.create({ data: { action: 'SUBSCRIPTION_AUTO_SUSPENDED_AFTER_GRACE_PERIOD', entityType: 'Subscription', entityId: subscription!.id } });
      }
    });
    subscription = await prisma.subscription.findUnique({ where: { id: subscription.id } });
  }

  return { subscription, effectiveStatus: (subscription?.status ?? 'NO_SUBSCRIPTION') as EffectiveSubscriptionStatus };
}

export function subscriptionAllowsPaidFeatures(status: EffectiveSubscriptionStatus) {
  return status === 'ACTIVE' || status === 'GRACE_PERIOD' || status === 'TRIAL' || status === 'NO_SUBSCRIPTION';
}


/**
 * Central server-side gate for every paid seller capability.
 * Call this from each paid API/service before reading or mutating tenant data.
 * Account recovery, billing status, language settings and logout remain available.
 */
export async function requirePaidTenantAccess(tenantId: string) {
  const billing = await refreshTenantSubscription(tenantId);
  if (!subscriptionAllowsPaidFeatures(billing.effectiveStatus)) {
    throw new Error('SUBSCRIPTION_SUSPENDED');
  }
  return billing;
}

export function isSubscriptionBlocked(status: EffectiveSubscriptionStatus) {
  return status === 'SUSPENDED' || status === 'CANCELLED' || status === 'PAST_DUE';
}


/** Preferred guard for paid seller routes: authenticates the user and checks billing. */
export async function requirePaidTenantUser() {
  const context = await requireTenantUser();
  const billing = await requirePaidTenantAccess(context.tenantId);
  return { ...context, billing };
}

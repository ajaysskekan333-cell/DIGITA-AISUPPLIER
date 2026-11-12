import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { requireOwnerAdmin } from '@/lib/auth/owner';

export const dynamic = 'force-dynamic';
const paidPlans = ['STARTER', 'GROWTH', 'BUSINESS'] as const;
const defaultPlans = [
  { code: 'STARTER', displayName: 'Starter' },
  { code: 'GROWTH', displayName: 'Growth' },
  { code: 'BUSINESS', displayName: 'Business' },
];
const schema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('set_price'), planCode: z.enum(paidPlans), monthlyPrice: z.number().min(0).max(10000000), active: z.boolean().optional() }),
  z.object({ action: z.literal('activate'), tenantId: z.string().min(1), planCode: z.enum(paidPlans), months: z.union([z.literal(1), z.literal(3), z.literal(12)]), paymentReference: z.string().trim().min(3).max(120) }),
  z.object({ action: z.literal('grace'), tenantId: z.string().min(1), days: z.union([z.literal(3), z.literal(7), z.literal(14)]) }),
  z.object({ action: z.literal('suspend'), tenantId: z.string().min(1), reason: z.string().trim().min(3).max(300) }),
  z.object({ action: z.literal('cancel'), tenantId: z.string().min(1), reason: z.string().trim().min(3).max(300) }),
]);

export async function GET() {
  const auth = await requireOwnerAdmin();
  if (auth.forbidden || !auth.user) return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
  for (const item of defaultPlans) {
    await prisma.subscriptionPlan.upsert({ where: { code: item.code }, create: { ...item, monthlyPrice: 0 }, update: {} });
  }
  const [plans, tenants] = await Promise.all([
    prisma.subscriptionPlan.findMany({ orderBy: { code: 'asc' } }),
    prisma.tenant.findMany({
      orderBy: { createdAt: 'desc' }, take: 200,
      select: { id: true, businessName: true, users: { where: { role: 'SELLER' }, take: 1, select: { email: true, phone: true } }, subscription: true },
    }),
  ]);
  const now = new Date();
  return NextResponse.json({ plans: plans.map(p => ({ code: p.code, displayName: p.displayName, monthlyPrice: Number(p.monthlyPrice), active: p.active })), tenants: tenants.map((t) => {
    const sub = t.subscription;
    const expired = !!sub?.currentPeriodEnd && sub.currentPeriodEnd < now;
    const effectiveStatus = sub?.status === 'ACTIVE' && expired ? 'PAST_DUE' : sub?.status ?? 'NO_SUBSCRIPTION';
    return { id: t.id, businessName: t.businessName, contact: t.users[0]?.email || t.users[0]?.phone || '—', subscription: sub ? { id: sub.id, planCode: sub.planCode, priceAtPurchase: Number(sub.priceAtPurchase), status: effectiveStatus, storedStatus: sub.status, currentPeriodEnd: sub.currentPeriodEnd?.toISOString() ?? null, gracePeriodEndsAt: sub.gracePeriodEndsAt?.toISOString() ?? null, paymentReference: sub.paymentReference ?? null } : null };
  }) }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: NextRequest) {
  const auth = await requireOwnerAdmin();
  if (auth.forbidden || !auth.user) return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'INVALID_INPUT', details: parsed.error.flatten() }, { status: 400 });
  const input = parsed.data;

  if (input.action === 'set_price') {
    const plan = await prisma.subscriptionPlan.upsert({
      where: { code: input.planCode },
      create: { code: input.planCode, displayName: defaultPlans.find(p => p.code === input.planCode)!.displayName, monthlyPrice: input.monthlyPrice, active: input.active ?? true },
      update: { monthlyPrice: input.monthlyPrice, ...(input.active === undefined ? {} : { active: input.active }) },
    });
    await prisma.auditLog.create({ data: { userId: auth.user.id, action: `SUBSCRIPTION_PLAN_PRICE_UPDATED:${input.planCode}:INR ${input.monthlyPrice.toFixed(2)}:ACTIVE ${plan.active}`, entityType: 'SubscriptionPlan', entityId: plan.id } });
    return NextResponse.json({ success: true, plan: { code: plan.code, monthlyPrice: Number(plan.monthlyPrice), active: plan.active } });
  }

  const tenant = await prisma.tenant.findUnique({ where: { id: input.tenantId }, select: { id: true } });
  if (!tenant) return NextResponse.json({ error: 'TENANT_NOT_FOUND' }, { status: 404 });

  let data: { status: 'ACTIVE' | 'GRACE_PERIOD' | 'SUSPENDED' | 'CANCELLED'; planCode?: string; priceAtPurchase?: number; currentPeriodEnd?: Date; gracePeriodEndsAt?: Date | null; paymentReference?: string };
  let action: string;
  if (input.action === 'activate') {
    const plan = await prisma.subscriptionPlan.findUnique({ where: { code: input.planCode } });
    if (!plan || !plan.active) return NextResponse.json({ error: 'PLAN_INACTIVE' }, { status: 400 });
    if (Number(plan.monthlyPrice) <= 0) return NextResponse.json({ error: 'PLAN_PRICE_NOT_CONFIGURED', message: 'Owner must set a price greater than zero before activating this paid plan.' }, { status: 400 });
    const end = new Date(); end.setMonth(end.getMonth() + input.months);
    data = { status: 'ACTIVE', planCode: input.planCode, priceAtPurchase: Number(plan.monthlyPrice), currentPeriodEnd: end, gracePeriodEndsAt: null, paymentReference: input.paymentReference };
    action = 'SUBSCRIPTION_ACTIVATED_AFTER_MANUAL_PAYMENT_VERIFICATION';
  } else if (input.action === 'grace') {
    const end = new Date(); end.setDate(end.getDate() + input.days);
    data = { status: 'GRACE_PERIOD', gracePeriodEndsAt: end }; action = `SUBSCRIPTION_GRACE_PERIOD_${input.days}_DAYS`;
  } else if (input.action === 'suspend') {
    data = { status: 'SUSPENDED' }; action = 'SUBSCRIPTION_SUSPENDED';
  } else {
    data = { status: 'CANCELLED' }; action = 'SUBSCRIPTION_CANCELLED';
  }

  const result = await prisma.$transaction(async (tx) => {
    const subscription = await tx.subscription.upsert({ where: { tenantId: input.tenantId }, create: { tenantId: input.tenantId, ...data }, update: data });
    await tx.auditLog.create({ data: { userId: auth.user!.id, action, entityType: 'Subscription', entityId: subscription.id } });
    const note = input.action === 'suspend' || input.action === 'cancel' ? input.reason : input.action === 'activate' ? `Payment reference ${input.paymentReference}; locked monthly price INR ${data.priceAtPurchase}` : `Grace period ${input.days} days`;
    await tx.auditLog.create({ data: { userId: auth.user!.id, action: `SUBSCRIPTION_NOTE:${note}`, entityType: 'Subscription', entityId: subscription.id } });
    return subscription;
  });
  return NextResponse.json({ success: true, subscription: { id: result.id, status: result.status, planCode: result.planCode, priceAtPurchase: Number(result.priceAtPurchase), currentPeriodEnd: result.currentPeriodEnd?.toISOString() ?? null } });
}

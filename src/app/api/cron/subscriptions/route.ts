import { timingSafeEqual } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { refreshTenantSubscription } from '@/lib/billing/subscription';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function authorized(request: NextRequest) {
  const secret = process.env.SUBSCRIPTION_CRON_SECRET;
  const supplied = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? '';
  if (!secret || !supplied) return false;
  const expectedBuffer = Buffer.from(secret);
  const suppliedBuffer = Buffer.from(supplied);
  return expectedBuffer.length === suppliedBuffer.length && timingSafeEqual(expectedBuffer, suppliedBuffer);
}

async function runSubscriptionSweep(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

  let cursor: string | undefined;
  let scanned = 0;
  let graceStarted = 0;
  let suspended = 0;
  const batchSize = 300;

  try {
    while (true) {
      const batch = await prisma.subscription.findMany({
        where: { status: { in: ['ACTIVE', 'GRACE_PERIOD'] } },
        orderBy: { id: 'asc' },
        take: batchSize,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        select: { id: true, tenantId: true },
      });
      if (batch.length === 0) break;
      for (let offset = 0; offset < batch.length; offset += 10) {
        const group = batch.slice(offset, offset + 10);
        const outcomes = await Promise.all(group.map(async (item) => {
          const before = await prisma.subscription.findUnique({ where: { id: item.id }, select: { status: true } });
          const result = await refreshTenantSubscription(item.tenantId);
          return { before: before?.status, after: result.effectiveStatus };
        }));
        scanned += outcomes.length;
        graceStarted += outcomes.filter(x => x.before === 'ACTIVE' && x.after === 'GRACE_PERIOD').length;
        suspended += outcomes.filter(x => (x.before === 'GRACE_PERIOD' || x.before === 'ACTIVE') && x.after === 'SUSPENDED').length;
      }
      cursor = batch[batch.length - 1].id;
      if (batch.length < batchSize) break;
    }

    await prisma.auditLog.create({ data: {
      action: `SUBSCRIPTION_CRON_COMPLETED:SCANNED ${scanned}:GRACE ${graceStarted}:SUSPENDED ${suspended}`,
      entityType: 'SubscriptionCron',
      entityId: null,
    } });
    return NextResponse.json({ success: true, scanned, graceStarted, suspended, completedAt: new Date().toISOString() }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Subscription cron failed', error);
    return NextResponse.json({ error: 'SUBSCRIPTION_SWEEP_FAILED' }, { status: 500 });
  }
}

// Cron providers commonly invoke GET; POST is also supported for manual ops.
export async function GET(request: NextRequest) { return runSubscriptionSweep(request); }
export async function POST(request: NextRequest) { return runSubscriptionSweep(request); }

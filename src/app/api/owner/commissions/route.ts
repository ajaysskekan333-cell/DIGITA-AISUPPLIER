import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { requireOwnerAdmin } from '@/lib/auth/owner';

export const dynamic = 'force-dynamic';
const RATE_BPS = 800;
const actionSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('generate') }),
  z.object({ action: z.literal('settle'), ledgerId: z.string().min(1), paymentReference: z.string().trim().min(2).max(120), notes: z.string().trim().max(500).optional() }),
]);

export async function GET() {
  const auth = await requireOwnerAdmin();
  if (auth.forbidden || !auth.user) return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });

  const [entries, grouped, totals] = await Promise.all([
    prisma.commissionLedger.findMany({
      take: 100, orderBy: { createdAt: 'desc' },
      include: { tenant: { select: { businessName: true } }, order: { select: { orderNumber: true, status: true } } },
    }),
    prisma.commissionLedger.groupBy({ by: ['status'], _count: { _all: true }, _sum: { commissionAmount: true, sellerNetAmount: true } }),
    prisma.commissionLedger.aggregate({ _sum: { grossAmount: true, commissionAmount: true, sellerNetAmount: true }, _count: { _all: true } }),
  ]);
  return NextResponse.json({
    ratePercent: RATE_BPS / 100,
    totals: {
      entries: totals._count._all,
      grossAmount: totals._sum.grossAmount?.toString() ?? '0.00',
      commissionAmount: totals._sum.commissionAmount?.toString() ?? '0.00',
      sellerNetAmount: totals._sum.sellerNetAmount?.toString() ?? '0.00',
    },
    statuses: grouped.map((g) => ({ status: g.status, count: g._count._all, commissionAmount: g._sum.commissionAmount?.toString() ?? '0.00' })),
    entries: entries.map((e) => ({
      id: e.id, businessName: e.tenant.businessName, orderNumber: e.order.orderNumber,
      orderStatus: e.order.status, grossAmount: e.grossAmount.toString(), ratePercent: e.commissionRateBps / 100,
      commissionAmount: e.commissionAmount.toString(), sellerNetAmount: e.sellerNetAmount.toString(),
      status: e.status, paymentReference: e.paymentReference, createdAt: e.createdAt.toISOString(),
      settledAt: e.settledAt?.toISOString() ?? null,
    })),
  }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: NextRequest) {
  const auth = await requireOwnerAdmin();
  if (auth.forbidden || !auth.user) return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
  const parsed = actionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'INVALID_INPUT', details: parsed.error.flatten() }, { status: 400 });

  if (parsed.data.action === 'generate') {
    const deliveredOrders = await prisma.order.findMany({
      where: { status: 'DELIVERED', commission: null },
      select: { id: true, tenantId: true, total: true },
    });
    const rows = deliveredOrders.map((order) => {
      const gross = new Prisma.Decimal(order.total.toString());
      const commission = gross.mul(RATE_BPS).div(10_000).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
      const sellerNet = gross.minus(commission).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
      return { tenantId: order.tenantId, orderId: order.id, grossAmount: gross, commissionRateBps: RATE_BPS, commissionAmount: commission, sellerNetAmount: sellerNet };
    });
    const inserted = rows.length ? await prisma.commissionLedger.createMany({ data: rows, skipDuplicates: true }) : { count: 0 };
    const created = inserted.count;
    await prisma.auditLog.create({ data: { userId: auth.user.id, action: 'COMMISSION_LEDGER_GENERATED', entityType: 'CommissionLedger', entityId: null } });
    return NextResponse.json({ success: true, scanned: deliveredOrders.length, created, message: 'Delivered orders processed.' });
  }

  const entry = await prisma.commissionLedger.findUnique({ where: { id: parsed.data.ledgerId } });
  if (!entry) return NextResponse.json({ error: 'LEDGER_ENTRY_NOT_FOUND' }, { status: 404 });
  if (entry.status === 'PAID') return NextResponse.json({ error: 'ALREADY_SETTLED' }, { status: 409 });
  if (entry.status === 'VOID') return NextResponse.json({ error: 'VOID_ENTRY_CANNOT_BE_SETTLED' }, { status: 409 });
  const updated = await prisma.$transaction(async (tx) => {
    const changed = await tx.commissionLedger.updateMany({
      where: { id: entry.id, status: 'PENDING' },
      data: { status: 'PAID', paymentReference: parsed.data.paymentReference, notes: parsed.data.notes, settledAt: new Date() },
    });
    if (changed.count !== 1) return null;
    await tx.auditLog.create({ data: { userId: auth.user!.id, action: 'COMMISSION_MARKED_PAID', entityType: 'CommissionLedger', entityId: entry.id } });
    return tx.commissionLedger.findUnique({ where: { id: entry.id }, select: { id: true, status: true, settledAt: true } });
  });
  if (!updated) return NextResponse.json({ error: 'ENTRY_CHANGED_RELOAD_AND_RETRY' }, { status: 409 });
  return NextResponse.json({ success: true, id: updated.id, status: updated.status, settledAt: updated.settledAt });
}

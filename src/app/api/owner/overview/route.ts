import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  const user = await getCurrentUser();
  const allowedEmail = process.env.OWNER_ADMIN_EMAIL?.trim().toLowerCase();
  if (!user || !user.isActive || user.role !== 'OWNER_ADMIN' || !allowedEmail || user.email?.toLowerCase() !== allowedEmail) {
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
  }

  const [sellerCount, activeSellerCount, tenantCount, productCount, orderCount, subscriptions, tenants] = await Promise.all([
    prisma.user.count({ where: { role: 'SELLER' } }),
    prisma.user.count({ where: { role: 'SELLER', isActive: true } }),
    prisma.tenant.count(),
    prisma.product.count(),
    prisma.order.count(),
    prisma.subscription.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.tenant.findMany({
      take: 100,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, businessName: true, preferredLanguage: true, createdAt: true,
        users: { where: { role: 'SELLER' }, select: { id: true, email: true, phone: true, isActive: true, createdAt: true }, take: 5 },
        subscription: { select: { status: true, planCode: true, currentPeriodEnd: true, gracePeriodEndsAt: true } },
        _count: { select: { products: true, orders: true } },
      },
    }),
  ]);

  return NextResponse.json({
    metrics: { sellerCount, activeSellerCount, tenantCount, productCount, orderCount },
    subscriptions: subscriptions.map((item) => ({ status: item.status, count: item._count._all })),
    tenants,
  }, { headers: { 'Cache-Control': 'no-store' } });
}

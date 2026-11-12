import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { refreshTenantSubscription } from '@/lib/billing/subscription';

export const dynamic = 'force-dynamic';

export async function GET() {
  const user = await getCurrentUser();
  if (!user || !user.isActive || !user.tenantId) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

  const { subscription, effectiveStatus } = await refreshTenantSubscription(user.tenantId);
  return NextResponse.json({
    status: effectiveStatus,
    planCode: subscription?.planCode ?? 'FREE',
    currentPeriodEnd: subscription?.currentPeriodEnd?.toISOString() ?? null,
    gracePeriodEndsAt: subscription?.gracePeriodEndsAt?.toISOString() ?? null,
    paidFeaturesAvailable: !['SUSPENDED', 'CANCELLED', 'PAST_DUE'].includes(effectiveStatus),
    message: effectiveStatus === 'GRACE_PERIOD'
      ? 'तुमचे सबस्क्रिप्शन ग्रेस पिरियडमध्ये आहे. सेवा सुरू ठेवण्यासाठी पेमेंट करा.'
      : effectiveStatus === 'SUSPENDED' || effectiveStatus === 'CANCELLED'
        ? 'सबस्क्रिप्शन बंद आहे. सेवा पुन्हा सुरू करण्यासाठी मालकाशी संपर्क साधा.'
        : 'सबस्क्रिप्शन उपलब्ध आहे.',
  }, { headers: { 'Cache-Control': 'no-store' } });
}

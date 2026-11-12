import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { otpPolicy, verifyOtpHash } from '@/lib/auth/otp';
import { createSession } from '@/lib/auth/session';

const schema = z.object({
  identifier: z.string().trim().min(7).max(254),
  code: z.string().regex(/^\d{6}$/),
  businessName: z.string().trim().min(2).max(100),
  language: z.string().trim().min(2).max(12).default('mr'),
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Please provide valid contact, six-digit OTP and business name.' }, { status: 400 });
  const { code, businessName, language } = parsed.data;
  const identifier = parsed.data.identifier.toLowerCase();
  const isEmail = z.string().email().safeParse(identifier).success;
  const isPhone = /^\+?[1-9]\d{7,14}$/.test(identifier);
  if (!isEmail && !isPhone) return NextResponse.json({ error: 'Use a valid email address or phone number with country code.' }, { status: 400 });

  try {
    const result = await prisma.$transaction(async (tx) => {
      const challenge = await tx.otpChallenge.findFirst({ where: { identifier, consumedAt: null, expiresAt: { gt: new Date() } }, orderBy: { createdAt: 'desc' } });
      if (!challenge || challenge.attempts >= otpPolicy.maxAttempts) return { error: 'OTP_EXPIRED' as const };
      if (!verifyOtpHash(identifier, code, challenge.codeHash)) {
        await tx.otpChallenge.update({ where: { id: challenge.id }, data: { attempts: { increment: 1 } } });
        return { error: 'OTP_INVALID' as const };
      }
      const existing = await tx.user.findFirst({ where: { OR: [{ email: identifier }, { phone: identifier }] } });
      if (existing) return { error: 'ACCOUNT_EXISTS' as const };
      const tenant = await tx.tenant.create({ data: {
        businessName,
        preferredLanguage: language,
        subscription: { create: { planCode: 'FREE', status: 'TRIAL' } },
      } });
      const user = await tx.user.create({ data: {
        tenantId: tenant.id,
        email: isEmail ? identifier : null,
        phone: isPhone ? identifier : null,
        preferredLanguage: language,
        role: 'SELLER',
      } });
      await tx.otpChallenge.update({ where: { id: challenge.id }, data: { consumedAt: new Date() } });
      await tx.auditLog.create({ data: { userId: user.id, action: 'SELLER_REGISTERED', entityType: 'Tenant', entityId: tenant.id } });
      return { user };
    });
    if ('error' in result) {
      if (result.error === 'OTP_INVALID') return NextResponse.json({ error: 'Incorrect OTP.' }, { status: 400 });
      if (result.error === 'OTP_EXPIRED') return NextResponse.json({ error: 'OTP expired. Request a new OTP.' }, { status: 400 });
      return NextResponse.json({ error: 'An account already exists for this contact. Please log in.' }, { status: 409 });
    }
    await createSession(result.user.id);
    return NextResponse.json({ ok: true, preferredLanguage: result.user.preferredLanguage }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002') return NextResponse.json({ error: 'An account already exists for this contact. Please log in.' }, { status: 409 });
    console.error('Seller registration failed', error);
    return NextResponse.json({ error: 'Registration could not be completed.' }, { status: 500 });
  }
}

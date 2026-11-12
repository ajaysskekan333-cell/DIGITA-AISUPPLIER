import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { verifyOtpHash, otpPolicy } from '@/lib/auth/otp';
import { createSession } from '@/lib/auth/session';

const schema = z.object({ identifier: z.string().trim().min(7).max(254), code: z.string().regex(/^\d{6}$/) });
export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: 'Invalid OTP details.' }, { status: 400 });
  const identifier = parsed.data.identifier.toLowerCase();
  const challenge = await prisma.otpChallenge.findFirst({ where: { identifier, consumedAt: null, expiresAt: { gt: new Date() } }, orderBy: { createdAt: 'desc' } });
  if (!challenge || challenge.attempts >= otpPolicy.maxAttempts) return NextResponse.json({ error: 'OTP expired or unavailable. Request a new OTP.' }, { status: 400 });
  if (!verifyOtpHash(identifier, parsed.data.code, challenge.codeHash)) {
    await prisma.otpChallenge.update({ where: { id: challenge.id }, data: { attempts: { increment: 1 } } });
    return NextResponse.json({ error: 'Incorrect OTP.' }, { status: 400 });
  }
  await prisma.otpChallenge.update({ where: { id: challenge.id }, data: { consumedAt: new Date() } });
  const user = await prisma.user.findFirst({ where: { OR: [{ email: identifier }, { phone: identifier }], isActive: true } });
  if (!user) return NextResponse.json({ error: 'No active account found. Complete seller registration first.' }, { status: 404 });
  await createSession(user.id);
  await prisma.auditLog.create({ data: { userId: user.id, action: 'LOGIN_OTP_SUCCESS', entityType: 'User', entityId: user.id } });
  return NextResponse.json({ ok: true, preferredLanguage: user.preferredLanguage });
}

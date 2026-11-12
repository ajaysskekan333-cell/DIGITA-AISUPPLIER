import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { createOtp, deliverOtp, hashOtp, otpPolicy } from '@/lib/auth/otp';

const schema = z.object({ identifier: z.string().trim().min(7).max(254).regex(/^[^\s]+$/) });
export async function POST(request: Request) {
  try {
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: 'Enter a valid mobile number or email.' }, { status: 400 });
    const identifier = parsed.data.identifier.toLowerCase();
    const recent = await prisma.otpChallenge.count({ where: { identifier, createdAt: { gt: new Date(Date.now() - 60_000) } } });
    if (recent >= 3) return NextResponse.json({ error: 'Too many OTP requests. Try again later.' }, { status: 429 });
    const code = createOtp();
    const challenge = await prisma.otpChallenge.create({ data: { identifier, codeHash: hashOtp(identifier, code), expiresAt: new Date(Date.now() + otpPolicy.ttlMs) } });
    try { await deliverOtp(identifier, code); }
    catch (error) { await prisma.otpChallenge.delete({ where: { id: challenge.id } }); throw error; }
    return NextResponse.json({ ok: true, message: 'OTP sent. It expires in 5 minutes.' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'OTP service unavailable';
    return NextResponse.json({ error: message }, { status: 503 });
  }
}

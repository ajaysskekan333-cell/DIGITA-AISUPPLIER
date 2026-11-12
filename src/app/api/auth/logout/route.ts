import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createHash } from 'node:crypto';
import { jwtVerify } from 'jose';
import { prisma } from '@/lib/db/prisma';

export async function POST() {
  const jar = await cookies();
  const token = jar.get('das_session')?.value;
  if (token) {
    try {
      const secret = process.env.SESSION_SECRET;
      if (secret && secret.length >= 32) {
        const { payload } = await jwtVerify(token, new TextEncoder().encode(secret));
        if (typeof payload.sid === 'string' && typeof payload.sub === 'string') {
          const tokenHash = createHash('sha256').update(payload.sid).digest('hex');
          await prisma.userSession.updateMany({ where: { userId: payload.sub, tokenHash, revokedAt: null }, data: { revokedAt: new Date() } });
        }
      }
    } catch { /* Expired or invalid cookies are still cleared. */ }
  }
  jar.delete('das_session');
  return NextResponse.json({ ok: true });
}

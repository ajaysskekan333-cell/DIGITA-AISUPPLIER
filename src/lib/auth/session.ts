import { createHash, randomBytes } from 'node:crypto';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/db/prisma';

const COOKIE = 'das_session';
const secret = () => {
  const value = process.env.SESSION_SECRET;
  if (!value || value.length < 32) throw new Error('SESSION_SECRET must contain at least 32 characters');
  return new TextEncoder().encode(value);
};
const digest = (value: string) => createHash('sha256').update(value).digest('hex');

export async function createSession(userId: string) {
  const raw = randomBytes(32).toString('base64url');
  const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await prisma.userSession.create({ data: { userId, tokenHash: digest(raw), expiresAt: expires } });
  const jwt = await new SignJWT({ sid: raw }).setProtectedHeader({ alg: 'HS256' }).setSubject(userId).setIssuedAt().setExpirationTime('7d').sign(secret());
  (await cookies()).set(COOKIE, jwt, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', expires });
}

export async function getCurrentUser() {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    const sid = payload.sid;
    const userId = payload.sub;
    if (typeof sid !== 'string' || !userId) return null;
    const session = await prisma.userSession.findFirst({ where: { userId, tokenHash: digest(sid), revokedAt: null, expiresAt: { gt: new Date() } }, include: { user: true } });
    return session?.user ?? null;
  } catch { return null; }
}

export async function requireTenantUser() {
  const user = await getCurrentUser();
  if (!user || !user.tenantId || !user.isActive) throw new Error('UNAUTHORIZED');
  return { user, tenantId: user.tenantId };
}

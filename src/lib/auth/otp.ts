import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';

const OTP_TTL_MS = 5 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const secret = () => process.env.OTP_HASH_SECRET;
export function createOtp() { return String(randomInt(0, 1_000_000)).padStart(6, '0'); }
export function hashOtp(identifier: string, code: string) {
  if (!secret()) throw new Error('OTP_HASH_SECRET is not configured');
  return createHmac('sha256', secret()!).update(`${identifier}:${code}`).digest('hex');
}
export function verifyOtpHash(identifier: string, code: string, expected: string) {
  const actual = Buffer.from(hashOtp(identifier, code), 'hex');
  const stored = Buffer.from(expected, 'hex');
  return actual.length === stored.length && timingSafeEqual(actual, stored);
}
export const otpPolicy = { ttlMs: OTP_TTL_MS, maxAttempts: MAX_ATTEMPTS };

export async function deliverOtp(identifier: string, code: string) {
  const url = process.env.OTP_PROVIDER_URL;
  const key = process.env.OTP_PROVIDER_API_KEY;
  if (!url || !key) throw new Error('OTP delivery provider is not configured. Login is safely disabled.');
  const response = await fetch(url, {
    method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
    body: JSON.stringify({ to: identifier, code, expiresInMinutes: 5 }), cache: 'no-store'
  });
  if (!response.ok) throw new Error('OTP provider rejected the delivery request');
}

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ ok: true, service: 'DIGITAL AI SUPPLIER', database: 'connected' }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ ok: false, service: 'DIGITAL AI SUPPLIER', database: 'unavailable' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}

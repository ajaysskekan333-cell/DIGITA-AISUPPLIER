import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { requireTenantUser } from '@/lib/auth/session';
import { languageOptions } from '@/lib/i18n/languages';
const schema = z.object({ language: z.string().refine(value => languageOptions.some(item => item.code === value)) });
export async function PATCH(request: Request) {
  try {
    const { user, tenantId } = await requireTenantUser();
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: 'Unsupported language.' }, { status: 400 });
    await prisma.$transaction([
      prisma.user.update({ where: { id: user.id }, data: { preferredLanguage: parsed.data.language } }),
      prisma.auditLog.create({ data: { userId: user.id, action: 'LANGUAGE_UPDATED', entityType: 'TenantUser', entityId: user.id } })
    ]);
    return NextResponse.json({ ok: true, language: parsed.data.language, tenantId });
  } catch { return NextResponse.json({ error: 'Authentication required.' }, { status: 401 }); }
}

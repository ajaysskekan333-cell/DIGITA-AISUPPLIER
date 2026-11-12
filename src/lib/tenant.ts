import { prisma } from '@/lib/db/prisma';
import { requirePaidTenantUser } from '@/lib/billing/subscription';

// Tenant ID is always derived from the verified server session, never request input.
// All paid seller modules must use this same guard before accessing tenant data.
export async function listTenantProducts() {
  const { tenantId } = await requirePaidTenantUser();
  return prisma.product.findMany({ where: { tenantId }, orderBy: { createdAt: 'desc' } });
}
export async function createTenantProduct(input: { title: string; description?: string; sku?: string; price: string; stock?: number }) {
  const { tenantId } = await requirePaidTenantUser();
  return prisma.product.create({ data: { ...input, tenantId, price: input.price, stock: input.stock ?? 0 } });
}

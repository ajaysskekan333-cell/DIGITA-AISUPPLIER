import { PrismaClient } from '@prisma/client';
const email = process.argv[2]?.trim().toLowerCase();
if (!email || !email.includes('@')) {
  console.error('Usage: npm run owner:promote -- owner@example.com');
  process.exit(1);
}
const prisma = new PrismaClient();
try {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new Error('No registered user found for that email. Register and verify OTP first.');
  const updated = await prisma.user.update({ where: { id: user.id }, data: { role: 'OWNER_ADMIN', tenantId: null } });
  await prisma.auditLog.create({ data: { userId: updated.id, action: 'OWNER_ADMIN_ROLE_BOOTSTRAPPED', entityType: 'User', entityId: updated.id } });
  console.log(`Owner role granted to ${updated.email}. Set OWNER_ADMIN_EMAIL to the same address in server environment.`);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}

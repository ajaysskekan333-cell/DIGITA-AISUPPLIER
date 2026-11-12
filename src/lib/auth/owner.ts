import { getCurrentUser } from '@/lib/auth/session';

export async function requireOwnerAdmin() {
  const user = await getCurrentUser();
  const allowedEmail = process.env.OWNER_ADMIN_EMAIL?.trim().toLowerCase();
  if (!user || !user.isActive || user.role !== 'OWNER_ADMIN' || !allowedEmail || user.email?.toLowerCase() !== allowedEmail) {
    return { user: null, forbidden: true as const };
  }
  return { user, forbidden: false as const };
}

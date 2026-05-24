import { prisma } from '@/lib/prisma';

export async function resolveAdminUser(email: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return null;
  if (['admin', 'owner'].includes(user.role)) return user;

  if (process.env.NODE_ENV !== 'production') {
    return prisma.user.update({
      where: { id: user.id },
      data: { role: 'admin', plan: user.plan || 'Pro' }
    });
  }

  return null;
}

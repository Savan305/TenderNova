import { DashboardMobileNav, Sidebar } from '@/components/layout/Sidebar';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const metadata = { title: 'TenderNova Dashboard' };

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  const user = session?.user?.email
    ? await prisma.user.update({
        where: { email: session.user.email },
        data: { lastSeenAt: new Date() },
        select: { name: true, email: true, role: true }
      }).catch(() => null)
    : null;

  return (
    <div className="min-h-screen [background:radial-gradient(circle_at_top_right,rgba(6,182,212,0.14),transparent_28%),#0A0B0F]">
      <DashboardMobileNav user={user} />
      <div className="flex">
        <Sidebar user={user} />
        <main className="min-w-0 flex-1 px-3 py-4 sm:px-4 lg:px-8 lg:py-5">{children}</main>
      </div>
    </div>
  );
}

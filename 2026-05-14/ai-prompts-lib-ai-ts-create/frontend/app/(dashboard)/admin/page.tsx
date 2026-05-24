import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { AdminClient } from '@/components/admin/AdminClient';
import { resolveAdminUser } from '@/lib/admin';

export default async function AdminPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect('/login');
  const user = await resolveAdminUser(session.user.email);
  if (!user) {
    return (
      <div className="grid min-h-[70vh] place-items-center">
        <div className="glass max-w-lg rounded-lg p-8 text-center">
          <h1 className="text-2xl font-bold">Admin Access Required</h1>
          <p className="mt-3 text-slate-400">Your account is authenticated, but it does not have admin permissions for this workspace.</p>
        </div>
      </div>
    );
  }

  const [users, tenders, proposals, jobs, failedJobs, notifications, apiKeys, logs, recentUsers, recentJobs] = await Promise.all([
    prisma.user.count(),
    prisma.tender.count(),
    prisma.proposal.count(),
    prisma.processingJob.count(),
    prisma.processingJob.count({ where: { status: 'failed' } }),
    prisma.notification.count(),
    prisma.apiKey.count(),
    prisma.adminLog.findMany({ orderBy: { createdAt: 'desc' }, take: 12, include: { user: { select: { email: true, name: true } } } }),
    prisma.user.findMany({ orderBy: { createdAt: 'desc' }, take: 12, select: { id: true, name: true, email: true, role: true, plan: true, createdAt: true } }),
    prisma.processingJob.findMany({ orderBy: { updatedAt: 'desc' }, take: 12, include: { tender: { select: { title: true } }, user: { select: { email: true } } } })
  ]);

  const data = {
    cards: [
      ['Users', users],
      ['Tenders', tenders],
      ['Proposals', proposals],
      ['Processing Jobs', jobs],
      ['Failed Jobs', failedJobs],
      ['Notifications', notifications],
      ['API Keys', apiKeys],
      ['System Health', failedJobs ? 'Attention' : 'Healthy']
    ],
    users: recentUsers,
    jobs: recentJobs,
    logs
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Admin Control Center</h1>
        <p className="mt-1 text-slate-400">Live owner-only controls for users, jobs, audit logs, and platform health.</p>
      </div>
      <AdminClient initialData={JSON.parse(JSON.stringify(data))} />
    </div>
  );
}

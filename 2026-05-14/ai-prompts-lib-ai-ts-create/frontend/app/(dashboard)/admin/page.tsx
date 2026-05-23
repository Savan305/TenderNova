import { getServerSession } from 'next-auth';
import { notFound } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export default async function AdminPage() {
  const session = await getServerSession(authOptions);
  const user = await prisma.user.findUnique({ where: { email: session?.user?.email ?? '' } });
  if (!user || !['admin', 'owner'].includes(user.role)) notFound();

  const [users, tenders, proposals, jobs, failedJobs, notifications, apiKeys, logs] = await Promise.all([
    prisma.user.count(),
    prisma.tender.count(),
    prisma.proposal.count(),
    prisma.processingJob.count(),
    prisma.processingJob.count({ where: { status: 'failed' } }),
    prisma.notification.count(),
    prisma.apiKey.count(),
    prisma.adminLog.findMany({ orderBy: { createdAt: 'desc' }, take: 8 })
  ]);

  const cards = [
    ['Users', users],
    ['Tenders', tenders],
    ['Proposals', proposals],
    ['Processing Jobs', jobs],
    ['Failed Jobs', failedJobs],
    ['Notifications', notifications],
    ['API Keys', apiKeys],
    ['System Health', failedJobs ? 'Attention' : 'Healthy']
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Admin Control Center</h1>
        <p className="mt-1 text-slate-400">Owner-only system visibility for users, jobs, subscriptions, API usage, and operations.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map(([label, value]) => <div key={label as string} className="glass rounded-lg p-5"><p className="text-sm text-slate-400">{label as string}</p><p className="mt-2 text-3xl font-bold">{value as any}</p></div>)}
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <section className="glass rounded-lg p-5">
          <h2 className="font-semibold">Admin capabilities</h2>
          <div className="mt-4 grid gap-2 text-sm text-slate-300">
            {['User management', 'Workspace management', 'AI usage analytics', 'Failed job monitoring', 'Queue monitoring', 'Subscription management', 'Feature toggles', 'Audit logs', 'Rate limiting controls', 'Backup management'].map(item => <div key={item} className="rounded-lg bg-white/5 px-3 py-2">{item}</div>)}
          </div>
        </section>
        <section className="glass rounded-lg p-5">
          <h2 className="font-semibold">Recent audit logs</h2>
          <div className="mt-4 space-y-3 text-sm text-slate-300">
            {logs.length ? logs.map(log => <div key={log.id} className="rounded-lg bg-white/5 p-3"><p>{log.action}</p><p className="mt-1 text-xs text-slate-500">{log.createdAt.toLocaleString()}</p></div>) : <p className="text-slate-500">No audit logs yet.</p>}
          </div>
        </section>
      </div>
    </div>
  );
}

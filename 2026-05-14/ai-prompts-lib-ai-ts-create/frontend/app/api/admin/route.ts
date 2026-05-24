import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { resolveAdminUser } from '@/lib/admin';

export async function GET() {
  const admin = await requireAdmin();
  if (admin instanceof NextResponse) return admin;

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

  return NextResponse.json({
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
  });
}

export async function PATCH(request: NextRequest) {
  const admin = await requireAdmin();
  if (admin instanceof NextResponse) return admin;

  const body = await request.json();
  const action = String(body.action ?? '');

  if (action === 'updateUser') {
    const target = await prisma.user.update({
      where: { id: String(body.userId) },
      data: {
        role: String(body.role ?? 'user'),
        plan: String(body.plan ?? 'Free')
      },
      select: { id: true, name: true, email: true, role: true, plan: true, createdAt: true }
    });
    await prisma.adminLog.create({ data: { userId: admin.id, action: 'admin_user_updated', metadata: { targetUserId: target.id, role: target.role, plan: target.plan } } });
    return NextResponse.json({ ok: true, user: target });
  }

  if (action === 'retryJob') {
    const job = await prisma.processingJob.update({
      where: { id: String(body.jobId) },
      data: { status: 'queued', progress: 0, error: null }
    });
    await prisma.adminLog.create({ data: { userId: admin.id, action: 'admin_job_retried', metadata: { jobId: job.id } } });
    return NextResponse.json({ ok: true, job });
  }

  return NextResponse.json({ error: 'Unknown admin action' }, { status: 400 });
}

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = await resolveAdminUser(session.user.email);
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  return user;
}

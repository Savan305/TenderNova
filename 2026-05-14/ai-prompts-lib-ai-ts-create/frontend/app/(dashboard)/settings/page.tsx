import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { SettingsClient } from '@/components/settings/SettingsClient';

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect('/login');

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: {
      workspaces: { orderBy: { createdAt: 'asc' }, take: 1 },
      subscriptions: { orderBy: { createdAt: 'desc' }, take: 1 },
      notifications: { orderBy: { createdAt: 'desc' }, take: 10 },
      apiKeys: { orderBy: { createdAt: 'desc' } }
    }
  });
  if (!user) redirect('/login');

  const { password, apiKeys, ...safeUser } = user;
  const data = {
    user: safeUser,
    workspace: user.workspaces[0] ?? null,
    subscription: user.subscriptions[0] ?? { plan: user.plan, status: 'active', usage: null },
    apiKeys: apiKeys.map(key => ({ id: key.id, provider: key.provider, label: key.label, createdAt: key.createdAt })),
    notifications: user.notifications
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="mt-1 text-slate-400">Update your real profile, workspace preferences, AI behavior, integrations, and security settings.</p>
      </div>
      <SettingsClient initialData={JSON.parse(JSON.stringify(data))} />
    </div>
  );
}

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const sections = [
  ['Profile Settings', ['Name', 'Email', 'Company info', 'Profile image', 'Contact info']],
  ['Workspace Settings', ['Company branding', 'Tender preferences', 'Default proposal format', 'Notification settings']],
  ['AI Settings', ['AI model selection', 'Proposal tone', 'Risk sensitivity', 'AI creativity level']],
  ['API & Integrations', ['Mistral/OpenAI keys', 'OCR API', 'Email integrations', 'Google Drive/Dropbox']],
  ['Billing & Subscription', ['Current plan', 'Usage statistics', 'Upgrade options', 'Payment history']],
  ['Security', ['Change password', '2FA', 'Active sessions', 'Login history']],
  ['Notifications', ['Email alerts', 'Tender alerts', 'Deadline reminders', 'Proposal completion alerts']]
];

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);
  const user = await prisma.user.findUnique({ where: { email: session?.user?.email ?? '' }, include: { workspaces: true, subscriptions: true } });
  const workspace = user?.workspaces[0];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="mt-1 text-slate-400">Configure your profile, workspace, AI behavior, integrations, billing, and security controls.</p>
      </div>
      <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
        <aside className="glass rounded-lg p-5">
          <h2 className="font-semibold">Workspace snapshot</h2>
          <div className="mt-4 space-y-3 text-sm text-slate-300">
            <p><span className="text-slate-500">User:</span> {user?.name ?? 'Not set'}</p>
            <p><span className="text-slate-500">Email:</span> {user?.email}</p>
            <p><span className="text-slate-500">Company:</span> {workspace?.name ?? user?.company ?? 'Not configured'}</p>
            <p><span className="text-slate-500">Plan:</span> {user?.plan ?? 'Free'}</p>
            <p><span className="text-slate-500">Role:</span> {user?.role ?? 'user'}</p>
          </div>
        </aside>
        <div className="grid gap-4 md:grid-cols-2">
          {sections.map(([title, items]) => (
            <section key={title as string} className="glass rounded-lg p-5">
              <h2 className="font-semibold">{title as string}</h2>
              <div className="mt-4 space-y-3">
                {(items as string[]).map(item => <div key={item} className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2 text-sm text-slate-300"><span>{item}</span><span className="rounded-full bg-cyanGlow/10 px-2 py-0.5 text-xs text-cyan-200">Ready</span></div>)}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}

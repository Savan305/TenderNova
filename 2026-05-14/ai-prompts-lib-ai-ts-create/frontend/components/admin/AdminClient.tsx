'use client';

import { useState } from 'react';
import { RefreshCcw, Save } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';

export function AdminClient({ initialData }: { initialData: any }) {
  const [data, setData] = useState(initialData);
  const [saving, setSaving] = useState('');
  const toast = useToast();

  async function updateUser(userId: string, role: string, plan: string) {
    setSaving(userId);
    try {
      const response = await fetch('/api/admin', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'updateUser', userId, role, plan })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? 'User update failed');
      setData((current: any) => ({ ...current, users: current.users.map((user: any) => user.id === userId ? result.user : user) }));
      toast('User updated', 'success');
    } catch (error) {
      toast(error instanceof Error ? error.message : 'User update failed', 'error');
    } finally {
      setSaving('');
    }
  }

  async function retryJob(jobId: string) {
    const response = await fetch('/api/admin', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'retryJob', jobId })
    });
    if (response.ok) {
      setData((current: any) => ({
        ...current,
        jobs: current.jobs.map((job: any) => job.id === jobId ? { ...job, status: 'queued', progress: 0, error: null } : job)
      }));
      toast('Job queued for retry', 'success');
    } else {
      toast('Could not retry job', 'error');
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {data.cards.map(([label, value]: [string, string | number]) => (
          <div key={label} className="glass rounded-lg p-5"><p className="text-sm text-slate-400">{label}</p><p className="mt-2 text-3xl font-bold">{value}</p></div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="glass rounded-lg p-5">
          <h2 className="font-semibold">User Management</h2>
          <div className="mt-4 space-y-3">
            {data.users.map((user: any) => <UserRow key={user.id} user={user} saving={saving === user.id} onSave={updateUser} />)}
          </div>
        </section>

        <section className="glass rounded-lg p-5">
          <h2 className="font-semibold">Processing Jobs</h2>
          <div className="mt-4 space-y-3">
            {data.jobs.map((job: any) => (
              <div key={job.id} className="rounded-lg bg-white/5 p-3 text-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{job.tender?.title ?? job.type}</p>
                    <p className="mt-1 text-xs text-slate-500">{job.user?.email} · {job.status} · {job.progress}%</p>
                    {job.error && <p className="mt-2 text-xs text-rose-200">{job.error}</p>}
                  </div>
                  <button onClick={() => retryJob(job.id)} className="grid h-9 w-9 place-items-center rounded-lg bg-white/10 text-cyan-100" aria-label="Retry job"><RefreshCcw className="h-4 w-4" /></button>
                </div>
              </div>
            ))}
            {!data.jobs.length && <p className="text-sm text-slate-500">No processing jobs yet.</p>}
          </div>
        </section>
      </div>

      <section className="glass rounded-lg p-5">
        <h2 className="font-semibold">Audit Logs</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {data.logs.map((log: any) => (
            <div key={log.id} className="rounded-lg bg-white/5 p-3 text-sm">
              <p>{log.action}</p>
              <p className="mt-1 text-xs text-slate-500">{log.user?.email ?? 'system'} · {new Date(log.createdAt).toLocaleString()}</p>
            </div>
          ))}
          {!data.logs.length && <p className="text-sm text-slate-500">No audit logs yet.</p>}
        </div>
      </section>
    </div>
  );
}

function UserRow({ user, saving, onSave }: any) {
  const [role, setRole] = useState(user.role);
  const [plan, setPlan] = useState(user.plan);
  return (
    <div className="rounded-lg bg-white/5 p-3 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-medium">{user.name ?? 'Unnamed user'}</p>
          <p className="mt-1 text-xs text-slate-500">{user.email}</p>
        </div>
        <div className="flex items-center gap-2">
          <select value={role} onChange={event => setRole(event.target.value)} className="h-10 rounded-lg border border-white/10 bg-black/30 px-2">
            {['user', 'admin', 'owner'].map(item => <option key={item} value={item}>{item}</option>)}
          </select>
          <select value={plan} onChange={event => setPlan(event.target.value)} className="h-10 rounded-lg border border-white/10 bg-black/30 px-2">
            {['Free', 'Pro', 'Enterprise'].map(item => <option key={item} value={item}>{item}</option>)}
          </select>
          <button disabled={saving} onClick={() => onSave(user.id, role, plan)} className="grid h-10 w-10 place-items-center rounded-lg bg-cyanGlow text-white disabled:opacity-60" aria-label="Save user"><Save className="h-4 w-4" /></button>
        </div>
      </div>
    </div>
  );
}

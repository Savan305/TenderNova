'use client';

import type React from 'react';
import { useState } from 'react';
import { KeyRound, Lock, Save, Trash2 } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';

type SettingsData = {
  user: any;
  workspace: any;
  subscription: any;
  apiKeys: any[];
  notifications: any[];
};

export function SettingsClient({ initialData }: { initialData: SettingsData }) {
  const [data, setData] = useState(initialData);
  const [saving, setSaving] = useState('');
  const toast = useToast();
  const preferences = data.workspace?.preferences ?? {};
  const notificationPrefs = preferences.notifications ?? {};

  async function patch(section: string, body: Record<string, unknown>) {
    setSaving(section);
    try {
      const response = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ section, ...body })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? 'Settings update failed');
      setData(current => ({
        ...current,
        user: result.user ?? current.user,
        workspace: result.workspace ?? current.workspace,
        apiKeys: result.apiKey ? [result.apiKey, ...current.apiKeys] : current.apiKeys
      }));
      toast('Settings saved', 'success');
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Settings update failed', 'error');
    } finally {
      setSaving('');
    }
  }

  async function deleteKey(id: string) {
    const response = await fetch('/api/settings', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    });
    if (response.ok) {
      setData(current => ({ ...current, apiKeys: current.apiKeys.filter(key => key.id !== id) }));
      toast('API key removed', 'success');
    } else {
      toast('Could not remove API key', 'error');
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
        <aside className="glass rounded-lg p-5">
          <h2 className="font-semibold">Workspace Snapshot</h2>
          <div className="mt-4 space-y-3 text-sm text-slate-300">
            <p><span className="text-slate-500">User:</span> {data.user?.name ?? 'Not set'}</p>
            <p><span className="text-slate-500">Email:</span> {data.user?.email}</p>
            <p><span className="text-slate-500">Company:</span> {data.workspace?.name ?? data.user?.company ?? 'Not configured'}</p>
            <p><span className="text-slate-500">Plan:</span> {data.subscription?.plan ?? data.user?.plan ?? 'Free'}</p>
            <p><span className="text-slate-500">Role:</span> {data.user?.role ?? 'user'}</p>
          </div>
        </aside>

        <SettingsForm
          title="Profile Settings"
          actionLabel="Save Profile"
          loading={saving === 'profile'}
          fields={[
            { name: 'name', label: 'Name', defaultValue: data.user?.name },
            { name: 'company', label: 'Company', defaultValue: data.user?.company },
            { name: 'phone', label: 'Contact Phone', defaultValue: data.user?.phone },
            { name: 'region', label: 'Region', defaultValue: data.user?.region },
            { name: 'image', label: 'Profile Image URL', defaultValue: data.user?.image }
          ]}
          onSubmit={(values: Record<string, unknown>) => patch('profile', values)}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <SettingsForm
          title="Workspace Settings"
          actionLabel="Save Workspace"
          loading={saving === 'workspace'}
          fields={[
            { name: 'name', label: 'Workspace Name', defaultValue: data.workspace?.name ?? data.user?.company },
            { name: 'industry', label: 'Industry', defaultValue: data.workspace?.industry },
            { name: 'businessCategory', label: 'Business Category', defaultValue: data.workspace?.businessCategory },
            { name: 'teamSize', label: 'Team Size', defaultValue: data.workspace?.teamSize },
            { name: 'preferredTenderSize', label: 'Preferred Tender Size', defaultValue: data.workspace?.preferredTenderSize },
            { name: 'sectorPreference', label: 'Government/Private Preference', defaultValue: data.workspace?.sectorPreference },
            { name: 'capabilities', label: 'Capabilities (comma separated)', defaultValue: (data.workspace?.capabilities ?? []).join?.(', ') },
            { name: 'services', label: 'Services Offered (comma separated)', defaultValue: (data.workspace?.services ?? []).join?.(', ') }
          ]}
          onSubmit={(values: Record<string, unknown>) => patch('workspace', values)}
        />

        <SettingsForm
          title="AI Settings"
          actionLabel="Save AI Preferences"
          loading={saving === 'ai'}
          fields={[
            { name: 'aiModel', label: 'AI Model', defaultValue: preferences.aiModel ?? 'mistral-large-latest' },
            { name: 'proposalTone', label: 'Proposal Tone', defaultValue: preferences.proposalTone ?? 'Professional' },
            { name: 'riskSensitivity', label: 'Risk Sensitivity', defaultValue: preferences.riskSensitivity ?? 'Balanced' },
            { name: 'creativityLevel', label: 'Creativity Level (0-100)', defaultValue: preferences.creativityLevel ?? 40, type: 'number' }
          ]}
          onSubmit={(values: Record<string, unknown>) => patch('ai', values)}
        />

        <SettingsForm
          title="Notifications"
          actionLabel="Save Notifications"
          loading={saving === 'notifications'}
          fields={[
            { name: 'emailAlerts', label: 'Email Alerts', defaultValue: notificationPrefs.emailAlerts ?? true, type: 'checkbox' },
            { name: 'tenderAlerts', label: 'Tender Alerts', defaultValue: notificationPrefs.tenderAlerts ?? true, type: 'checkbox' },
            { name: 'deadlineReminders', label: 'Deadline Reminders', defaultValue: notificationPrefs.deadlineReminders ?? true, type: 'checkbox' },
            { name: 'proposalCompletionAlerts', label: 'Proposal Completion Alerts', defaultValue: notificationPrefs.proposalCompletionAlerts ?? true, type: 'checkbox' }
          ]}
          onSubmit={(values: Record<string, unknown>) => patch('notifications', values)}
        />

        <SettingsForm
          title="Security"
          icon={<Lock className="h-4 w-4" />}
          actionLabel="Change Password"
          loading={saving === 'password'}
          fields={[
            { name: 'currentPassword', label: 'Current Password', type: 'password' },
            { name: 'nextPassword', label: 'New Password', type: 'password' }
          ]}
          onSubmit={(values: Record<string, unknown>) => patch('password', values)}
        />
      </div>

      <section className="glass rounded-lg p-5">
        <div className="flex items-center gap-2"><KeyRound className="h-4 w-4 text-cyan-200" /><h2 className="font-semibold">API & Integrations</h2></div>
        <SettingsForm
          compact
          title=""
          actionLabel="Add API Key"
          loading={saving === 'apiKey'}
          fields={[
            { name: 'provider', label: 'Provider', defaultValue: 'mistral' },
            { name: 'label', label: 'Label', defaultValue: 'Mistral Production' },
            { name: 'value', label: 'API Key', type: 'password' }
          ]}
          onSubmit={(values: Record<string, unknown>) => patch('apiKey', values)}
        />
        <div className="mt-4 grid gap-3">
          {data.apiKeys.length ? data.apiKeys.map(key => (
            <div key={key.id} className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2 text-sm">
              <span>{key.label} <span className="text-slate-500">({key.provider})</span></span>
              <button onClick={() => deleteKey(key.id)} className="grid h-9 w-9 place-items-center rounded-lg text-rose-200 hover:bg-roseGlow/10" aria-label="Delete API key"><Trash2 className="h-4 w-4" /></button>
            </div>
          )) : <p className="text-sm text-slate-500">No saved integration keys yet.</p>}
        </div>
      </section>
    </div>
  );
}

function SettingsForm({ title, fields, onSubmit, actionLabel, loading, compact, icon }: any) {
  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const values: Record<string, unknown> = {};
    for (const field of fields) {
      values[field.name] = field.type === 'checkbox' ? formData.get(field.name) === 'on' : formData.get(field.name);
    }
    onSubmit(values);
  }

  return (
    <form onSubmit={submit} className={compact ? 'mt-4 grid gap-3 md:grid-cols-3' : 'glass rounded-lg p-5'}>
      {title && <div className="mb-4 flex items-center gap-2">{icon}<h2 className="font-semibold">{title}</h2></div>}
      <div className={compact ? 'contents' : 'grid gap-3'}>
        {fields.map((field: any) => (
          <label key={field.name} className={field.type === 'checkbox' ? 'flex items-center gap-3 rounded-lg bg-white/5 px-3 py-3 text-sm' : 'grid gap-1 text-sm'}>
            <span className="text-slate-300">{field.label}</span>
            {field.type === 'checkbox' ? (
              <input name={field.name} type="checkbox" defaultChecked={Boolean(field.defaultValue)} className="h-4 w-4 accent-cyanGlow" />
            ) : (
              <input name={field.name} type={field.type ?? 'text'} defaultValue={field.defaultValue ?? ''} className="min-h-11 rounded-lg border border-white/10 bg-black/30 px-3 text-slate-100 outline-none focus:border-cyanGlow" />
            )}
          </label>
        ))}
      </div>
      <button disabled={loading} className={compact ? 'inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-cyanGlow px-4 font-semibold disabled:opacity-60' : 'mt-4 inline-flex items-center gap-2 rounded-lg bg-cyanGlow px-4 py-3 font-semibold disabled:opacity-60'}>
        <Save className="h-4 w-4" /> {loading ? 'Saving...' : actionLabel}
      </button>
    </form>
  );
}

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import bcrypt from 'bcryptjs';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: {
      workspaces: { orderBy: { createdAt: 'asc' }, take: 1 },
      subscriptions: { orderBy: { createdAt: 'desc' }, take: 1 },
      notifications: { orderBy: { createdAt: 'desc' }, take: 10 },
      apiKeys: { orderBy: { createdAt: 'desc' } }
    }
  });
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const { password, apiKeys, ...safeUser } = user;
  return NextResponse.json({
    user: safeUser,
    workspace: user.workspaces[0] ?? null,
    subscription: user.subscriptions[0] ?? { plan: user.plan, status: 'active', usage: null },
    apiKeys: apiKeys.map(key => ({ id: key.id, provider: key.provider, label: key.label, createdAt: key.createdAt })),
    notifications: user.notifications
  });
}

export async function PATCH(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { email: session.user.email }, include: { workspaces: { take: 1 } } });
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const body = await request.json();
  const section = String(body.section ?? '');

  if (section === 'profile') {
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        name: clean(body.name),
        company: clean(body.company),
        phone: clean(body.phone),
        region: clean(body.region),
        image: clean(body.image)
      }
    });
    await log(user.id, 'settings_profile_updated');
    return NextResponse.json({ ok: true, user: stripPassword(updated) });
  }

  if (section === 'workspace') {
    const workspace = await prisma.workspace.upsert({
      where: { id: user.workspaces[0]?.id ?? '__new_workspace__' },
      update: {
        name: clean(body.name) || user.company || 'TenderNova Workspace',
        industry: clean(body.industry),
        businessCategory: clean(body.businessCategory),
        teamSize: clean(body.teamSize),
        preferredTenderSize: clean(body.preferredTenderSize),
        sectorPreference: clean(body.sectorPreference),
        region: clean(body.region),
        capabilities: listFromText(body.capabilities),
        services: listFromText(body.services)
      },
      create: {
        userId: user.id,
        name: clean(body.name) || user.company || 'TenderNova Workspace',
        industry: clean(body.industry),
        businessCategory: clean(body.businessCategory),
        teamSize: clean(body.teamSize),
        preferredTenderSize: clean(body.preferredTenderSize),
        sectorPreference: clean(body.sectorPreference),
        region: clean(body.region),
        capabilities: listFromText(body.capabilities),
        services: listFromText(body.services)
      }
    });
    await log(user.id, 'settings_workspace_updated');
    return NextResponse.json({ ok: true, workspace });
  }

  if (section === 'ai') {
    const workspace = await ensureWorkspace(user.id, user.workspaces[0]?.id, user.company);
    const preferences = {
      ...(workspace.preferences as any ?? {}),
      aiModel: clean(body.aiModel) || 'mistral-large-latest',
      proposalTone: clean(body.proposalTone) || 'Professional',
      riskSensitivity: clean(body.riskSensitivity) || 'Balanced',
      creativityLevel: Number(body.creativityLevel ?? 40)
    };
    const updated = await prisma.workspace.update({ where: { id: workspace.id }, data: { preferences } });
    await log(user.id, 'settings_ai_updated');
    return NextResponse.json({ ok: true, workspace: updated });
  }

  if (section === 'notifications') {
    const workspace = await ensureWorkspace(user.id, user.workspaces[0]?.id, user.company);
    const preferences = {
      ...(workspace.preferences as any ?? {}),
      notifications: {
        emailAlerts: Boolean(body.emailAlerts),
        tenderAlerts: Boolean(body.tenderAlerts),
        deadlineReminders: Boolean(body.deadlineReminders),
        proposalCompletionAlerts: Boolean(body.proposalCompletionAlerts)
      }
    };
    const updated = await prisma.workspace.update({ where: { id: workspace.id }, data: { preferences } });
    await log(user.id, 'settings_notifications_updated');
    return NextResponse.json({ ok: true, workspace: updated });
  }

  if (section === 'apiKey') {
    const provider = clean(body.provider);
    const value = clean(body.value);
    if (!provider || !value) return NextResponse.json({ error: 'Provider and API key are required' }, { status: 400 });
    const apiKey = await prisma.apiKey.create({
      data: {
        userId: user.id,
        provider,
        label: clean(body.label) || provider,
        encryptedValue: Buffer.from(value).toString('base64')
      }
    });
    await log(user.id, 'settings_api_key_added', { provider });
    return NextResponse.json({ ok: true, apiKey: { id: apiKey.id, provider: apiKey.provider, label: apiKey.label, createdAt: apiKey.createdAt } });
  }

  if (section === 'password') {
    if (!user.password) return NextResponse.json({ error: 'Password is not enabled for OAuth-only accounts' }, { status: 400 });
    const currentPassword = String(body.currentPassword ?? '');
    const nextPassword = String(body.nextPassword ?? '');
    if (nextPassword.length < 8) return NextResponse.json({ error: 'New password must be at least 8 characters' }, { status: 400 });
    const ok = await bcrypt.compare(currentPassword, user.password);
    if (!ok) return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 });
    await prisma.user.update({ where: { id: user.id }, data: { password: await bcrypt.hash(nextPassword, 10) } });
    await log(user.id, 'settings_password_changed');
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Unknown settings section' }, { status: 400 });
}

export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const { id } = await request.json();
  const key = await prisma.apiKey.findFirst({ where: { id, userId: user.id } });
  if (!key) return NextResponse.json({ error: 'API key not found' }, { status: 404 });
  await prisma.apiKey.delete({ where: { id: key.id } });
  await log(user.id, 'settings_api_key_deleted', { provider: key.provider });
  return NextResponse.json({ ok: true });
}

function clean(value: unknown) {
  const text = String(value ?? '').trim();
  return text || null;
}

function listFromText(value: unknown) {
  return String(value ?? '')
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);
}

function stripPassword(user: any) {
  const { password, ...safeUser } = user;
  return safeUser;
}

async function ensureWorkspace(userId: string, workspaceId?: string, company?: string | null) {
  if (workspaceId) return prisma.workspace.findUniqueOrThrow({ where: { id: workspaceId } });
  return prisma.workspace.create({ data: { userId, name: company || 'TenderNova Workspace' } });
}

async function log(userId: string, action: string, metadata?: Record<string, unknown>) {
  await prisma.adminLog.create({ data: { userId, action, metadata: metadata as any } }).catch(() => undefined);
}

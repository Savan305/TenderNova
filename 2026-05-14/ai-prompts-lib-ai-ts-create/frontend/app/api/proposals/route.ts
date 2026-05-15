import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { generateProposal } from '@/lib/ai';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json([]);
  return NextResponse.json(await prisma.proposal.findMany({ where: { userId: user.id }, include: { tender: true }, orderBy: { createdAt: 'desc' } }));
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { tenderId } = await request.json();
  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  const tender = await prisma.tender.findUnique({ where: { id: tenderId } });
  if (!user || !tender) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const content = await generateProposal(tender.fileContent, tender.analysis);
  const proposal = await prisma.proposal.create({ data: { userId: user.id, tenderId: tender.id, title: `${tender.title} Proposal`, content } });
  return NextResponse.json(proposal);
}

export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id, title, content, status } = await request.json();
  const proposal = await prisma.proposal.update({ where: { id }, data: { title, content, status } });
  return NextResponse.json(proposal);
}

export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await request.json();
  await prisma.proposal.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

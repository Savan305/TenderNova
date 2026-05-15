import { NextRequest, NextResponse } from 'next/server';
import { analyzeTender } from '@/lib/ai';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { tenderId } = await request.json();
  const tender = await prisma.tender.findUnique({ where: { id: tenderId } });
  if (!tender) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const analysis = await analyzeTender(tender.fileContent);
  const updated = await prisma.tender.update({
    where: { id: tender.id },
    data: { analysis, status: 'analyzed', summary: analysis.summary, deadline: analysis.deadline ? new Date(analysis.deadline) : null, budget: analysis.budget, category: analysis.category, eligibility: analysis.eligibility, risks: analysis.risks, title: analysis.title || tender.title }
  });
  return NextResponse.json(updated);
}

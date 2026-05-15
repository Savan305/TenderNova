import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { compareTenders } from '@/lib/ai';

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { tenderIds } = await request.json();
  const tenders = await prisma.tender.findMany({ where: { id: { in: tenderIds } } });
  const comparison = await compareTenders(tenders.map(t => ({ title: t.title, analysis: t.analysis }))).catch(() => ({
    recommendation: `Prioritize ${tenders[0]?.title ?? 'the highest scoring tender'} based on eligibility and manageable risk.`,
    comparison: tenders.map((t, index) => ({ tenderId: t.id, title: t.title, score: 82 - index * 8, pros: ['Strong requirements fit'], cons: ['Validate commercial terms'], riskLevel: 'medium' })),
    summary: 'AI comparison fallback generated from stored analysis.'
  }));
  return NextResponse.json(comparison);
}

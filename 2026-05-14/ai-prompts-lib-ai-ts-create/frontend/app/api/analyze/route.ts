import { NextRequest, NextResponse } from 'next/server';
import { analyzeTender } from '@/lib/ai';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { tenderId } = await request.json();
  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
  const tender = await prisma.tender.findFirst({ where: { id: tenderId, userId: user.id } });
  if (!tender) return NextResponse.json({ error: 'Tender not found' }, { status: 404 });
  await prisma.tender.update({ where: { id: tender.id }, data: { status: 'ai_analyzing', errorMessage: null } });
  const analysis = await analyzeTender(tender.fileContent);
  const score = Number(analysis.eligibility?.score ?? analysis.successProbability ?? 0);
  const updated = await prisma.tender.update({
    where: { id: tender.id },
    data: {
      analysis,
      status: 'completed',
      summary: analysis.summary,
      deadline: analysis.deadline ? new Date(analysis.deadline) : null,
      budget: analysis.budget,
      category: analysis.category,
      eligibility: analysis.eligibility,
      risks: analysis.risks,
      title: analysis.title || tender.title,
      aiScore: score || null,
      successProbability: Number(analysis.successProbability ?? score) || null,
      qualityRating: analysis.qualityRating ?? (score >= 85 ? 'A' : score >= 70 ? 'B' : score >= 50 ? 'C' : 'D')
    }
  });
  await prisma.tenderAnalysis.create({
    data: {
      tenderId: tender.id,
      userId: user.id,
      result: analysis,
      confidence: Number(analysis.confidence ?? score) || null,
      explanation: analysis.explainability ?? analysis.summary
    }
  });
  return NextResponse.json(updated);
}

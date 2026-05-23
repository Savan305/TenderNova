import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { compareTenders } from '@/lib/ai';

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { tenderIds } = await request.json();
  if (!Array.isArray(tenderIds) || tenderIds.length < 2) return NextResponse.json({ error: 'Select at least two tenders' }, { status: 400 });
  const tenders = await prisma.tender.findMany({ where: { id: { in: tenderIds } } });
  if (tenders.length < 2) return NextResponse.json({ error: 'At least two valid tenders are required' }, { status: 400 });
  const comparison = await compareTenders(tenders.map(t => ({ title: t.title, analysis: t.analysis }))).catch(() => ({
    ...fallbackComparison(tenders),
  }));
  if (!comparison.winnerTenderId && Array.isArray(comparison.comparison)) {
    const winner = [...comparison.comparison].sort((a, b) => (b.score ?? 0) - (a.score ?? 0))[0];
    comparison.winnerTenderId = winner?.tenderId;
    comparison.winnerReason = winner ? `${winner.title} has the highest weighted score based on eligibility, risk, and opportunity fit.` : undefined;
  }
  return NextResponse.json(comparison);
}

function fallbackComparison(tenders: any[]) {
  const rows = tenders.map(t => {
    const eligibility = Number((t.eligibility as any)?.score ?? (t.analysis as any)?.eligibility?.score ?? 50);
    const risks = ((t.risks as any[]) ?? (t.analysis as any)?.risks ?? []) as any[];
    const highRiskPenalty = risks.filter(r => r.level === 'high').length * 15 + risks.filter(r => r.level === 'medium').length * 7;
    const deadlinePenalty = t.deadline ? Math.max(0, 20 - Math.ceil((new Date(t.deadline).getTime() - Date.now()) / 86400000)) : 5;
    const score = Math.max(0, Math.min(100, Math.round(eligibility - highRiskPenalty - deadlinePenalty + (t.budget ? 5 : 0))));
    return {
      tenderId: t.id,
      title: t.title,
      score,
      budgetFit: t.budget ? 75 : 55,
      winProbability: score,
      complexity: Math.min(100, 40 + risks.length * 12),
      timelineFit: Math.max(0, 100 - deadlinePenalty * 3),
      profitability: t.budget ? 70 : 50,
      eligibilityMatch: eligibility,
      pros: [`Eligibility score ${eligibility}`, t.budget ? 'Budget is identifiable' : 'Scope can be qualified during clarification'].filter(Boolean),
      cons: risks.length ? [`${risks.length} risk item(s) require review`] : ['Commercial assumptions still need validation'],
      riskLevel: risks.some(r => r.level === 'high') ? 'high' : risks.some(r => r.level === 'medium') ? 'medium' : 'low',
      costBenefitInsight: t.budget ? 'Budget visibility improves bid/no-bid confidence.' : 'Budget is unclear, so profitability must be validated before committing.'
    };
  });
  const winner = [...rows].sort((a, b) => b.score - a.score)[0];
  return {
    recommendation: `Prioritize ${winner.title} because it has the strongest weighted score across eligibility, timeline, risk, and commercial clarity.`,
    winnerTenderId: winner.tenderId,
    winnerReason: `${winner.title} leads with a score of ${winner.score}, driven by stronger eligibility fit and manageable risk.`,
    comparison: rows,
    summary: 'AI comparison fallback generated from stored analysis.'
  };
}

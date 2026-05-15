import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { TenderCard } from '@/components/tender/TenderCard';
import { FileText, Sparkles, Target, TrendingUp, Upload, type LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { DashboardCharts } from '@/components/dashboard/DashboardCharts';

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const user = await prisma.user.findUnique({ where: { email: session?.user?.email ?? '' }, include: { tenders: { orderBy: { createdAt: 'desc' }, take: 4 }, proposals: true } });
  const tenders = user?.tenders ?? [];
  const stats: { label: string; value: string | number; Icon: LucideIcon }[] = [
    { label: 'Total Tenders', value: user?.tenders.length ?? 0, Icon: FileText },
    { label: 'Active Bids', value: tenders.filter(t => t.status !== 'archived').length, Icon: Target },
    { label: 'Proposals Generated', value: user?.proposals.length ?? 0, Icon: Sparkles },
    { label: 'Success Rate', value: '68%', Icon: TrendingUp }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div><h1 className="text-3xl font-bold">Dashboard</h1><p className="mt-1 text-slate-400">Tender intelligence overview and next actions.</p></div>
        <Link href="/upload" className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-indigoGlow to-cyanGlow px-4 py-3 font-semibold"><Upload className="h-4 w-4" /> Upload tender</Link>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map(({ label, value, Icon }) => <div key={label} className="glass rounded-lg p-5"><Icon className="h-5 w-5 text-cyan-200" /><p className="mt-4 text-sm text-slate-400">{label}</p><p className="mt-1 text-3xl font-bold">{value}</p></div>)}
      </div>
      <DashboardCharts />
      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="glass rounded-lg p-5">
          <h2 className="font-semibold">Recent Tenders</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-slate-400"><tr><th className="py-3">Title</th><th>Status</th><th>Category</th><th>Deadline</th></tr></thead>
              <tbody>{tenders.map(t => <tr key={t.id} className="border-t border-white/10"><td className="py-3">{t.title}</td><td><span className="rounded-full bg-cyanGlow/15 px-2 py-1 text-xs text-cyan-200">{t.status}</span></td><td>{t.category ?? 'General'}</td><td>{t.deadline?.toLocaleDateString() ?? 'Open'}</td></tr>)}</tbody>
            </table>
          </div>
        </div>
        <div className="glass rounded-lg p-5"><h2 className="font-semibold">AI Insights</h2><div className="mt-4 space-y-3 text-sm text-slate-300"><p>Prioritize tenders with eligibility above 75 and no high-risk payment clauses.</p><p>Two active opportunities are suitable for rapid proposal generation.</p><p>Upload addenda as new versions before final bid review.</p></div></div>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">{tenders.map(tender => <TenderCard key={tender.id} tender={tender} />)}</div>
    </div>
  );
}

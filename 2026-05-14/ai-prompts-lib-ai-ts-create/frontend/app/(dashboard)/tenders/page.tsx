import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { TenderCard } from '@/components/tender/TenderCard';

export default async function TendersPage() {
  const session = await getServerSession(authOptions);
  const user = await prisma.user.findUnique({ where: { email: session?.user?.email ?? '' }, include: { tenders: { orderBy: { createdAt: 'desc' } } } });
  return (
    <div className="space-y-6">
      <div><h1 className="text-3xl font-bold">My Tenders</h1><p className="mt-1 text-slate-400">All uploaded and analyzed tender opportunities.</p></div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{(user?.tenders ?? []).map(tender => <TenderCard key={tender.id} tender={tender} />)}</div>
    </div>
  );
}

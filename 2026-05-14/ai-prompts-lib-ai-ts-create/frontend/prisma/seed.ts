import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';
import bcrypt from 'bcryptjs';

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set');
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const analyses = [
  {
    title: 'National Digital Health Records Platform',
    summary: 'A government tender for building a secure digital health records platform across public hospitals. The opportunity is technically strong but needs strict data protection, uptime, and implementation governance.',
    deadline: '2026-07-15',
    budget: '$1.8M - $2.4M',
    category: 'Healthcare IT',
    eligibility: { score: 86, criteria: ['ISO 27001 certification', 'Healthcare integration experience', '24/7 support desk', 'Minimum annual turnover of $2M'], met: ['Healthcare integration experience', '24/7 support desk', 'Turnover threshold likely met'], missing: ['Attach current ISO 27001 certificate'] },
    requirements: { documents: ['Company registration', 'Audited financials', 'ISO certificates', 'Technical proposal'], technical: ['FHIR-compatible APIs', 'Role-based access controls', '99.9% uptime SLA'], financial: ['Bid security deposit', 'Milestone-based pricing', 'Three-year support costs'] },
    risks: [{ level: 'medium', description: 'High uptime SLA may create service credit exposure.', clause: 'SLA 8.2' }, { level: 'low', description: 'Integration scope is clear but requires hospital-by-hospital rollout planning.', clause: 'Scope 3.1' }],
    keyDates: [{ event: 'Pre-bid meeting', date: '2026-06-01' }, { event: 'Submission deadline', date: '2026-07-15' }, { event: 'Technical presentation', date: '2026-08-02' }],
    estimatedBudget: '$1.8M - $2.4M'
  },
  {
    title: 'Smart City Traffic Analytics System',
    summary: 'A municipal tender for traffic sensor analytics, dashboarding, and incident prediction. The bid has excellent strategic value, though hardware integration and penalty clauses need close review.',
    deadline: '2026-06-30',
    budget: '$900K',
    category: 'Smart City',
    eligibility: { score: 78, criteria: ['Computer vision deployments', 'City-scale dashboard references', 'Local support team'], met: ['Dashboard references', 'Local support team'], missing: ['Document computer vision deployments with client letters'] },
    requirements: { documents: ['EMD receipt', 'Past performance certificates', 'Technical architecture', 'Project schedule'], technical: ['Video analytics', 'Congestion prediction', 'Open data APIs'], financial: ['Fixed price implementation', 'Annual maintenance quote', 'Performance guarantee'] },
    risks: [{ level: 'high', description: 'Liquidated damages begin after a short delivery grace period.', clause: 'Penalty 12.4' }, { level: 'medium', description: 'Third-party camera compatibility is broad and may expand integration effort.', clause: 'Technical 5.7' }],
    keyDates: [{ event: 'Clarification deadline', date: '2026-06-10' }, { event: 'Bid submission', date: '2026-06-30' }],
    estimatedBudget: '$850K - $1M'
  },
  {
    title: 'Renewable Energy Monitoring Portal',
    summary: 'A utility tender for monitoring solar and wind assets with operational reporting. The commercial structure is favorable and the technical requirements align well with analytics teams.',
    deadline: '2026-08-08',
    budget: '$650K - $800K',
    category: 'Energy',
    eligibility: { score: 91, criteria: ['Energy analytics experience', 'Cloud security controls', 'Five-year product roadmap'], met: ['Energy analytics experience', 'Cloud security controls', 'Product roadmap available'], missing: [] },
    requirements: { documents: ['Power of attorney', 'Tax clearance certificate', 'Cloud security statement'], technical: ['Asset telemetry ingestion', 'Alert rules engine', 'Executive reporting'], financial: ['Subscription pricing', 'Implementation services', 'Support escalation matrix'] },
    risks: [{ level: 'low', description: 'Payment milestones are balanced and tied to achievable acceptance events.', clause: 'Payments 9.1' }],
    keyDates: [{ event: 'Site visit', date: '2026-06-18' }, { event: 'Submission deadline', date: '2026-08-08' }],
    estimatedBudget: '$650K - $800K'
  }
];

async function main() {
  const email = 'demo@tendernova.ai';
  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: { email, name: 'Demo Bid Team', password: await bcrypt.hash('password123', 10), plan: 'Pro' }
  });

  for (const analysis of analyses) {
    const tender = await prisma.tender.upsert({
      where: { id: analysis.title.toLowerCase().replaceAll(' ', '-') },
      update: {},
      create: {
        id: analysis.title.toLowerCase().replaceAll(' ', '-'),
        userId: user.id,
        title: analysis.title,
        fileName: `${analysis.title}.pdf`,
        fileContent: `${analysis.title}\n${analysis.summary}\nRequirements: ${JSON.stringify(analysis.requirements)}`,
        status: 'analyzed',
        summary: analysis.summary,
        deadline: new Date(analysis.deadline),
        budget: analysis.budget,
        category: analysis.category,
        analysis,
        eligibility: analysis.eligibility,
        risks: analysis.risks
      }
    });

    await prisma.proposal.upsert({
      where: { id: `${tender.id}-proposal` },
      update: {},
      create: {
        id: `${tender.id}-proposal`,
        userId: user.id,
        tenderId: tender.id,
        title: `${analysis.title} Proposal`,
        status: 'draft',
        content: `# ${analysis.title} Proposal\n\n## Executive Summary\nWe propose a focused, compliant delivery approach for ${analysis.title}.\n\n## Company Overview\n[Insert company profile, certifications, and relevant client references.]\n\n## Technical Approach\nOur approach aligns to the tender requirements and emphasizes delivery governance, security, and measurable outcomes.\n\n## Team & Qualifications\n[Insert named team, certifications, and project references.]\n\n## Timeline\nMobilization, implementation, acceptance testing, and support will follow the tender milestones.\n\n## Pricing Strategy\nPricing will be transparent, milestone based, and aligned with the buyer's acceptance criteria.\n\n## Why Choose Us\nWe combine domain expertise, rapid delivery practices, and strong post-award support.`
      }
    });
  }
}

main().finally(async () => prisma.$disconnect());

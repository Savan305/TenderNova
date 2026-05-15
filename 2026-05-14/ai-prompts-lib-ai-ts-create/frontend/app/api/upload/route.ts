import { NextRequest, NextResponse } from 'next/server';
import { extractTextFromPDF } from '@/lib/pdf-parser';
import { analyzeTender } from '@/lib/ai';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const MAX_PDF_BYTES = 200 * 1024 * 1024 * 1024;

export const runtime = 'nodejs';
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const formData = await request.formData();
    const file = formData.get('file') as File;
    if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 });
    if (file.type !== 'application/pdf' || file.size > MAX_PDF_BYTES) return NextResponse.json({ error: 'Invalid file' }, { status: 400 });

    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    let text: string;
    try {
      const buffer = Buffer.from(await file.arrayBuffer());
      text = await extractTextFromPDF(buffer);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not read PDF text';
      return NextResponse.json({ error: `PDF text extraction failed: ${message}` }, { status: 400 });
    }

    const tender = await prisma.tender.create({
      data: { userId: user.id, title: file.name.replace(/\.pdf$/i, ''), fileName: file.name, fileContent: text, status: 'analyzing' }
    });

    analyzeTender(text).then(async analysis => {
      await prisma.tender.update({
        where: { id: tender.id },
        data: {
          analysis,
          status: 'analyzed',
          summary: analysis.summary,
          deadline: analysis.deadline ? new Date(analysis.deadline) : null,
          budget: analysis.budget,
          category: analysis.category,
          eligibility: analysis.eligibility,
          risks: analysis.risks,
          title: analysis.title || tender.title
        }
      });
    }).catch(async error => {
      console.error(error);
      await prisma.tender.update({ where: { id: tender.id }, data: { status: 'analysis_failed' } }).catch(console.error);
    });

    return NextResponse.json({ id: tender.id, status: 'analyzing' });
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : 'Upload failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

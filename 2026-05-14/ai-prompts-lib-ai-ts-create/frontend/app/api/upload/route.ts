import { NextRequest, NextResponse } from 'next/server';
import { detectDocumentType, extractTextFromDocument } from '@/lib/document-parser';
import { analyzeTender } from '@/lib/ai';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const MAX_DOCUMENT_BYTES = 200 * 1024 * 1024 * 1024;

export const runtime = 'nodejs';
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const formData = await request.formData();
    const files = formData.getAll('files').filter((value): value is File => value instanceof File);
    const legacyFile = formData.get('file');
    if (legacyFile instanceof File && files.length === 0) files.push(legacyFile);
    if (files.length === 0) return NextResponse.json({ error: 'No file' }, { status: 400 });

    const items = [];
    const failures = [];

    for (const file of files) {
      const type = detectDocumentType(file.name, file.type);
      if (!type || file.size > MAX_DOCUMENT_BYTES) {
        failures.push({ fileName: file.name, error: 'Invalid file. Upload PDF, DOCX, or TXT.' });
        continue;
      }

      try {
        const buffer = Buffer.from(await file.arrayBuffer());
        const { text } = await extractTextFromDocument(buffer, file.name, file.type);
        const tender = await prisma.tender.create({
          data: {
            userId: user.id,
            title: file.name.replace(/\.(pdf|docx|txt)$/i, ''),
            fileName: file.name,
            fileContent: text,
            status: 'analyzing'
          }
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

        items.push({ id: tender.id, fileName: file.name, status: tender.status });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Could not extract document text';
        failures.push({ fileName: file.name, error: message });
      }
    }

    if (items.length === 0) return NextResponse.json({ error: failures.map(f => `${f.fileName}: ${f.error}`).join(' | ') }, { status: 400 });

    return NextResponse.json({
      id: items[0].id,
      status: items.length === 1 ? items[0].status : 'batch_uploaded',
      items,
      failures,
      warning: failures.length ? `${failures.length} file(s) could not be processed.` : undefined
    });
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : 'Upload failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

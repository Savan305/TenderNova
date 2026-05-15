import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { streamTenderChat } from '@backend/ai';

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return new Response('Unauthorized', { status: 401 });

  const { tenderId, messages } = await request.json();
  const tender = await prisma.tender.findUnique({ where: { id: tenderId } });
  if (!tender) return new Response('Not found', { status: 404 });

  const readable = await streamTenderChat(messages, tender.fileContent);
  return new Response(readable, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}

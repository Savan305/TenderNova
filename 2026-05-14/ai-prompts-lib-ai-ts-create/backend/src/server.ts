import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import multer from 'multer';
import { analyzeTender, compareTenders, generateProposal, streamTenderChat } from './ai';
import { extractTextFromPDF } from './pdf-parser';
import { prisma } from './prisma';

const MAX_PDF_BYTES = 200 * 1024 * 1024 * 1024;

const app = express();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_PDF_BYTES },
  fileFilter: (_req, file, cb) => {
    cb(null, file.mimetype === 'application/pdf');
  }
});

app.use(cors({ origin: process.env.FRONTEND_URL ?? 'http://localhost:3000' }));
app.use(express.json({ limit: '2mb' }));

async function currentUser(req: express.Request) {
  const email = String(req.header('x-user-email') || process.env.DEMO_USER_EMAIL || 'demo@tendernova.ai').toLowerCase();
  return prisma.user.findUnique({ where: { email } });
}

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'TenderNova API' });
});

app.get('/', (_req, res) => {
  res.json({
    ok: true,
    service: 'TenderNova API',
    health: '/health',
    frontend: process.env.FRONTEND_URL ?? 'http://localhost:3000'
  });
});

app.get('/api/tenders', async (req, res, next) => {
  try {
    const user = await currentUser(req);
    if (!user) return res.status(404).json({ error: 'User not found' });
    const page = Number(req.query.page ?? 1);
    const take = Number(req.query.take ?? 20);
    const [items, total] = await Promise.all([
      prisma.tender.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'desc' }, skip: (page - 1) * take, take }),
      prisma.tender.count({ where: { userId: user.id } })
    ]);
    res.json({ items, total, page, take });
  } catch (error) {
    next(error);
  }
});

app.get('/api/tenders/:id', async (req, res, next) => {
  try {
    const tender = await prisma.tender.findUnique({ where: { id: req.params.id } });
    if (!tender) return res.status(404).json({ error: 'Not found' });
    res.json(tender);
  } catch (error) {
    next(error);
  }
});

app.post('/api/upload', upload.single('file'), async (req, res, next) => {
  try {
    const user = await currentUser(req);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (!req.file) return res.status(400).json({ error: 'PDF file is required' });

    let text: string;
    try {
      text = await extractTextFromPDF(req.file.buffer);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not read PDF text';
      return res.status(400).json({ error: `PDF text extraction failed: ${message}` });
    }

    const tender = await prisma.tender.create({
      data: {
        userId: user.id,
        title: req.file.originalname.replace(/\.pdf$/i, ''),
        fileName: req.file.originalname,
        fileContent: text,
        status: 'analyzing'
      }
    });

    void analyzeTender(text).then(async analysis => {
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

    res.status(202).json({ id: tender.id, status: tender.status });
  } catch (error) {
    next(error);
  }
});

app.post('/api/analyze', async (req, res, next) => {
  try {
    const tender = await prisma.tender.findUnique({ where: { id: req.body.tenderId } });
    if (!tender) return res.status(404).json({ error: 'Not found' });
    const analysis = await analyzeTender(tender.fileContent);
    const updated = await prisma.tender.update({
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
    res.json(updated);
  } catch (error) {
    next(error);
  }
});

app.get('/api/proposals', async (req, res, next) => {
  try {
    const user = await currentUser(req);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(await prisma.proposal.findMany({ where: { userId: user.id }, include: { tender: true }, orderBy: { createdAt: 'desc' } }));
  } catch (error) {
    next(error);
  }
});

app.post('/api/proposals', async (req, res, next) => {
  try {
    const user = await currentUser(req);
    const tender = await prisma.tender.findUnique({ where: { id: req.body.tenderId } });
    if (!user || !tender) return res.status(404).json({ error: 'Not found' });
    const content = await generateProposal(tender.fileContent, tender.analysis);
    const proposal = await prisma.proposal.create({
      data: { userId: user.id, tenderId: tender.id, title: `${tender.title} Proposal`, content }
    });
    res.status(201).json(proposal);
  } catch (error) {
    next(error);
  }
});

app.put('/api/proposals/:id', async (req, res, next) => {
  try {
    const proposal = await prisma.proposal.update({
      where: { id: req.params.id },
      data: { title: req.body.title, content: req.body.content, status: req.body.status }
    });
    res.json(proposal);
  } catch (error) {
    next(error);
  }
});

app.post('/api/compare', async (req, res, next) => {
  try {
    const tenders = await prisma.tender.findMany({ where: { id: { in: req.body.tenderIds ?? [] } } });
    if (tenders.length < 2) return res.status(400).json({ error: 'Select at least two tenders' });
    res.json(await compareTenders(tenders.map(t => ({ title: t.title, analysis: t.analysis }))));
  } catch (error) {
    next(error);
  }
});

app.post('/api/chat', async (req, res, next) => {
  try {
    const tender = await prisma.tender.findUnique({ where: { id: req.body.tenderId } });
    if (!tender) return res.status(404).send('Not found');

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    const stream = await streamTenderChat(req.body.messages, tender.fileContent);
    const reader = stream.getReader();
    const decoder = new TextDecoder();
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      res.write(decoder.decode(value));
    }
    res.end();
  } catch (error) {
    next(error);
  }
});

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(error);
  res.status(500).json({ error: error instanceof Error ? error.message : 'Internal server error' });
});

const port = Number(process.env.PORT ?? 4000);
app.listen(port, () => {
  console.log(`TenderNova backend running on http://localhost:${port}`);
});

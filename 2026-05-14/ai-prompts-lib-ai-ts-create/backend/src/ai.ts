import 'dotenv/config';
import Anthropic from '@anthropic-ai/sdk';

type ChatMessage = { role: string; content: string };
type TenderForComparison = {
  id: string;
  title: string;
  summary?: string | null;
  budget?: string | null;
  deadline?: string | Date | null;
  category?: string | null;
  analysis: any;
  scorecard?: Record<string, unknown>;
};

const provider = (process.env.AI_PROVIDER ?? 'anthropic').toLowerCase();
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-20250514';
const MISTRAL_MODEL = process.env.MISTRAL_MODEL ?? 'mistral-large-latest';
const MISTRAL_API_URL = process.env.MISTRAL_API_URL ?? 'https://api.mistral.ai/v1/chat/completions';

function anthropicClient() {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY is not set. Set AI_PROVIDER="mistral" to use Mistral instead.');
  }
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

function anthropicText(response: any) {
  const content = response.content[0];
  if (content.type !== 'text') throw new Error('Invalid response');
  return content.text;
}

async function mistralComplete(messages: ChatMessage[], maxTokens: number, system?: string) {
  const apiKey = process.env.MISTRAL_API_KEY;
  if (!apiKey) throw new Error('MISTRAL_API_KEY is not set');

  const response = await fetch(MISTRAL_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: MISTRAL_MODEL,
      max_tokens: maxTokens,
      messages: [
        ...(system ? [{ role: 'system', content: system }] : []),
        ...messages.map(m => ({ role: m.role, content: m.content }))
      ]
    })
  });

  if (!response.ok) throw new Error(`Mistral API error: ${response.status} ${await response.text()}`);
  const data = await response.json();
  return data.choices?.[0]?.message?.content ?? '';
}

async function completeText(messages: ChatMessage[], maxTokens: number, system?: string) {
  if (provider === 'mistral') return mistralComplete(messages, maxTokens, system);

  const response = await anthropicClient().messages.create({
    model: ANTHROPIC_MODEL,
    max_tokens: maxTokens,
    ...(system ? { system } : {}),
    messages: messages.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }))
  });
  return anthropicText(response);
}

function parseJsonResponse(text: string) {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced?.[1]?.trim() ?? trimmed;

  try {
    return JSON.parse(candidate);
  } catch {
    const start = candidate.indexOf('{');
    const end = candidate.lastIndexOf('}');
    if (start >= 0 && end > start) return JSON.parse(candidate.slice(start, end + 1));
    throw new Error('AI returned invalid JSON');
  }
}

export async function streamTenderChat(messages: ChatMessage[], tenderText: string) {
  const system = `You are TenderNova AI, a professional tender intelligence assistant for procurement and bid teams. Be concise, business-focused, analytical, and grounded in the uploaded tender. Help with eligibility, compliance, risks, proposal strategy, deadlines, required documents, and government tender terminology. Reference relevant clauses or document snippets when possible. Tender: ${tenderText.slice(0, 6000)}`;

  if (provider === 'mistral') {
    const apiKey = process.env.MISTRAL_API_KEY;
    if (!apiKey) throw new Error('MISTRAL_API_KEY is not set');
    const response = await fetch(MISTRAL_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: MISTRAL_MODEL,
        max_tokens: 1000,
        stream: true,
        messages: [{ role: 'system', content: system }, ...messages]
      })
    });
    if (!response.ok || !response.body) throw new Error(`Mistral API error: ${response.status} ${await response.text()}`);
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    const encoder = new TextEncoder();
    return new ReadableStream({
      async start(controller) {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value);
          const text = chunk
            .split('\n')
            .filter(line => line.startsWith('data: ') && line !== 'data: [DONE]')
            .map(line => {
              try {
                return JSON.parse(line.slice(6)).choices?.[0]?.delta?.content ?? '';
              } catch {
                return '';
              }
            })
            .join('');
          if (text) controller.enqueue(encoder.encode(text));
        }
        controller.close();
      }
    });
  }

  const stream = await anthropicClient().messages.create({
    model: ANTHROPIC_MODEL,
    max_tokens: 1000,
    stream: true,
    system,
    messages: messages.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }))
  });

  const encoder = new TextEncoder();
  return new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
          controller.enqueue(encoder.encode(chunk.delta.text));
        }
      }
      controller.close();
    }
  });
}

export async function analyzeTender(text: string) {
  const content = await completeText([{
    role: 'user',
    content: `Analyze this tender document and return ONLY valid JSON (no markdown):
{
  "title": "tender title",
  "summary": "2-3 sentence summary",
  "deadline": "deadline date or null",
  "budget": "budget amount or null",
  "category": "category type",
  "eligibility": {
    "score": 0-100,
    "criteria": ["list of requirements"],
    "met": ["requirements likely met"],
    "missing": ["requirements to address"]
  },
  "requirements": {
    "documents": ["required documents"],
    "technical": ["technical requirements"],
    "financial": ["financial requirements"]
  },
  "risks": [
    {"level": "high|medium|low", "description": "risk description", "clause": "relevant clause"}
  ],
  "keyDates": [{"event": "name", "date": "date"}],
  "estimatedBudget": "budget range if extractable",
  "successProbability": 0-100,
  "opportunityScore": 0-100,
  "qualityRating": "A|B|C|D",
  "weaknesses": ["specific bid weaknesses"],
  "improvementSuggestions": ["specific actions to improve win chances"],
  "confidence": 0-100,
  "explainability": "brief explanation of score and key drivers"
}
Tender text: ${text.slice(0, 8000)}`
  }], 2000);
  return parseJsonResponse(content);
}

export async function generateProposal(tenderText: string, analysis: any) {
  return completeText([{
    role: 'user',
    content: `Generate a professional tender proposal based on this tender.
Analysis: ${JSON.stringify(analysis)}
Tender excerpt: ${tenderText.slice(0, 4000)}
Write a complete, professional proposal with: Executive Summary, Company Overview placeholder, Technical Approach, Team & Qualifications placeholder, Timeline, Pricing Strategy, Why Choose Us. Use markdown formatting.`
  }], 3000);
}

export async function chatWithTender(messages: ChatMessage[], tenderText: string) {
  const system = `You are TenderNova AI, an expert tender analysis assistant for bid managers. Answer in a professional, concise, business-oriented tone. Use the tender document context, maintain continuity with prior messages, explain risks and eligibility clearly, and cite relevant clauses or text snippets when available. Tender document: ${tenderText.slice(0, 6000)}`;
  return completeText(messages, 1000, system);
}

export async function compareTenders(tenders: TenderForComparison[]) {
  const content = await completeText([{
    role: 'user',
    content: `Compare these tenders using their provided ids and scorecards. Return ONLY valid JSON. Each comparison row must be specific to that tender, with unique pros, cons, and business reasoning:
{
  "recommendation": "which tender to prioritize and why",
  "winnerTenderId": "id",
  "winnerReason": "business explanation of why this tender wins",
  "comparison": [
    {
      "tenderId": "id",
      "title": "title", 
      "score": 0-100,
      "budgetFit": 0-100,
      "winProbability": 0-100,
      "complexity": 0-100,
      "timelineFit": 0-100,
      "profitability": 0-100,
      "eligibilityMatch": 0-100,
      "pros": ["list"],
      "cons": ["list"],
      "riskLevel": "high|medium|low",
      "costBenefitInsight": "specific insight"
    }
  ],
  "summary": "overall comparison summary"
}
Tenders: ${JSON.stringify(tenders)}`
  }], 2000);
  return parseJsonResponse(content);
}

import 'dotenv/config';
import Anthropic from '@anthropic-ai/sdk';

type ChatMessage = { role: string; content: string };

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

export async function streamTenderChat(messages: ChatMessage[], tenderText: string) {
  const system = `You are TenderNova AI assistant. Answer questions about this tender document concisely and accurately. Tender: ${tenderText.slice(0, 6000)}`;

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
  "estimatedBudget": "budget range if extractable"
}
Tender text: ${text.slice(0, 8000)}`
  }], 2000);
  return JSON.parse(content);
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
  const system = `You are TenderNova AI, an expert tender analysis assistant. You have access to this tender document. Answer questions accurately and concisely. Tender document: ${tenderText.slice(0, 6000)}`;
  return completeText(messages, 1000, system);
}

export async function compareTenders(tenders: {title: string, analysis: any}[]) {
  const content = await completeText([{
    role: 'user',
    content: `Compare these tenders and return ONLY valid JSON:
{
  "recommendation": "which tender to prioritize and why",
  "comparison": [
    {
      "tenderId": "id",
      "title": "title", 
      "score": 0-100,
      "pros": ["list"],
      "cons": ["list"],
      "riskLevel": "high|medium|low"
    }
  ],
  "summary": "overall comparison summary"
}
Tenders: ${JSON.stringify(tenders)}`
  }], 2000);
  return JSON.parse(content);
}

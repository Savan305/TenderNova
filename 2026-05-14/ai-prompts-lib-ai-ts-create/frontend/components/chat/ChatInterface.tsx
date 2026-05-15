'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import { Send } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';

type Message = { role: 'user' | 'assistant'; content: string; createdAt: Date };

const suggestions = ['What is the deadline?', 'What certifications needed?', 'Summarize payment terms', 'What are the main risks?'];

export function ChatInterface({ tenders }: { tenders: any[] }) {
  const [selected, setSelected] = useState(tenders[0]?.id ?? '');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  const toast = useToast();

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  async function submit(value = input) {
    if (!value.trim() || !selected || loading) return;
    const nextMessages: Message[] = [...messages, { role: 'user', content: value, createdAt: new Date() }];
    setMessages([...nextMessages, { role: 'assistant', content: '', createdAt: new Date() }]);
    setInput('');
    setLoading(true);
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenderId: selected, messages: nextMessages.map(({ role, content }) => ({ role, content })) })
      });
      if (!response.ok || !response.body) throw new Error(await response.text());
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { value: chunk, done } = await reader.read();
        if (done) break;
        const text = decoder.decode(chunk);
        setMessages(current => current.map((m, index) => index === current.length - 1 ? { ...m, content: m.content + text } : m));
      }
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Chat failed', 'error');
    } finally {
      setLoading(false);
    }
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    void submit();
  }

  return (
    <div className="grid h-[calc(100vh-7rem)] overflow-hidden rounded-lg border border-white/10 bg-white/[0.03] lg:grid-cols-[300px_1fr]">
      <aside className="border-b border-white/10 p-4 lg:border-b-0 lg:border-r">
        <p className="mb-3 text-sm font-semibold text-slate-300">Tenders</p>
        <div className="space-y-2">
          {tenders.map(tender => (
            <button key={tender.id} onClick={() => setSelected(tender.id)} className={`w-full rounded-lg p-3 text-left text-sm ${selected === tender.id ? 'bg-cyanGlow/20 text-white' : 'bg-white/5 text-slate-300 hover:bg-white/10'}`}>
              {tender.title}
            </button>
          ))}
        </div>
      </aside>
      <section className="flex min-h-0 flex-col">
        <div ref={scroller} className="flex-1 space-y-4 overflow-y-auto p-4">
          {messages.length === 0 && <div className="grid h-full place-items-center text-center text-slate-400">Select a tender and ask TenderNova AI anything about it.</div>}
          {messages.map((message, index) => (
            <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[78%] rounded-lg px-4 py-3 ${message.role === 'user' ? 'bg-indigoGlow text-white' : 'glass'}`}>
                <p className="whitespace-pre-wrap text-sm">{message.content || (loading ? 'Typing...' : '')}</p>
                <p className="mt-2 text-[11px] text-slate-300">{message.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="border-t border-white/10 p-4">
          <div className="mb-3 flex flex-wrap gap-2">
            {suggestions.map(suggestion => <button key={suggestion} onClick={() => submit(suggestion)} className="rounded-full bg-white/8 px-3 py-1.5 text-xs text-slate-200 hover:bg-white/15">{suggestion}</button>)}
          </div>
          <form onSubmit={onSubmit} className="flex gap-3">
            <input value={input} onChange={event => setInput(event.target.value)} className="min-w-0 flex-1 rounded-lg border border-white/10 bg-white/5 px-4 py-3 outline-none focus:border-cyanGlow" placeholder="Ask about the selected tender..." />
            <button className="grid h-12 w-12 place-items-center rounded-lg bg-gradient-to-br from-indigoGlow to-cyanGlow" aria-label="Send"><Send className="h-5 w-5" /></button>
          </form>
        </div>
      </section>
    </div>
  );
}

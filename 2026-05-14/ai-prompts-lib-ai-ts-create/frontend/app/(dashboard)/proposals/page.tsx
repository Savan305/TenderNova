'use client';

import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Download, Edit3, Eye, Save, Sparkles } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';

export default function ProposalsPage() {
  const [proposals, setProposals] = useState<any[]>([]);
  const [tenders, setTenders] = useState<any[]>([]);
  const [tenderId, setTenderId] = useState('');
  const [selected, setSelected] = useState<any>(null);
  const [editing, setEditing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const toast = useToast();

  useEffect(() => {
    fetch('/api/proposals').then(r => r.json()).then(setProposals);
    fetch('/api/tenders?take=100').then(r => r.json()).then(data => setTenders(data.items ?? []));
  }, []);

  async function generate() {
    if (!tenderId) return toast('Select a tender first', 'error');
    setGenerating(true);
    try {
      const response = await fetch('/api/proposals', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tenderId }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'Proposal generation failed');
      setProposals(current => [data, ...current]);
      setSelected(data);
      toast('Proposal generated from tender analysis', 'success');
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Proposal generation failed', 'error');
    } finally {
      setGenerating(false);
    }
  }

  async function save() {
    const response = await fetch('/api/proposals', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(selected) });
    if (response.ok) {
      toast('Proposal saved', 'success');
      setEditing(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4"><div><h1 className="text-3xl font-bold">AI Proposals</h1><p className="mt-1 text-slate-400">Create, edit, review, and print generated proposals.</p></div><button onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-4 py-3"><Download className="h-4 w-4" /> Download as PDF</button></div>
      <div className="glass flex flex-wrap items-center gap-3 rounded-lg p-4">
        <select value={tenderId} onChange={event => setTenderId(event.target.value)} className="min-h-11 min-w-[260px] flex-1 rounded-lg border border-white/10 bg-black/30 px-3 text-sm outline-none focus:border-cyanGlow">
          <option value="">Select tender to generate proposal</option>
          {tenders.map(tender => <option key={tender.id} value={tender.id}>{tender.title}</option>)}
        </select>
        <button disabled={generating} onClick={generate} className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-indigoGlow to-cyanGlow px-4 py-3 font-semibold disabled:opacity-60"><Sparkles className="h-4 w-4" /> {generating ? 'Generating...' : 'Generate Proposal'}</button>
      </div>
      <div className="grid gap-5 xl:grid-cols-[380px_1fr]">
        <div className="grid gap-4">
          {!proposals.length && <div className="glass rounded-lg p-5 text-sm text-slate-400">No proposals yet. Select a tender above and generate a real AI proposal.</div>}
          {proposals.map(proposal => (
            <button key={proposal.id} onClick={() => { setSelected(proposal); setEditing(false); }} className="glass rounded-lg p-5 text-left transition hover:glow-cyan">
              <div className="flex items-start justify-between gap-3"><Sparkles className="h-5 w-5 text-cyan-200" /><span className="rounded-full bg-white/10 px-2 py-1 text-xs capitalize">{proposal.status}</span></div>
              <h2 className="mt-4 line-clamp-2 font-semibold">{proposal.title}</h2>
              <p className="mt-2 text-xs text-slate-400">{new Date(proposal.createdAt).toLocaleDateString()}</p>
              <div className="mt-4 flex gap-2 text-xs text-slate-300"><span className="inline-flex items-center gap-1"><Eye className="h-3 w-3" /> View</span><span className="inline-flex items-center gap-1"><Edit3 className="h-3 w-3" /> Edit</span></div>
            </button>
          ))}
        </div>
        <div className="glass min-h-[640px] rounded-lg p-6">
          {!selected ? <div className="grid h-full place-items-center text-slate-400">Select a proposal to preview.</div> : (
            <div>
              <div className="mb-5 flex justify-end gap-2"><button onClick={() => setEditing(v => !v)} className="rounded-lg bg-white/10 px-3 py-2 text-sm">Edit</button>{editing && <button onClick={save} className="inline-flex items-center gap-2 rounded-lg bg-cyanGlow px-3 py-2 text-sm font-semibold"><Save className="h-4 w-4" /> Save</button>}</div>
              {editing ? <textarea value={selected.content} onChange={event => setSelected({ ...selected, content: event.target.value })} className="min-h-[560px] w-full rounded-lg border border-white/10 bg-black/30 p-4 outline-none focus:border-cyanGlow" /> : <article className="prose prose-invert max-w-none"><ReactMarkdown>{selected.content}</ReactMarkdown></article>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

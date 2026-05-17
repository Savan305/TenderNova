'use client';

import { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';

const roles = ['Bid Manager', 'Founder', 'Sales Lead', 'Proposal Writer', 'Consultant'];
const industries = ['IT Services', 'Construction', 'Healthcare', 'Energy', 'Smart City', 'Government Services'];

export default function OnboardingPage() {
  const [role, setRole] = useState(roles[0]);
  const [industry, setIndustry] = useState(industries[0]);
  const [company, setCompany] = useState('');
  const toast = useToast();

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Workspace Onboarding</h1>
        <p className="mt-1 text-slate-400">Tune TenderNova recommendations around your team, market, and bid workflow.</p>
      </div>
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="glass rounded-lg p-6">
          <div className="grid gap-5">
            <label>
              <span className="text-sm text-slate-300">Company</span>
              <input value={company} onChange={event => setCompany(event.target.value)} className="mt-2 w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 outline-none focus:border-cyanGlow" placeholder="Your company name" />
            </label>
            <div>
              <span className="text-sm text-slate-300">Your role</span>
              <div className="mt-2 flex flex-wrap gap-2">{roles.map(item => <button key={item} onClick={() => setRole(item)} className={`rounded-lg px-3 py-2 text-sm ${role === item ? 'bg-cyanGlow text-white' : 'bg-white/10 text-slate-300'}`}>{item}</button>)}</div>
            </div>
            <div>
              <span className="text-sm text-slate-300">Primary industry</span>
              <div className="mt-2 flex flex-wrap gap-2">{industries.map(item => <button key={item} onClick={() => setIndustry(item)} className={`rounded-lg px-3 py-2 text-sm ${industry === item ? 'bg-indigoGlow text-white' : 'bg-white/10 text-slate-300'}`}>{item}</button>)}</div>
            </div>
            <button onClick={() => toast('Workspace preferences saved for this session', 'success')} className="w-fit rounded-lg bg-gradient-to-r from-indigoGlow to-cyanGlow px-5 py-3 font-semibold">Save onboarding</button>
          </div>
        </div>
        <div className="glass rounded-lg p-6">
          <h2 className="font-semibold">Setup checklist</h2>
          <div className="mt-5 space-y-4 text-sm text-slate-300">
            {['Connect database', 'Add Mistral API key', 'Enable OCR', 'Upload first tender', 'Generate first proposal'].map(item => <div key={item} className="flex gap-3"><CheckCircle2 className="h-5 w-5 text-emeraldGlow" /><span>{item}</span></div>)}
          </div>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { FileUp } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';

const steps = ['Extracting text...', 'Processing with AI...', 'Generating insights...'];
const MAX_PDF_BYTES = 200 * 1024 * 1024 * 1024;
const MAX_PDF_LABEL = '200GB';

export default function UploadPage() {
  const [progress, setProgress] = useState(0);
  const [step, setStep] = useState('');
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const toast = useToast();

  const onDrop = useCallback(async (files: File[]) => {
    const file = files[0];
    if (!file) return;
    if (file.type !== 'application/pdf') return toast('Only PDF files are supported', 'error');
    if (file.size > MAX_PDF_BYTES) return toast(`PDF must be under ${MAX_PDF_LABEL}`, 'error');
    setBusy(true);
    setProgress(15);
    setStep(steps[0]);
    const timer = setInterval(() => {
      setProgress(value => Math.min(value + 18, 92));
      setStep(steps[Math.min(2, Math.floor(progress / 35))]);
    }, 700);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'Upload failed');
      clearInterval(timer);
      setProgress(100);
      setStep(steps[2]);
      toast(data.warning ?? 'Tender uploaded. AI analysis is running.', data.warning ? 'info' : 'success');
      router.push(`/tenders/${data.id}`);
    } catch (error) {
      clearInterval(timer);
      toast(error instanceof Error ? error.message : 'Upload failed', 'error');
      setBusy(false);
    }
  }, [progress, router, toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, multiple: false, accept: { 'application/pdf': ['.pdf'] } });

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div><h1 className="text-3xl font-bold">Upload Tender</h1><p className="mt-1 text-slate-400">Drop a PDF and TenderNova will extract, analyze, and prepare the opportunity.</p></div>
      <div {...getRootProps()} className={`grid min-h-[380px] cursor-pointer place-items-center rounded-lg border border-dashed p-8 text-center transition ${isDragActive ? 'border-cyanGlow bg-cyanGlow/10 glow-cyan' : 'border-white/15 bg-white/[0.03]'} ${busy ? 'animate-pulseBorder' : ''}`}>
        <input {...getInputProps()} />
        <div>
          <div className="mx-auto grid h-20 w-20 place-items-center rounded-lg bg-gradient-to-br from-indigoGlow to-cyanGlow"><FileUp className="h-9 w-9" /></div>
          <h2 className="mt-6 text-2xl font-bold">{busy ? 'Analyzing with AI...' : 'Drag and drop tender PDF'}</h2>
          <p className="mt-3 text-slate-400">PDF only, max {MAX_PDF_LABEL}</p>
          {busy && (
            <div className="mx-auto mt-8 max-w-md">
              <div className="h-3 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-gradient-to-r from-indigoGlow to-cyanGlow transition-all" style={{ width: `${progress}%` }} /></div>
              <div className="mt-4 grid gap-2 text-sm text-slate-300">{steps.map((label, index) => <p key={label} className={step === label ? 'text-cyan-200' : index < steps.indexOf(step) ? 'text-emerald-200' : ''}>{label}</p>)}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

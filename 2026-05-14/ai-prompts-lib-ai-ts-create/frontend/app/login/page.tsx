'use client';

import Link from 'next/link';
import { getProviders, signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';

export default function LoginPage() {
  const [mode, setMode] = useState('login');
  const [loading, setLoading] = useState(false);
  const [providers, setProviders] = useState<Record<string, any>>({});
  const router = useRouter();
  const toast = useToast();

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('mode') === 'register') setMode('register');
    getProviders().then(data => setProviders(data ?? {}));
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    const form = new FormData(event.currentTarget);
    const response = await signIn('credentials', {
      redirect: false,
      email: form.get('email'),
      password: form.get('password'),
      name: form.get('name'),
      mode
    });
    setLoading(false);
    if (response?.ok) {
      toast(mode === 'register' ? 'Account created' : 'Welcome back', 'success');
      router.push('/dashboard');
    } else {
      toast(response?.error ?? 'Check your credentials and try again', 'error');
    }
  }

  return (
    <main className="grid min-h-screen place-items-center px-5 [background:radial-gradient(circle_at_top,rgba(99,102,241,0.25),transparent_36%),#0A0B0F]">
      <form onSubmit={submit} className="glass w-full max-w-md rounded-lg p-7 shadow-glass">
        <Link href="/" className="mb-8 flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-lg bg-gradient-to-br from-indigoGlow to-cyanGlow"><Sparkles className="h-5 w-5" /></span>
          <span className="text-xl font-bold">TenderNova</span>
        </Link>
        <h1 className="text-3xl font-bold">{mode === 'register' ? 'Create account' : 'Welcome back'}</h1>
        <p className="mt-2 text-sm text-slate-400">Use demo@tendernova.ai / password123 after seeding.</p>
        {(providers.google || providers.github) && (
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {providers.google && <button type="button" onClick={() => signIn('google', { callbackUrl: '/dashboard' })} className="rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold hover:bg-white/10">Google</button>}
            {providers.github && <button type="button" onClick={() => signIn('github', { callbackUrl: '/dashboard' })} className="rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold hover:bg-white/10">GitHub</button>}
          </div>
        )}
        {mode === 'register' && <input name="name" className="mt-6 w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 outline-none focus:border-cyanGlow" placeholder="Name" />}
        <input required name="email" type="email" className="mt-4 w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 outline-none focus:border-cyanGlow" placeholder="Email" />
        <input required name="password" type="password" className="mt-4 w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 outline-none focus:border-cyanGlow" placeholder="Password" />
        <button disabled={loading} className="mt-6 w-full rounded-lg bg-gradient-to-r from-indigoGlow to-cyanGlow px-4 py-3 font-semibold disabled:opacity-60">{loading ? 'Working...' : mode === 'register' ? 'Register' : 'Login'}</button>
        <button type="button" onClick={() => setMode(mode === 'register' ? 'login' : 'register')} className="mt-4 w-full text-sm text-cyan-200">
          {mode === 'register' ? 'Already have an account? Login' : 'Need an account? Register'}
        </button>
      </form>
    </main>
  );
}

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

  function oauthLogin(provider: 'google' | 'github') {
    if (!providers[provider]) {
      const label = provider === 'google' ? 'Google' : 'GitHub';
      toast(`${label} login is not configured. Add ${provider.toUpperCase()}_CLIENT_ID and ${provider.toUpperCase()}_CLIENT_SECRET in frontend/.env, then restart npm run dev.`, 'error');
      return;
    }
    signIn(provider, { callbackUrl: '/dashboard' });
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
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <button type="button" onClick={() => oauthLogin('google')} className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold hover:bg-white/10">
            <GoogleMark /> Google
          </button>
          <button type="button" onClick={() => oauthLogin('github')} className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold hover:bg-white/10">
            <GitHubMark /> GitHub
          </button>
        </div>
        <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-[0.24em] text-slate-500"><span className="h-px flex-1 bg-white/10" /> or <span className="h-px flex-1 bg-white/10" /></div>
        {mode === 'register' && <input name="name" className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 outline-none focus:border-cyanGlow" placeholder="Name" />}
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

function GitHubMark() {
  return (
    <svg aria-hidden="true" className="h-4 w-4 fill-current" viewBox="0 0 24 24">
      <path d="M12 .5A11.5 11.5 0 0 0 8.36 22.9c.58.1.8-.25.8-.56v-2.15c-3.25.7-3.94-1.38-3.94-1.38-.53-1.35-1.3-1.7-1.3-1.7-1.06-.73.08-.72.08-.72 1.17.08 1.79 1.2 1.79 1.2 1.04 1.78 2.73 1.27 3.4.97.1-.75.41-1.27.74-1.56-2.6-.3-5.33-1.3-5.33-5.77 0-1.27.46-2.32 1.2-3.14-.12-.3-.52-1.5.12-3.1 0 0 .98-.32 3.2 1.2a11.1 11.1 0 0 1 5.82 0c2.22-1.52 3.2-1.2 3.2-1.2.64 1.6.24 2.8.12 3.1.75.82 1.2 1.87 1.2 3.14 0 4.49-2.74 5.47-5.35 5.76.42.36.8 1.08.8 2.18v3.23c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .5Z" />
    </svg>
  );
}

function GoogleMark() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06L5.84 9.9C6.71 7.3 9.14 5.38 12 5.38z" />
    </svg>
  );
}

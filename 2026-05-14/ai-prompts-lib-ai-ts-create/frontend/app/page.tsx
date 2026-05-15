'use client';

import Link from 'next/link';
import { ArrowRight, Bot, CheckCircle2, FileSearch, Gauge, MessageSquare, ShieldAlert, Sparkles, Wand2 } from 'lucide-react';
import { MotionDiv, MotionSection, fadeUp, stagger } from '@/components/ui/Motion';

const features = [
  ['AI Analyzer', FileSearch, 'Extract deadlines, budgets, eligibility, dates, and award signals from tender documents.'],
  ['Smart Summarizer', Sparkles, 'Turn dense tender PDFs into crisp executive summaries and action points.'],
  ['Eligibility Checker', CheckCircle2, 'Score readiness and surface gaps before your bid team loses time.'],
  ['Proposal Generator', Wand2, 'Create structured first drafts tailored to the tender requirements.'],
  ['Risk Detection', ShieldAlert, 'Highlight risky clauses, payment issues, compliance traps, and delivery exposure.'],
  ['AI Chatbot', Bot, 'Ask questions against the tender document and get concise answers instantly.']
];

export default function LandingPage() {
  return (
    <main className="min-h-screen overflow-hidden [background:radial-gradient(circle_at_top_left,rgba(99,102,241,0.28),transparent_34%),radial-gradient(circle_at_top_right,rgba(6,182,212,0.22),transparent_32%),#0A0B0F]">
      <nav className="sticky top-0 z-40 border-b border-white/10 bg-[#0A0B0F]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">
          <Link href="/" className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-gradient-to-br from-indigoGlow to-cyanGlow"><Sparkles className="h-5 w-5" /></span>
            <span className="text-lg font-bold">TenderNova</span>
          </Link>
          <div className="hidden items-center gap-8 text-sm text-slate-300 md:flex">
            <a href="#features">Features</a>
            <a href="#workflow">How it works</a>
            <a href="#pricing">Pricing</a>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="hidden rounded-lg px-4 py-2 text-sm text-slate-300 hover:bg-white/10 sm:block">Login</Link>
            <Link href="/login?mode=register" className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-obsidian">Get Started</Link>
          </div>
        </div>
      </nav>

      <section className="relative mx-auto flex min-h-[calc(100vh-74px)] max-w-7xl flex-col justify-center px-5 py-20">
        <div className="absolute inset-0 pointer-events-none">
          {Array.from({ length: 18 }).map((_, index) => (
            <MotionDiv key={index} className="absolute h-1.5 w-1.5 rounded-full bg-cyanGlow/60" style={{ left: `${8 + (index * 5) % 86}%`, top: `${12 + (index * 11) % 72}%` }} animate={{ y: [0, -24, 0], opacity: [0.2, 0.9, 0.2] }} transition={{ duration: 4 + (index % 5), repeat: Infinity }} />
          ))}
        </div>
        <MotionDiv initial="hidden" animate="visible" variants={stagger} className="relative max-w-4xl">
          <MotionDiv variants={fadeUp} className="mb-5 inline-flex rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-cyan-100">AI-native bid intelligence for modern teams</MotionDiv>
          <MotionDiv variants={fadeUp} className="text-5xl font-black leading-tight md:text-7xl">The Future of <span className="gradient-text">Tender Intelligence</span></MotionDiv>
          <MotionDiv variants={fadeUp} className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">Analyze tenders, identify risk, generate proposals, and compare bid opportunities from a single dark glass workspace built for speed.</MotionDiv>
          <MotionDiv variants={fadeUp} className="mt-9 flex flex-wrap gap-4">
            <Link href="/login?mode=register" className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-indigoGlow to-cyanGlow px-6 py-3 font-semibold glow-cyan">Start Free <ArrowRight className="h-4 w-4" /></Link>
            <button className="rounded-lg border border-white/15 px-6 py-3 font-semibold hover:bg-white/10">Watch Demo</button>
          </MotionDiv>
        </MotionDiv>
      </section>

      <MotionSection initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="border-y border-white/10 bg-white/[0.03]">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-4 px-5 py-8 md:grid-cols-4">
          {['10,000+ Tenders Analyzed', '95% Time Saved', '3x Win Rate', '500+ Companies'].map(stat => <MotionDiv variants={fadeUp} key={stat} className="text-center text-xl font-bold md:text-2xl">{stat}</MotionDiv>)}
        </div>
      </MotionSection>

      <section id="features" className="mx-auto max-w-7xl px-5 py-24">
        <h2 className="text-3xl font-bold md:text-4xl">Everything your bid desk needs</h2>
        <MotionDiv initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {features.map(([title, Icon, description]) => (
            <MotionDiv variants={fadeUp} key={title as string} className="glass rounded-lg p-6 shadow-glass">
              <Icon className="h-9 w-9 text-cyan-200" />
              <h3 className="mt-5 text-xl font-semibold">{title as string}</h3>
              <p className="mt-3 text-sm leading-6 text-slate-400">{description as string}</p>
            </MotionDiv>
          ))}
        </MotionDiv>
      </section>

      <section id="workflow" className="bg-white/[0.025] py-24">
        <div className="mx-auto max-w-7xl px-5">
          <h2 className="text-3xl font-bold md:text-4xl">How it works</h2>
          <MotionDiv initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="mt-10 grid gap-5 md:grid-cols-3">
            {['Upload the tender PDF', 'Let AI analyze requirements', 'Generate, compare, and submit'].map((step, index) => (
              <MotionDiv variants={fadeUp} key={step} className="rounded-lg border border-white/10 p-6">
                <div className="gradient-text text-5xl font-black">0{index + 1}</div>
                <p className="mt-5 text-xl font-semibold">{step}</p>
              </MotionDiv>
            ))}
          </MotionDiv>
        </div>
      </section>

      <section id="pricing" className="mx-auto max-w-7xl px-5 py-24">
        <h2 className="text-3xl font-bold md:text-4xl">Pricing</h2>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {[
            ['Free', '$0', '3 tender analyses', false],
            ['Pro', '$49', 'Unlimited analysis and proposals', true],
            ['Enterprise', 'Custom', 'SSO, audit, and team controls', false]
          ].map(([plan, price, copy, hot]) => (
            <div key={plan as string} className={`${hot ? 'gradient-border glow-indigo' : 'glass'} rounded-lg p-6`}>
              <h3 className="text-xl font-bold">{plan as string}</h3>
              <p className="mt-4 text-4xl font-black">{price as string}</p>
              <p className="mt-3 min-h-12 text-sm text-slate-400">{copy as string}</p>
              <Link href="/login?mode=register" className="mt-6 block rounded-lg bg-white px-4 py-3 text-center font-semibold text-obsidian">Choose plan</Link>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-white/10 px-5 py-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between text-sm text-slate-400">
          <span className="font-semibold text-white">TenderNova</span>
          <span>AI tender intelligence platform</span>
        </div>
      </footer>
    </main>
  );
}

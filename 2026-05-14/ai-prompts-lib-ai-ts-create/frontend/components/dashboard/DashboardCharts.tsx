'use client';

import { useEffect, useState } from 'react';
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

const monthly = [
  { month: 'Jan', tenders: 16 }, { month: 'Feb', tenders: 22 }, { month: 'Mar', tenders: 19 },
  { month: 'Apr', tenders: 31 }, { month: 'May', tenders: 27 }, { month: 'Jun', tenders: 35 }
];
const categories = [
  { name: 'IT', value: 35 }, { name: 'Construction', value: 25 }, { name: 'Healthcare', value: 18 }, { name: 'Energy', value: 22 }
];

export function DashboardCharts() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="grid gap-6 xl:grid-cols-[1.4fr_0.8fr]">
        <div className="glass h-80 rounded-lg p-5" />
        <div className="glass h-80 rounded-lg p-5" />
      </div>
    );
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1.4fr_0.8fr]">
      <div className="glass rounded-lg p-5"><h2 className="font-semibold">Tenders by Month</h2><div className="mt-4 h-72"><ResponsiveContainer><BarChart data={monthly}><XAxis dataKey="month" stroke="#94A3B8" /><YAxis stroke="#94A3B8" /><Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} /><Bar dataKey="tenders" fill="#06B6D4" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></div></div>
      <div className="glass rounded-lg p-5"><h2 className="font-semibold">Tender Categories</h2><div className="mt-4 h-72"><ResponsiveContainer><PieChart><Pie data={categories} innerRadius={64} outerRadius={96} dataKey="value">{categories.map((_, i) => <Cell key={i} fill={['#6366F1', '#06B6D4', '#22C55E', '#F59E0B'][i]} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer></div></div>
    </div>
  );
}

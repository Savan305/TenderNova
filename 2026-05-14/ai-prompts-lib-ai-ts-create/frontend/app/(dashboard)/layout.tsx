import { Sidebar } from '@/components/layout/Sidebar';

export const metadata = { title: 'TenderNova Dashboard' };

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen [background:radial-gradient(circle_at_top_right,rgba(6,182,212,0.14),transparent_28%),#0A0B0F]">
      <div className="flex">
        <Sidebar />
        <main className="min-w-0 flex-1 px-4 py-5 lg:px-8">{children}</main>
      </div>
    </div>
  );
}

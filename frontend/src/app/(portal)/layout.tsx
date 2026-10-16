'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { session, User } from '@/lib/api';

const NAV = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/complaints', label: 'Komplain harian' },
  { href: '/claims', label: 'Database klaim' },
];
const ROLE_LABEL: Record<string, string> = {
  ADMIN: 'Admin', QC_STAFF: 'QC Staff (Prepared)', QC_SUPERVISOR: 'QC Supervisor (Checked)',
  MANAGER: 'Manager (Approved)', PRODUKSI: 'Produksi', MARKETING: 'Marketing',
};

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const path = usePathname();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const u = session.user();
    if (!u || !session.token()) router.replace('/login');
    else setUser(u);
  }, [router]);

  if (!user) return null;

  return (
    <div className="min-h-screen md:grid md:grid-cols-[240px_1fr]">
      <aside className="flex flex-col bg-ink p-4 text-slate-200">
        <p className="px-2 py-3 text-lg font-semibold text-white">Portal Mutu</p>
        <nav className="mt-2 flex gap-1 md:flex-col">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href}
              className={`rounded px-3 py-2 text-sm ${path.startsWith(n.href) ? 'bg-teal text-white' : 'hover:bg-white/10'}`}>
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="mt-4 border-t border-white/10 pt-3 text-xs md:mt-auto">
          <p className="font-medium text-white">{user.name}</p>
          <p className="text-slate-400">{ROLE_LABEL[user.role]} · {user.department}</p>
          <button className="mt-2 text-slate-300 underline" onClick={() => { session.clear(); router.replace('/login'); }}>Keluar</button>
        </div>
      </aside>
      <main className="min-w-0 p-5 md:p-8">{children}</main>
    </div>
  );
}

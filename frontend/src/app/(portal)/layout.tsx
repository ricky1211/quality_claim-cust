'use client';
import { useEffect, useState, useRef, Suspense } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { session, User } from '@/lib/api';

interface NavItem {
  href: string;
  label: string;
  badge?: string;
  icon: React.ReactNode;
  adminOnly?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    icon: (
      <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    href: '/complaints',
    label: 'Customer Complaint',
    icon: (
      <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  {
    href: '/claims',
    label: 'Database Claim',
    icon: (
      <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    href: '/reports',
    label: 'Rekap & Report',
    icon: (
      <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  {
    href: '/master',
    label: 'Master Data',
    adminOnly: true,
    icon: (
      <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
];

const ROLE_LABEL: Record<string, string> = {
  ADMIN: 'Administrator',
  QC_STAFF: 'QC Staff',
  QC_SUPERVISOR: 'QC Supervisor',
  MANAGER: 'Manager',
  PRODUKSI: 'Produksi',
  MARKETING: 'Marketing',
};

function SidebarNavigation({ onNavigate }: { onNavigate: () => void }) {
  const path = usePathname();

  function isItemActive(href: string) {
    if (href === '/dashboard') return path === '/dashboard';
    return path.startsWith(href);
  }

  return (
    <div className="flex-1 px-3 py-3.5 overflow-y-auto">
      <nav className="space-y-1.5">
        {NAV_ITEMS.map((item) => {
          const isActive = isItemActive(item.href);

          return (
            <Link
              key={item.label}
              href={item.href}
              onClick={onNavigate}
              className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-blue-600 text-white font-semibold shadow-sm shadow-blue-500/25'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className={isActive ? 'text-white' : 'text-slate-500'}>
                  {item.icon}
                </span>
                <span className="truncate">{item.label}</span>
              </div>
              {item.badge && (
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wider ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const path = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const u = session.user();
    if (!u || !session.token()) {
      router.replace('/login');
    } else {
      setUser(u);
    }
  }, [router]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!user) return null;

  // Determine current page title
  let pageTitle = 'DASHBOARD';
  if (path.startsWith('/complaints')) pageTitle = 'CUSTOMER COMPLAINT';
  else if (path.startsWith('/claims')) pageTitle = 'DATABASE CLAIM';
  else if (path.startsWith('/reports')) pageTitle = 'REKAPITULASI & REPORT';
  else if (path.startsWith('/master')) pageTitle = 'MASTER DATA & SETTINGS';

  const userInitial = (user.name || 'A').charAt(0).toUpperCase();

  return (
    <div className="h-screen bg-[#F4F6F9] text-slate-800 flex overflow-hidden print:h-auto print:overflow-visible print:block print:bg-white">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm lg:hidden print:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:inset-auto lg:flex lg:flex-col lg:w-64 shrink-0 print:hidden ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Company Header / Logo */}
        <div className="h-16 flex items-center px-5 border-b border-slate-200 bg-white">
          <img
            src="/asset/logo-mtm.jpg"
            alt="PT Menara Terus Makmur - Astra Otoparts Group"
            className="h-9 w-auto object-contain"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = '/asset/logo-mtm-icon.png';
            }}
          />
        </div>

        {/* Navigation list */}
        <Suspense fallback={<div className="flex-1 p-3 text-xs text-slate-400">Memuat...</div>}>
          <SidebarNavigation onNavigate={() => setSidebarOpen(false)} />
        </Suspense>

        {/* User Profile at Bottom of Sidebar */}
        <div className="p-3 border-t border-slate-200 bg-white" ref={userMenuRef}>
          <div className="relative">
            <button
              type="button"
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="w-full flex items-center justify-between p-2 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors text-left focus:outline-none"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="h-8 w-8 rounded-full bg-[#2563EB] text-white font-bold text-xs flex items-center justify-center shadow-sm shrink-0">
                  {userInitial}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-800 truncate leading-tight">
                    {user.name}
                  </p>
                  <p className="text-[11px] text-slate-500 truncate leading-tight mt-0.5">
                    {ROLE_LABEL[user.role] || user.role}
                  </p>
                </div>
              </div>
              <svg
                className={`h-4 w-4 text-slate-400 transition-transform shrink-0 ${userMenuOpen ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* User Dropdown Menu (pops up above the button) */}
            {userMenuOpen && (
              <div className="absolute bottom-full left-0 mb-2 w-full rounded-xl bg-white shadow-xl border border-slate-200 py-2 z-50 transition-all">
                <div className="px-3.5 py-2 border-b border-slate-100">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    SIGN IN AS:
                  </p>
                  <p className="text-xs font-bold text-slate-800 truncate mt-0.5">{user.name}</p>
                  <p className="text-[11px] text-blue-600 font-medium">{ROLE_LABEL[user.role] || user.role}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    session.clear();
                    router.replace('/login');
                  }}
                  className="w-full flex items-center gap-2 px-3.5 py-2.5 text-xs font-semibold text-slate-700 hover:bg-red-50 hover:text-red-600 transition-colors text-left"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  <span>Logout</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden print:overflow-visible print:block print:w-full">
        {/* Top Navbar */}
        <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-7 flex items-center justify-between sticky top-0 z-30 shadow-sm print:hidden">
          {/* Left: Hamburger & Page Title */}
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100"
              aria-label="Toggle menu"
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <h1 className="text-base sm:text-lg font-bold tracking-wide text-slate-800 uppercase">
              {pageTitle}
            </h1>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            {/* Refresh button */}
            <button
              type="button"
              onClick={() => window.location.reload()}
              title="Refresh Halaman"
              className="h-9 w-9 rounded-xl border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>

            {/* Notification Bell */}
            <div className="relative">
              <button
                type="button"
                title="Notifikasi"
                className="h-9 w-9 rounded-xl border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {/* Red dot badge */}
                <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
              </button>
            </div>
          </div>
        </header>

        {/* Page Body */}
        <main className={`flex-1 min-w-0 ${path.startsWith('/dashboard') ? 'overflow-hidden p-2 sm:p-2.5 flex flex-col' : 'overflow-y-auto p-4 sm:p-7'} print:overflow-visible print:p-0 print:m-0 print:h-auto print:w-full`}>{children}</main>
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { cn } from '@/lib/utils';
import { useSettings } from '@/lib/useSettings';

const navItems = [
  { href: '/my-tickets', label: 'My Tickets', icon: '🎫' },
  { href: '/my-tickets/new', label: 'New Ticket', icon: '➕' },
  { href: '/profile', label: 'My Profile', icon: '👤' },
];

function StaffNav({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname();
  const settings = useSettings();
  const { data: session } = useSession();

  return (
    <div className="flex flex-col h-full bg-indigo-900 text-white w-64">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-indigo-800">
        {settings.logo_filename ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src="/api/settings/logo" alt="Logo" className="w-9 h-9 rounded-lg object-contain bg-white p-0.5" />
        ) : (
          <div className="w-9 h-9 bg-indigo-400 rounded-lg flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
            {settings.company_name.slice(0, 2).toUpperCase()}
          </div>
        )}
        <div className="min-w-0">
          <div className="font-semibold text-sm truncate">{settings.company_name}</div>
          <div className="text-xs text-indigo-300 truncate">{session?.user?.name}</div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const active = pathname === item.href || (item.href !== '/my-tickets' && pathname.startsWith(item.href));
          return (
            <Link key={item.href} href={item.href} onClick={onClose}
              className={cn('flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                active ? 'bg-indigo-700 text-white' : 'text-indigo-200 hover:bg-indigo-800 hover:text-white'
              )}>
              <span>{item.icon}</span>{item.label}
            </Link>
          );
        })}
      </nav>

      <div className="px-3 py-4 border-t border-indigo-800">
        <button onClick={() => signOut({ callbackUrl: '/login' })}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-indigo-200 hover:bg-indigo-800 hover:text-white transition-colors">
          <span>🚪</span>Sign Out
        </button>
      </div>
    </div>
  );
}

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex h-screen overflow-hidden">
      <div className="hidden md:flex md:flex-shrink-0"><StaffNav /></div>
      {open && (
        <div className="fixed inset-0 z-40 flex md:hidden">
          <div className="fixed inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <div className="relative z-50"><StaffNav onClose={() => setOpen(false)} /></div>
        </div>
      )}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="md:hidden flex items-center gap-3 px-4 py-3 bg-white border-b border-slate-200 shadow-sm">
          <button onClick={() => setOpen(true)} className="p-2 rounded-lg text-slate-600 hover:bg-slate-100">☰</button>
          <span className="font-semibold text-indigo-900">Staff Portal</span>
        </header>
        <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}

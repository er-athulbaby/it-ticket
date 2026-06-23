'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { cn } from '@/lib/utils';
import { useSettings } from '@/lib/useSettings';
import { useState } from 'react';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: '◈' },
  { href: '/tickets', label: 'Tickets', icon: '🎫' },
  { href: '/categories', label: 'Categories', icon: '🏷️' },
  { href: '/staff', label: 'Staff', icon: '👤' },
  { href: '/users', label: 'Users', icon: '👥' },
  { href: '/settings', label: 'Settings', icon: '⚙️' },
];

export default function Sidebar({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname();
  const settings = useSettings();
  const { data: session } = useSession();
  const [photoError, setPhotoError] = useState(false);

  const rawId = (session?.user as { id?: string })?.id ?? '';
  const adminId = rawId.replace('admin_', '');
  const photoUrl = adminId ? `/api/users/photo?adminId=${adminId}` : '';

  return (
    <div className="flex flex-col h-full bg-indigo-900 text-white w-64">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-indigo-800">
        {settings.logo_filename ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src="/api/settings/logo" alt="Logo" className="w-9 h-9 rounded-lg object-contain bg-white p-0.5" />
        ) : (
          <div className="w-9 h-9 bg-indigo-400 rounded-lg flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
            {settings.company_name.slice(0, 2).toUpperCase()}
          </div>
        )}
        <span className="font-semibold text-base leading-tight truncate">{settings.company_name}</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link key={item.href} href={item.href} onClick={onClose}
              className={cn('flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                active ? 'bg-indigo-700 text-white' : 'text-indigo-200 hover:bg-indigo-800 hover:text-white'
              )}>
              <span className="text-base">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User + Sign out */}
      <div className="px-3 py-4 border-t border-indigo-800 space-y-2">
        <Link href="/settings" onClick={onClose}
          className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-indigo-800 transition-colors">
          {photoUrl && !photoError ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photoUrl} alt="Profile" onError={() => setPhotoError(true)}
              className="w-8 h-8 rounded-full object-cover flex-shrink-0 border border-indigo-600" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-indigo-400 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
              {session?.user?.name?.slice(0, 1).toUpperCase() ?? 'A'}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-white truncate">{session?.user?.name}</p>
            <p className="text-xs text-indigo-300 truncate">{session?.user?.email}</p>
          </div>
        </Link>
        <button onClick={() => signOut({ callbackUrl: '/login' })}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-indigo-200 hover:bg-indigo-800 hover:text-white transition-colors">
          <span className="text-base">🚪</span>Sign Out
        </button>
      </div>
    </div>
  );
}

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { cn } from '@/lib/utils';
import { useSettings } from '@/lib/useSettings';
import { getTheme } from '@/lib/themes';
import { useState } from 'react';

interface NavChild { href: string; label: string }
interface NavItem { href: string; label: string; icon: string; viewerOk: boolean; children?: NavChild[] }

const ALL_NAV: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: '◈', viewerOk: true },
  { href: '/tickets', label: 'Tickets', icon: '🎫', viewerOk: true },
  { href: '/categories', label: 'Categories', icon: '🏷️', viewerOk: false },
  { href: '/staff', label: 'Staff', icon: '👤', viewerOk: false },
  { href: '/associations', label: 'Associations', icon: '🏢', viewerOk: false },
  { href: '/assets', label: 'Assets', icon: '🖥️', viewerOk: false, children: [
    { href: '/assets', label: 'All Assets' },
    { href: '/assets/categories', label: 'Categories' },
  ]},
  { href: '/consumables', label: 'Consumables', icon: '📦', viewerOk: false },
  { href: '/licenses', label: 'Licenses', icon: '🔑', viewerOk: false },
  { href: '/service-requests', label: 'Service Requests', icon: '📋', viewerOk: false },
  { href: '/users', label: 'Users', icon: '👥', viewerOk: false },
  { href: '/settings', label: 'Settings', icon: '⚙️', viewerOk: false },
];

export default function Sidebar({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname();
  const settings = useSettings();
  const { data: session } = useSession();
  const [photoError, setPhotoError] = useState(false);
  const theme = getTheme(settings.theme);

  const rawId = (session?.user as { id?: string })?.id ?? '';
  const adminId = rawId.replace('admin_', '');
  const photoUrl = adminId ? `/api/users/photo?adminId=${adminId}` : '';
  const isViewer = (session?.user as { role?: string })?.role === 'viewer';
  const navItems = ALL_NAV.filter((item) => !isViewer || item.viewerOk);

  function isActive(item: NavItem) {
    if (item.children) return pathname === item.href || item.children.some(c => pathname === c.href || pathname.startsWith(c.href + '/'));
    return pathname === item.href || pathname.startsWith(item.href + '/');
  }

  function isChildActive(href: string) {
    return pathname === href || pathname.startsWith(href + '/');
  }

  // For items with children, show submenu when parent or any child is active
  function showChildren(item: NavItem) {
    return item.children && isActive(item);
  }

  return (
    <div className={cn('flex flex-col h-full text-white w-64', theme.sidebar)}>
      {/* Logo */}
      <div className={cn('flex items-center gap-3 px-5 py-4 border-b', theme.border)}>
        {settings.logo_filename ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src="/api/settings/logo" alt="Logo" className="w-9 h-9 rounded-lg object-contain bg-white p-0.5" />
        ) : (
          <div className="w-9 h-9 bg-white/20 rounded-lg flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
            {settings.company_name.slice(0, 2).toUpperCase()}
          </div>
        )}
        <span className="font-semibold text-base leading-tight truncate">{settings.company_name}</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const active = isActive(item);
          const hasChildren = item.children && item.children.length > 0;

          return (
            <div key={item.href}>
              <Link href={hasChildren ? item.children![0].href : item.href} onClick={onClose}
                className={cn('flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  active ? theme.active + ' text-white' : 'text-white/70 ' + theme.hover + ' hover:text-white'
                )}>
                <span className="text-base">{item.icon}</span>
                <span className="flex-1">{item.label}</span>
                {hasChildren && <span className="text-xs text-white/50">{active ? '▾' : '▸'}</span>}
              </Link>

              {/* Submenu */}
              {hasChildren && showChildren(item) && (
                <div className="ml-4 mt-0.5 space-y-0.5 border-l border-white/10 pl-3">
                  {item.children!.map((child) => {
                    const childActive = isChildActive(child.href);
                    return (
                      <Link key={child.href} href={child.href} onClick={onClose}
                        className={cn('block px-3 py-2 rounded-lg text-xs font-medium transition-colors',
                          childActive ? 'bg-white/20 text-white' : 'text-white/60 hover:text-white hover:bg-white/10'
                        )}>
                        {child.label}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* User + Sign out */}
      <div className={cn('px-3 py-4 border-t space-y-2', theme.border)}>
        <Link href="/settings" onClick={onClose}
          className={cn('flex items-center gap-3 px-3 py-2 rounded-lg transition-colors', theme.hover)}>
          {photoUrl && !photoError ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photoUrl} alt="Profile" onError={() => setPhotoError(true)}
              className="w-8 h-8 rounded-full object-cover flex-shrink-0 border border-white/30" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
              {session?.user?.name?.slice(0, 1).toUpperCase() ?? 'A'}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-white truncate">{session?.user?.name}</p>
            <p className="text-xs text-white/60 truncate">{session?.user?.email}</p>
          </div>
        </Link>
        <button onClick={() => signOut({ callbackUrl: '/login' })}
          className={cn('flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-white/70 hover:text-white transition-colors', theme.hover)}>
          <span className="text-base">🚪</span>Sign Out
        </button>
      </div>
    </div>
  );
}

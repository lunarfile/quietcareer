'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  PenLine,
  Battery,
  MoreHorizontal,
  Plus,
} from 'lucide-react';

const navItems = [
  { href: '/dashboard', label: 'Home', icon: LayoutDashboard },
  { href: '/journal', label: 'Notes', icon: PenLine },
  // Center FAB goes here
  { href: '/energy', label: 'Battery', icon: Battery },
  { href: '/more', label: 'More', icon: MoreHorizontal },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-surface-border bg-bg-secondary/95 backdrop-blur-xl">
      <div
        className="flex items-center justify-around h-20 px-3"
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 12px)' }}
      >
        {navItems.map((item, i) => {
          const isActive = item.href === '/more'
            ? ['/more', '/health', '/brag', '/escape', '/goals', '/meetings', '/snapshot', '/settings'].some((r) => pathname.startsWith(r))
            : pathname.startsWith(item.href);

          return (
            <React.Fragment key={item.href}>
              {/* Center FAB — after Notes (index 1) */}
              {i === 2 && (
                <Link href="/journal" className="flex items-center justify-center -mt-7">
                  <div className="w-14 h-14 rounded-full bg-accent shadow-lg shadow-accent/30 flex items-center justify-center active:scale-90 transition-transform">
                    <Plus size={26} strokeWidth={2.5} className="text-text-inverse" />
                  </div>
                </Link>
              )}

              <Link
                href={item.href}
                className={cn(
                  'relative flex flex-col items-center justify-center gap-1 w-full py-2 text-[11px] font-medium transition-colors',
                  isActive ? 'text-accent-text' : 'text-text-tertiary active:text-text-secondary'
                )}
              >
                <item.icon
                  size={22}
                  strokeWidth={isActive ? 2.2 : 1.5}
                  className={cn('transition-all', isActive && 'text-accent')}
                />
                <span className={cn(isActive && 'text-accent-text font-semibold')}>
                  {item.label}
                </span>
                {isActive && (
                  <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-6 h-[3px] rounded-full bg-accent" />
                )}
              </Link>
            </React.Fragment>
          );
        })}
      </div>
    </nav>
  );
}

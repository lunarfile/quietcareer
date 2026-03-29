'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  PenLine,
  Trophy,
  Battery,
  MoreHorizontal,
  Rocket,
  Target,
  Users,
  BarChart3,
  Settings,
  X,
  Plus,
} from 'lucide-react';

function renderTab(item: { href: string; label: string; icon: typeof LayoutDashboard }, pathname: string) {
  const isActive = pathname.startsWith(item.href);
  return (
    <Link
      href={item.href}
      className={cn(
        'relative flex flex-col items-center justify-center gap-0.5 w-full py-1.5 text-[10px] font-medium transition-colors',
        isActive ? 'text-accent-text' : 'text-text-tertiary active:text-text-secondary'
      )}
    >
      {isActive && (
        <div className="absolute -top-px left-1/2 -translate-x-1/2 w-5 h-0.5 rounded-full bg-accent" />
      )}
      <item.icon size={20} strokeWidth={isActive ? 2 : 1.5} className="transition-transform active:scale-90" />
      <span>{item.label}</span>
    </Link>
  );
}

const navItems = [
  { href: '/dashboard', label: 'Home', icon: LayoutDashboard },
  { href: '/journal', label: 'Notes', icon: PenLine },
  // Center compose button goes between these two
  { href: '/energy', label: 'Battery', icon: Battery },
];

const moreItems = [
  { href: '/health', label: 'Career Health', icon: BarChart3, desc: 'Your metrics and trends' },
  { href: '/brag', label: 'Proof', icon: Trophy, desc: 'Career asset generator' },
  { href: '/escape', label: 'Runway', icon: Rocket, desc: 'Financial freedom calculator' },
  { href: '/goals', label: 'Next Moves', icon: Target, desc: 'Track your goals' },
  { href: '/meetings', label: 'Prep', icon: Users, desc: 'Meeting preparation' },
  { href: '/snapshot', label: 'The Week', icon: BarChart3, desc: 'Weekly career snapshot' },
  { href: '/settings', label: 'Settings', icon: Settings, desc: 'Profile, AI, sync, theme' },
];

export function MobileNav() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const isMoreActive = moreItems.some((item) => pathname.startsWith(item.href));

  return (
    <>
      {/* More sheet */}
      {moreOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in"
            onClick={() => setMoreOpen(false)}
          />
          <div className="absolute bottom-0 left-0 right-0 bg-bg-secondary border-t border-surface-border rounded-t-2xl animate-fade-up z-50">
            <div className="flex items-center justify-between px-5 pt-4 pb-2">
              <span className="text-sm font-semibold text-text-primary">More</span>
              <button onClick={() => setMoreOpen(false)} aria-label="Close">
                <X size={18} className="text-text-tertiary" />
              </button>
            </div>
            <div className="px-3 pb-16">
              {moreItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMoreOpen(false)}
                  className={cn(
                    'flex items-center gap-4 px-3 py-3 rounded-[var(--radius-md)] transition-colors',
                    pathname.startsWith(item.href)
                      ? 'bg-accent-muted'
                      : 'active:bg-surface-highlight'
                  )}
                >
                  <div className="w-10 h-10 rounded-xl bg-surface-highlight flex items-center justify-center shrink-0">
                    <item.icon size={18} className={pathname.startsWith(item.href) ? 'text-accent' : 'text-text-secondary'} />
                  </div>
                  <div>
                    <span className={cn('text-sm font-medium block', pathname.startsWith(item.href) ? 'text-accent-text' : 'text-text-primary')}>
                      {item.label}
                    </span>
                    <span className="text-xs text-text-tertiary">{item.desc}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-surface-border bg-bg-secondary backdrop-blur-lg pb-12 pt-2">
        <div className="flex items-center justify-around h-14 px-2">
          {navItems.map((item, i) => (
            <React.Fragment key={item.href}>
              {renderTab(item, pathname)}
              {/* Center compose button after 2nd tab */}
              {i === 1 && (
                <Link
                  href="/journal"
                  className="flex items-center justify-center -mt-5"
                >
                  <div className="w-12 h-12 rounded-full bg-accent shadow-lg shadow-accent/25 flex items-center justify-center active:scale-90 transition-transform">
                    <Plus size={24} strokeWidth={2.5} className="text-text-inverse" />
                  </div>
                </Link>
              )}
            </React.Fragment>
          ))}

          {/* More tab */}
          <button
            onClick={() => setMoreOpen(true)}
            className={cn(
              'relative flex flex-col items-center justify-center gap-0.5 w-full py-1.5 text-[10px] font-medium transition-colors',
              isMoreActive ? 'text-accent-text' : 'text-text-tertiary active:text-text-secondary'
            )}
          >
            {isMoreActive && (
              <div className="absolute -top-px left-1/2 -translate-x-1/2 w-5 h-0.5 rounded-full bg-accent" />
            )}
            <MoreHorizontal size={20} strokeWidth={isMoreActive ? 2 : 1.5} />
            <span>More</span>
          </button>
        </div>
      </nav>
    </>
  );
}

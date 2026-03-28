'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useTheme } from '@/lib/theme';
import {
  LayoutDashboard,
  PenLine,
  Rocket,
  Trophy,
  Battery,
  Target,
  Users,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  Shield,
  Sun,
  Moon,
} from 'lucide-react';

const navItems = [
  { href: '/dashboard', label: 'My Week', icon: LayoutDashboard },
  { href: '/snapshot', label: 'The Week', icon: BarChart3 },
  { href: '/journal', label: 'Field Notes', icon: PenLine },
  { href: '/meetings', label: 'Prep', icon: Users },
  { href: '/brag', label: 'Proof', icon: Trophy },
  { href: '/energy', label: 'Battery', icon: Battery },
  { href: '/escape', label: 'Runway', icon: Rocket },
  { href: '/goals', label: 'Next Moves', icon: Target },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();

  return (
    <aside
      className={cn(
        'hidden md:flex flex-col h-screen border-r border-surface-border bg-bg-secondary transition-all duration-300 ease-out',
        collapsed ? 'w-[68px]' : 'w-[240px]'
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-14 border-b border-surface-border shrink-0">
        <Shield size={22} className="text-accent shrink-0" strokeWidth={2} />
        <span
          className={cn(
            'font-semibold text-text-primary text-sm tracking-tight transition-all duration-300',
            collapsed ? 'opacity-0 w-0' : 'opacity-100'
          )}
        >
          QuietCareer
        </span>
      </div>

      {/* Main nav */}
      <nav className="flex-1 py-3 px-2 space-y-0.5">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'group flex items-center gap-3 px-3 py-2 rounded-[var(--radius-sm)] text-[13px] font-medium transition-all duration-150',
                isActive
                  ? 'bg-accent-muted text-accent-text'
                  : 'text-text-secondary hover:text-text-primary hover:bg-surface-highlight'
              )}
            >
              <div className="relative shrink-0">
                <item.icon size={18} strokeWidth={isActive ? 2 : 1.5} />
                {isActive && (
                  <div className="absolute -left-[13px] top-1/2 -translate-y-1/2 w-[3px] h-4 rounded-r-full bg-accent" />
                )}
              </div>
              <span
                className={cn(
                  'transition-all duration-300 whitespace-nowrap',
                  collapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'
                )}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom section */}
      <div className="px-2 pb-2 space-y-0.5">
        {/* Settings */}
        <Link
          href="/settings"
          className={cn(
            'flex items-center gap-3 px-3 py-2 rounded-[var(--radius-sm)] text-[13px] font-medium transition-all duration-150',
            pathname.startsWith('/settings')
              ? 'bg-accent-muted text-accent-text'
              : 'text-text-secondary hover:text-text-primary hover:bg-surface-highlight'
          )}
        >
          <Settings size={18} strokeWidth={pathname.startsWith('/settings') ? 2 : 1.5} className="shrink-0" />
          <span className={cn('transition-all duration-300', collapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100')}>
            Settings
          </span>
        </Link>

        {/* Shortcut hint */}
        {!collapsed && (
          <div className="px-3 py-1.5 mb-1">
            <p className="text-[10px] text-text-tertiary/50">
              <kbd className="px-1 py-0.5 rounded bg-surface-highlight text-[9px]">Ctrl+N</kbd> quick note
              {' \u00B7 '}
              <kbd className="px-1 py-0.5 rounded bg-surface-highlight text-[9px]">Ctrl+K</kbd> commands
            </p>
          </div>
        )}

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="flex items-center gap-3 px-3 py-2 w-full rounded-[var(--radius-sm)] text-[13px] text-text-tertiary hover:text-text-secondary hover:bg-surface-highlight transition-all duration-150"
        >
          {theme === 'dark' ? (
            <Sun size={18} strokeWidth={1.5} className="shrink-0" />
          ) : (
            <Moon size={18} strokeWidth={1.5} className="shrink-0" />
          )}
          <span className={cn('transition-all duration-300', collapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100')}>
            {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
          </span>
        </button>

        {/* Collapse */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center gap-3 px-3 py-2 w-full rounded-[var(--radius-sm)] text-[13px] text-text-tertiary hover:text-text-secondary hover:bg-surface-highlight transition-all duration-150"
        >
          {collapsed ? (
            <ChevronRight size={18} strokeWidth={1.5} className="shrink-0" />
          ) : (
            <ChevronLeft size={18} strokeWidth={1.5} className="shrink-0" />
          )}
          <span className={cn('transition-all duration-300', collapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100')}>
            Collapse
          </span>
        </button>
      </div>
    </aside>
  );
}

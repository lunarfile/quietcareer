'use client';

import { type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const tabs = [
  { href: '/journal', label: 'Entries' },
  { href: '/journal/calendar', label: 'Calendar' },
  { href: '/journal/weekly', label: 'Weekly' },
  { href: '/journal/monthly', label: 'Monthly' },
];

export default function JournalLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  // Only show tabs on sub-pages, not on main journal page
  const showTabs = pathname !== '/journal';

  return (
    <div className="space-y-4">
      {showTabs && (
        <div className="flex gap-1 p-1 rounded-xl bg-bg-secondary border border-surface-border overflow-x-auto">
          {tabs.map((tab) => {
            const isActive = pathname === tab.href;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  'px-4 py-2 text-xs rounded-lg transition-all whitespace-nowrap',
                  isActive
                    ? 'bg-surface-highlight text-text-primary font-medium'
                    : 'text-text-tertiary active:text-text-secondary'
                )}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>
      )}
      {children}
    </div>
  );
}

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  PenLine,
  Rocket,
  Trophy,
  Battery,
} from 'lucide-react';

const navItems = [
  { href: '/dashboard', label: 'Home', icon: LayoutDashboard },
  { href: '/journal', label: 'Notes', icon: PenLine },
  { href: '/brag', label: 'Proof', icon: Trophy },
  { href: '/energy', label: 'Battery', icon: Battery },
  { href: '/escape', label: 'Runway', icon: Rocket },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-surface-border bg-bg-secondary/90 backdrop-blur-lg safe-area-pb">
      <div className="flex items-center justify-around h-16 px-1">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'relative flex flex-col items-center justify-center gap-0.5 w-full py-1.5 text-[10px] font-medium transition-colors',
                isActive ? 'text-accent-text' : 'text-text-tertiary active:text-text-secondary'
              )}
            >
              {/* Active indicator dot */}
              {isActive && (
                <div className="absolute -top-px left-1/2 -translate-x-1/2 w-5 h-0.5 rounded-full bg-accent" />
              )}
              <item.icon
                size={20}
                strokeWidth={isActive ? 2 : 1.5}
                className="transition-transform active:scale-90"
              />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

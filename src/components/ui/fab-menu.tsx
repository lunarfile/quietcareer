'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, X, PenLine, Battery, Trophy, Target, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

const ACTIONS = [
  { href: '/journal', label: 'Field Note', icon: PenLine, color: 'bg-accent' },
  { href: '/energy', label: 'Battery', icon: Battery, color: 'bg-energy-4' },
  { href: '/brag', label: 'Proof', icon: Trophy, color: 'bg-warning' },
  { href: '/goals', label: 'Goal', icon: Target, color: 'bg-success' },
  { href: '/meetings', label: 'Prep', icon: Users, color: 'bg-accent-secondary' },
];

export function FabMenu() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const handleAction = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  return (
    <div className="md:hidden fixed bottom-20 right-4 z-40">
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-30 animate-fade-in"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Menu items */}
      {open && (
        <div className="absolute bottom-16 right-0 z-40 flex flex-col items-end gap-3 animate-fade-up">
          {ACTIONS.map((action, i) => (
            <button
              key={action.href}
              onClick={() => handleAction(action.href)}
              className="flex items-center gap-3 animate-fade-up"
              style={{ animationDelay: `${i * 0.05}s` }}
            >
              <span className="text-sm font-medium text-text-primary bg-bg-secondary px-3 py-1.5 rounded-full shadow-md border border-surface-border">
                {action.label}
              </span>
              <div className={cn(
                'w-11 h-11 rounded-full flex items-center justify-center shadow-lg',
                action.color
              )}>
                <action.icon size={18} className="text-white" />
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Main FAB */}
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          'relative z-40 w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-200',
          open
            ? 'bg-bg-secondary border border-surface-border rotate-45'
            : 'bg-accent shadow-accent/30 active:scale-90'
        )}
        aria-label={open ? 'Close menu' : 'Quick actions'}
      >
        {open ? (
          <X size={24} className="text-text-primary" />
        ) : (
          <Plus size={24} strokeWidth={2.5} className="text-text-inverse" />
        )}
      </button>
    </div>
  );
}

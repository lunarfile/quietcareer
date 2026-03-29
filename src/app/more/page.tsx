'use client';
import { usePageTitle } from '@/hooks/use-page-title';

import { useState, useEffect } from 'react';
import { getUserRole, getSetting } from '@/lib/settings';
import Link from 'next/link';
import {
  BarChart3,
  Trophy,
  Rocket,
  Target,
  Users,
  Settings,
  ChevronRight,
  User,
  Calendar,
} from 'lucide-react';

const featureCards = [
  { href: '/health', label: 'Career Health', icon: BarChart3, desc: 'Your metrics and trends', color: 'text-accent', bg: 'bg-accent-muted' },
  { href: '/brag', label: 'Proof', icon: Trophy, desc: 'Career asset generator', color: 'text-warning', bg: 'bg-warning/10' },
  { href: '/escape', label: 'Runway', icon: Rocket, desc: 'Financial freedom calculator', color: 'text-danger-text', bg: 'bg-danger/10' },
  { href: '/goals', label: 'Next Moves', icon: Target, desc: 'Track your goals', color: 'text-success', bg: 'bg-success/10' },
  { href: '/meetings', label: 'Prep', icon: Users, desc: 'Meeting preparation', color: 'text-accent-secondary', bg: 'bg-accent-secondary/10' },
  { href: '/snapshot', label: 'The Week', icon: Calendar, desc: 'Weekly career snapshot', color: 'text-accent', bg: 'bg-accent-muted' },
];

export default function MorePage() {
  usePageTitle('More');
  const [role, setRole] = useState('');
  const [tenure, setTenure] = useState('');

  useEffect(() => {
    Promise.all([getUserRole(), getSetting('user_tenure')]).then(([r, t]) => {
      setRole(r ?? '');
      setTenure(t ?? '');
    });
  }, []);

  return (
    <div className="animate-fade-up space-y-6">
      {/* Profile */}
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-accent-muted flex items-center justify-center">
          <User size={24} className="text-accent" />
        </div>
        <div className="flex-1">
          <p className="text-base font-semibold text-text-primary">{role || 'Your Role'}</p>
          {tenure && <p className="text-xs text-text-tertiary mt-0.5">{tenure}</p>}
          <Link href="/settings" className="text-xs text-accent mt-1 inline-block active:opacity-70">
            View profile
          </Link>
        </div>
      </div>

      {/* Tools grid */}
      <div>
        <span className="text-xs text-text-tertiary uppercase tracking-wider font-medium">Tools</span>
        <div className="grid grid-cols-2 gap-2.5 mt-3">
          {featureCards.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="bg-bg-secondary border border-surface-border rounded-xl p-4 active:scale-[0.98] transition-transform"
            >
              <div className={`w-10 h-10 rounded-xl ${item.bg} flex items-center justify-center mb-3`}>
                <item.icon size={20} className={item.color} />
              </div>
              <p className="text-sm font-medium text-text-primary">{item.label}</p>
              <p className="text-[11px] text-text-tertiary mt-0.5 leading-snug">{item.desc}</p>
            </Link>
          ))}
        </div>
      </div>

      {/* Settings */}
      <div>
        <span className="text-xs text-text-tertiary uppercase tracking-wider font-medium">Settings</span>
        <div className="mt-3 bg-bg-secondary border border-surface-border rounded-xl overflow-hidden">
          <Link href="/settings" className="flex items-center justify-between px-4 py-3.5 active:bg-surface-highlight transition-colors">
            <div className="flex items-center gap-3">
              <Settings size={18} className="text-text-secondary" />
              <span className="text-sm text-text-primary">Settings</span>
            </div>
            <ChevronRight size={16} className="text-text-tertiary" />
          </Link>
        </div>
      </div>

      <p className="text-center text-[10px] text-text-tertiary pt-4 pb-8">
        QuietCareer v1.0.0
      </p>
    </div>
  );
}

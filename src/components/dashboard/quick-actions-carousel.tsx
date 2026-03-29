'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { PenLine, Battery, Trophy, Rocket } from 'lucide-react';

const ACTIONS = [
  { href: '/journal', icon: PenLine, label: 'Write a Note', desc: 'Log what happened today', color: 'text-accent', bg: 'bg-accent-muted' },
  { href: '/energy', icon: Battery, label: 'Battery Check', desc: 'How are you feeling?', color: 'text-success', bg: 'bg-success/10' },
  { href: '/brag', icon: Trophy, label: 'Build Proof', desc: 'Generate impact statements', color: 'text-warning', bg: 'bg-warning/10' },
  { href: '/escape', icon: Rocket, label: 'Check Runway', desc: 'Financial freedom calc', color: 'text-danger-text', bg: 'bg-danger/10' },
];

export function QuickActionsCarousel() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const handleScroll = () => {
      const index = Math.round(el.scrollLeft / 172);
      setActiveIndex(Math.min(index, ACTIONS.length - 1));
    };
    el.addEventListener('scroll', handleScroll, { passive: true });
    return () => el.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div>
      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto pb-3 -mx-5 px-5 snap-x snap-mandatory scrollbar-hide"
      >
        {ACTIONS.map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className="snap-start shrink-0 w-[160px] bg-bg-secondary border border-surface-border rounded-xl p-4 active:scale-[0.97] transition-transform"
          >
            <div className={`w-10 h-10 rounded-xl ${action.bg} flex items-center justify-center mb-3`}>
              <action.icon size={20} className={action.color} />
            </div>
            <p className="text-sm font-medium text-text-primary leading-snug">{action.label}</p>
            <p className="text-[11px] text-text-tertiary mt-0.5 leading-snug">{action.desc}</p>
          </Link>
        ))}
      </div>
      {/* Dots */}
      <div className="flex justify-center gap-1.5 mt-1">
        {ACTIONS.map((_, i) => (
          <div
            key={i}
            className={`h-1.5 rounded-full transition-all duration-200 ${
              i === activeIndex ? 'w-4 bg-accent' : 'w-1.5 bg-surface-border'
            }`}
          />
        ))}
      </div>
    </div>
  );
}

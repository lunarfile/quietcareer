'use client';

import { useEffect, useState } from 'react';
import { Flame } from 'lucide-react';

const MILESTONES = [
  { days: 7, label: 'One week', message: 'A full week of tracking. Patterns are starting to show.' },
  { days: 14, label: 'Two weeks', message: 'Two weeks in. You now know more about your work patterns than most people ever will.' },
  { days: 30, label: 'One month', message: 'A month of proof. This is no longer a habit — it\u2019s an asset.' },
  { days: 60, label: 'Two months', message: 'Two months of consistent career intelligence. Your proof file is becoming formidable.' },
  { days: 100, label: '100 days', message: '100 days. You\u2019ve built something most people only think about. This data is yours forever.' },
  { days: 365, label: 'One year', message: 'A full year of career intelligence. You own the most complete record of your professional impact that exists.' },
];

interface StreakMilestoneProps {
  streak: number;
}

export function StreakMilestone({ streak }: StreakMilestoneProps) {
  const [show, setShow] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const milestone = MILESTONES.find((m) => m.days === streak);

  useEffect(() => {
    if (!milestone) return;
    const key = `qc_milestone_${milestone.days}`;
    if (localStorage.getItem(key)) return;
    localStorage.setItem(key, 'true');
    setShow(true);
  }, [milestone]);

  if (!show || dismissed || !milestone) return null;

  return (
    <div className="rounded-[var(--radius-md)] border border-accent/30 bg-accent/5 p-4 animate-fade-up">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center shrink-0">
          <Flame size={20} className="text-accent" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-accent-text mb-1">
            {milestone.label} streak {'\u{1F525}'}
          </p>
          <p className="text-sm text-text-secondary leading-relaxed">
            {milestone.message}
          </p>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="text-text-tertiary hover:text-text-secondary text-xs transition-colors"
          aria-label="Dismiss"
        >
          \u00D7
        </button>
      </div>
    </div>
  );
}

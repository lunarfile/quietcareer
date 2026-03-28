'use client';

import { useState } from 'react';
import { suggestMicroRecovery } from '@/lib/wellness-intelligence';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { db, type EnergyLevel } from '@/lib/db';
import { generateId, now, todayISO } from '@/lib/utils';
import { useToast } from '@/components/ui/toast';
import { Heart, Timer, Check } from 'lucide-react';

interface MicroRecoveryProps {
  energyLevel: number;
  onRecheck?: () => void;
}

export function MicroRecoveryCard({ energyLevel, onRecheck }: MicroRecoveryProps) {
  const { toast } = useToast();
  const [state, setState] = useState<'suggest' | 'doing' | 'recheck' | 'done'>('suggest');
  const [seconds, setSeconds] = useState(0);
  const [dismissed, setDismissed] = useState(false);

  if (dismissed || energyLevel > 2) return null;

  const hour = new Date().getHours();
  const recovery = suggestMicroRecovery(energyLevel, hour);

  const handleStart = () => {
    setState('doing');
    const duration = parseInt(recovery.duration) || 60;
    setSeconds(duration);

    const interval = setInterval(() => {
      setSeconds((s) => {
        if (s <= 1) {
          clearInterval(interval);
          setState('recheck');
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  };

  const handleRecheck = async (level: EnergyLevel) => {
    await db.energyCheckins.add({
      id: generateId(),
      date: todayISO(),
      level,
      notes: `Post-reset (${recovery.name})`,
      suggestedMode: null,
      tags: ['post-recovery'],
      createdAt: now(),
    });
    setState('done');
    toast('Rechecked. Your before/after is tracked.', 'success');
  };

  if (state === 'done') {
    return (
      <Card className="bg-success/5 border-success/20">
        <div className="flex items-center gap-3">
          <Check size={16} className="text-success" />
          <p className="text-sm text-text-secondary">Reset complete. That data is logged.</p>
        </div>
      </Card>
    );
  }

  if (state === 'recheck') {
    return (
      <Card className="bg-accent/5 border-accent/20">
        <p className="text-sm text-text-primary mb-3">How do you feel now?</p>
        <div className="flex gap-2">
          {([1, 2, 3, 4, 5] as EnergyLevel[]).map((level) => (
            <button
              key={level}
              onClick={() => handleRecheck(level)}
              className="flex-1 py-2 text-lg rounded-[var(--radius-sm)] border border-surface-border hover:border-accent transition-all"
            >
              {['\u{1F634}', '\u{1F610}', '\u{1F642}', '\u{1F60A}', '\u{1F525}'][level - 1]}
            </button>
          ))}
        </div>
      </Card>
    );
  }

  if (state === 'doing') {
    return (
      <Card className="bg-accent-secondary/5 border-accent-secondary/20">
        <div className="text-center py-2">
          <div className="flex items-center justify-center gap-2 mb-3">
            <Timer size={14} className="text-accent-secondary" />
            <span className="text-2xl font-mono font-bold text-text-primary">{seconds}s</span>
          </div>
          <p className="text-sm text-text-primary font-medium mb-1">{recovery.name}</p>
          <p className="text-sm text-text-secondary leading-relaxed">{recovery.instruction}</p>
        </div>
      </Card>
    );
  }

  // suggest state
  return (
    <Card className="bg-bg-tertiary/50">
      <div className="flex items-start gap-3">
        <Heart size={16} className="text-accent-secondary shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm text-text-secondary">
            Your energy is low. A {recovery.duration} reset can help.
          </p>
          <div className="flex gap-2 mt-2">
            <Button size="sm" variant="secondary" onClick={handleStart}>
              <Timer size={12} /> {recovery.name} ({recovery.duration})
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setDismissed(true)}>
              Not now
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}

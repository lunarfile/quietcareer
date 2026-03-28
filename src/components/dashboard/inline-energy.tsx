'use client';

import { useState } from 'react';
import { db, type EnergyLevel } from '@/lib/db';
import { generateId, now, todayISO } from '@/lib/utils';
import { useToast } from '@/components/ui/toast';
import { copy } from '@/lib/copy';
import { Card } from '@/components/ui/card';
import { Battery } from 'lucide-react';

const LEVELS: { level: EnergyLevel; emoji: string }[] = [
  { level: 1, emoji: '\u{1F634}' },
  { level: 2, emoji: '\u{1F610}' },
  { level: 3, emoji: '\u{1F642}' },
  { level: 4, emoji: '\u{1F60A}' },
  { level: 5, emoji: '\u{1F525}' },
];

interface InlineEnergyProps {
  hasCheckedInToday: boolean;
}

export function InlineEnergy({ hasCheckedInToday }: InlineEnergyProps) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  if (hasCheckedInToday) return null;

  const handleQuickCheckin = async (level: EnergyLevel) => {
    setSaving(true);
    // Prevent duplicate check-ins for today
    const existing = await db.energyCheckins.where('date').equals(todayISO()).first();
    if (existing) {
      await db.energyCheckins.update(existing.id, { level, createdAt: now() });
      setSaving(false);
      toast(copy.energyToast(), 'success');
      return;
    }
    await db.energyCheckins.add({
      id: generateId(),
      date: todayISO(),
      level,
      notes: '',
      suggestedMode: null,
      tags: [],
      createdAt: now(),
    });
    setSaving(false);
    toast(copy.energyToast(), 'success');
  };

  return (
    <Card className="bg-bg-tertiary/30">
      <div className="flex items-center gap-4">
        <Battery size={16} className="text-energy-4 shrink-0" />
        <p className="text-sm text-text-secondary flex-1">How&apos;s your battery?</p>
        <div className="flex gap-1">
          {LEVELS.map((l) => (
            <button
              key={l.level}
              onClick={() => handleQuickCheckin(l.level)}
              disabled={saving}
              aria-label={`Energy level ${l.level}`}
              className="w-9 h-9 rounded-full hover:bg-surface-highlight active:scale-90 transition-all text-lg"
            >
              {l.emoji}
            </button>
          ))}
        </div>
      </div>
    </Card>
  );
}

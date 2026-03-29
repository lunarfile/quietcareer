'use client';
import { usePageTitle } from '@/hooks/use-page-title';
import { scheduleBackup } from '@/lib/auto-backup';

import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type EnergyLevel } from '@/lib/db';
import { generateId, now, todayISO } from '@/lib/utils';
import { Card, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast';
import { copy } from '@/lib/copy';
import { encryptCheckin } from '@/lib/field-encryption';
import { suggestEnergyMode, getModeCopy } from '@/lib/scoring';
import { MicroRecoveryCard } from '@/components/dashboard/micro-recovery';
import { detectEnergyPatterns } from '@/lib/wellness-intelligence';
import { format, parseISO, isToday } from 'date-fns';

const ENERGY_LEVELS: { level: EnergyLevel; emoji: string; label: string }[] = [
  { level: 1, emoji: '\u{1F634}', label: 'Exhausted' },
  { level: 2, emoji: '\u{1F610}', label: 'Low' },
  { level: 3, emoji: '\u{1F642}', label: 'Okay' },
  { level: 4, emoji: '\u{1F60A}', label: 'Good' },
  { level: 5, emoji: '\u{1F525}', label: 'Thriving' },
];

export default function EnergyPage() {
  const { toast } = useToast();
  usePageTitle('Battery');
  const [selectedLevel, setSelectedLevel] = useState<EnergyLevel | null>(null);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const todayCheckin = useLiveQuery(
    () => db.energyCheckins.where('date').equals(todayISO()).first()
  );
  const recentCheckins = useLiveQuery(
    () => db.energyCheckins.orderBy('createdAt').reverse().limit(14).toArray()
  );

  const handleSubmit = async () => {
    if (!selectedLevel) return;
    setSaving(true);
    const checkin = await encryptCheckin({
      id: generateId(),
      date: todayISO(),
      level: selectedLevel,
      notes: notes.trim(),
      suggestedMode: null,
      tags: [],
      createdAt: now(),
    });
    await db.energyCheckins.add(checkin);
    setSelectedLevel(null);
    setNotes('');
    setSaving(false);
    toast(copy.energyToast(), 'success');
    scheduleBackup();
  };

  // Stats
  const last7 = recentCheckins?.slice(0, 7) ?? [];
  const avg = last7.length > 0 ? last7.reduce((s, e) => s + e.level, 0) / last7.length : 0;

  return (
    <div className="animate-fade-up space-y-5">
      {/* Before check-in */}
      {!todayCheckin ? (
        <>
          <div>
            <h1 className="text-xl font-semibold text-text-primary tracking-tight">
              How are you feeling?
            </h1>
            <p className="text-sm text-text-tertiary mt-1">Only you see this.</p>
          </div>

          {/* Energy selector — large buttons */}
          <div className="flex gap-3">
            {ENERGY_LEVELS.map((e) => (
              <button
                key={e.level}
                onClick={() => setSelectedLevel(e.level)}
                role="radio"
                aria-checked={selectedLevel === e.level}
                aria-label={`Energy level ${e.level}: ${e.label}`}
                className={`flex-1 flex flex-col items-center gap-2 py-5 rounded-2xl border-2 transition-all duration-200 ${
                  selectedLevel === e.level
                    ? 'border-accent bg-accent-muted ring-2 ring-accent/30 scale-105'
                    : 'border-surface-border active:scale-95'
                }`}
              >
                <span className="text-3xl">{e.emoji}</span>
                <span className="text-[10px] font-medium text-text-secondary tracking-wide">
                  {e.label}
                </span>
              </button>
            ))}
          </div>

          {/* Note (shows after selecting) */}
          {selectedLevel && (
            <div className="animate-fade-in">
              <Textarea
                id="energy-notes"
                placeholder="Anything on your mind? (optional)"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
              />
            </div>
          )}

          <Button
            className="w-full"
            size="lg"
            onClick={handleSubmit}
            disabled={!selectedLevel || saving}
          >
            {saving ? 'Saving...' : 'Log Energy'}
          </Button>
        </>
      ) : (
        /* After check-in */
        <>
          <div>
            <h1 className="text-lg font-semibold text-text-primary">Battery</h1>
            <p className="text-xs text-text-tertiary">Checked in today</p>
          </div>

          {/* Today's level + mode */}
          <Card className={getModeCopy(suggestEnergyMode(avg > 0 ? avg : todayCheckin.level)).bgColor}>
            <div className="flex items-center gap-4 mb-3">
              <span className="text-4xl">{ENERGY_LEVELS[todayCheckin.level - 1].emoji}</span>
              <div>
                <p className="text-xl font-semibold text-text-primary">
                  {ENERGY_LEVELS[todayCheckin.level - 1].label}
                  <span className="text-sm font-normal text-text-secondary ml-2">{todayCheckin.level}/5</span>
                </p>
                {todayCheckin.notes && (
                  <p className="text-sm text-text-secondary mt-0.5">{todayCheckin.notes}</p>
                )}
              </div>
            </div>
            {/* Mode suggestion inline */}
            {(() => {
              const mode = suggestEnergyMode(avg > 0 ? avg : todayCheckin.level);
              const mc = getModeCopy(mode);
              return (
                <div className="flex items-center gap-2 pt-3 border-t border-surface-border/30">
                  <span className="text-lg">{mc.emoji}</span>
                  <div>
                    <p className={`text-sm font-semibold ${mc.color}`}>{mc.label} Mode</p>
                    <p className="text-xs text-text-secondary">{mc.advice.split('.')[0]}.</p>
                  </div>
                </div>
              );
            })()}
          </Card>

          {/* Micro-recovery (only when low energy) */}
          <MicroRecoveryCard energyLevel={todayCheckin.level} />

          {/* Last 7 bar chart */}
          {last7.length > 1 && (
            <Card>
              <CardTitle className="text-sm mb-3">Last 7 Check-ins</CardTitle>
              <CardContent>
                <div className="flex items-end gap-2 h-24">
                  {[...last7].reverse().map((e) => {
                    const info = ENERGY_LEVELS[e.level - 1];
                    return (
                      <div key={e.id} className="flex-1 flex flex-col items-center gap-1.5">
                        <span className="text-xs">{info.emoji}</span>
                        <div className="w-full flex flex-col justify-end h-14">
                          <div
                            className="w-full rounded-t-md transition-all duration-500"
                            style={{
                              height: `${(e.level / 5) * 100}%`,
                              backgroundColor: `var(--color-energy-${e.level})`,
                            }}
                          />
                        </div>
                        <span className="text-[9px] text-text-tertiary">
                          {format(parseISO(e.date), 'EEE')}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Pattern insights */}
          {(() => {
            if (!recentCheckins || recentCheckins.length < 7) return null;
            const patterns = detectEnergyPatterns(
              recentCheckins.map((c) => ({ date: c.date, level: c.level })),
              []
            );
            if (patterns.length === 0) return null;
            return (
              <Card>
                <CardTitle className="text-sm mb-3">What Your Data Shows</CardTitle>
                <CardContent>
                  <div className="space-y-2">
                    {patterns.slice(0, 2).map((p, i) => (
                      <p key={i} className={`text-sm leading-relaxed ${p.severity === 'warning' ? 'text-warning-text' : 'text-text-secondary'}`}>
                        {p.message}
                      </p>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })()}
        </>
      )}
    </div>
  );
}

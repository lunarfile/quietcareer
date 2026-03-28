'use client';
import { usePageTitle } from '@/hooks/use-page-title';

import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type EnergyLevel } from '@/lib/db';
import { generateId, now, todayISO } from '@/lib/utils';
import { Card, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/input';
import { MetricCard } from '@/components/ui/metric-card';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/toast';
import { Battery, TrendingUp, TrendingDown, Zap, Calendar } from 'lucide-react';
import dynamic from 'next/dynamic';
const EnergyChart = dynamic(() => import('@/components/charts/energy-chart').then((m) => m.EnergyChart), { ssr: false });
import { suggestEnergyMode, getModeCopy } from '@/lib/scoring';
import { copy } from '@/lib/copy';
import { format, parseISO, isToday } from 'date-fns';

const ENERGY_LEVELS: {
  level: EnergyLevel;
  emoji: string;
  label: string;
  color: string;
  barColor: string;
}[] = [
  { level: 1, emoji: '\u{1F634}', label: 'Exhausted', color: 'border-energy-1 bg-energy-1/10 ring-energy-1/30', barColor: 'bg-energy-1' },
  { level: 2, emoji: '\u{1F610}', label: 'Low', color: 'border-energy-2 bg-energy-2/10 ring-energy-2/30', barColor: 'bg-energy-2' },
  { level: 3, emoji: '\u{1F642}', label: 'Okay', color: 'border-energy-3 bg-energy-3/10 ring-energy-3/30', barColor: 'bg-energy-3' },
  { level: 4, emoji: '\u{1F60A}', label: 'Good', color: 'border-energy-4 bg-energy-4/10 ring-energy-4/30', barColor: 'bg-energy-4' },
  { level: 5, emoji: '\u{1F525}', label: 'Thriving', color: 'border-energy-5 bg-energy-5/10 ring-energy-5/30', barColor: 'bg-energy-5' },
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
    () => db.energyCheckins.orderBy('createdAt').reverse().limit(30).toArray()
  );

  const totalCheckins = useLiveQuery(() => db.energyCheckins.count());

  const handleSubmit = async () => {
    if (!selectedLevel) return;
    setSaving(true);

    await db.energyCheckins.add({
      id: generateId(),
      date: todayISO(),
      level: selectedLevel,
      notes: notes.trim(),
      suggestedMode: null,
      tags: [],
      createdAt: now(),
    });

    setSelectedLevel(null);
    setNotes('');
    setSaving(false);
    toast(copy.energyToast(), 'success');
  };

  // Stats
  const last7 = recentCheckins?.slice(0, 7) ?? [];
  const avg = last7.length > 0
    ? (last7.reduce((s, e) => s + e.level, 0) / last7.length)
    : 0;
  const prevAvg = recentCheckins && recentCheckins.length > 7
    ? recentCheckins.slice(7, 14).reduce((s, e) => s + e.level, 0) / Math.min(recentCheckins.length - 7, 7)
    : avg;
  const trend = avg > prevAvg ? 'up' : avg < prevAvg ? 'down' : 'flat';

  return (
    <div className="animate-fade-up space-y-6">
      <PageHeader
        icon={Battery}
        iconColor="text-energy-4"
        title="Battery"
        subtitle="Track what drains you and what charges you"
      />

      {/* Today's check-in */}
      {todayCheckin ? (
        <>
          <Card variant="accent">
            <div className="flex items-center gap-4">
              <span className="text-4xl">
                {ENERGY_LEVELS[todayCheckin.level - 1].emoji}
              </span>
              <div>
                <p className="text-xs uppercase tracking-wider text-text-tertiary mb-1">
                  Today&apos;s Energy
                </p>
                <p className="text-xl font-semibold text-text-primary">
                  {ENERGY_LEVELS[todayCheckin.level - 1].label}
                  <span className="text-sm font-normal text-text-secondary ml-2">
                    {todayCheckin.level} / 5
                  </span>
                </p>
                {todayCheckin.notes && (
                  <p className="text-sm text-text-secondary mt-1">{todayCheckin.notes}</p>
                )}
              </div>
            </div>
          </Card>

          {/* Adaptive Mode Suggestion */}
          {(() => {
            const mode = suggestEnergyMode(avg > 0 ? avg : todayCheckin.level);
            const mc = getModeCopy(mode);
            return (
              <Card className={mc.bgColor}>
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{mc.emoji}</span>
                  <div>
                    <p className="text-xs uppercase tracking-wider text-text-tertiary mb-1">Suggested Mode</p>
                    <p className={`text-base font-semibold ${mc.color}`}>{mc.label}</p>
                    <p className="text-sm text-text-secondary mt-1 leading-relaxed">{mc.advice}</p>
                  </div>
                </div>
              </Card>
            );
          })()}
        </>
      ) : (
        <Card>
          <p className="text-base font-medium text-text-primary mb-2">
            How are you feeling today?
          </p>
          <p className="text-sm text-text-tertiary mb-5">
            Only you can see this. It helps spot patterns over time.
          </p>

          <div className="grid grid-cols-5 gap-2 mb-5" role="radiogroup" aria-label="Energy level">
            {ENERGY_LEVELS.map((e) => (
              <button
                key={e.level}
                onClick={() => setSelectedLevel(e.level)}
                role="radio"
                aria-checked={selectedLevel === e.level}
                aria-label={`Energy level ${e.level}: ${e.label}`}
                className={`flex flex-col items-center gap-2 py-4 rounded-[var(--radius-md)] border-2 transition-all duration-200 ${
                  selectedLevel === e.level
                    ? `${e.color} ring-2 scale-[1.05]`
                    : 'border-surface-border hover:border-surface-border-hover'
                }`}
              >
                <span className="text-3xl">{e.emoji}</span>
                <span className="text-[11px] font-medium text-text-secondary">
                  {e.label}
                </span>
              </button>
            ))}
          </div>

          <Textarea
            id="energy-notes"
            placeholder="Anything on your mind? (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
          />

          <Button
            onClick={handleSubmit}
            disabled={!selectedLevel || saving}
            className="mt-4"
          >
            {saving ? 'Saving...' : 'Log Energy'}
          </Button>
        </Card>
      )}

      {/* Stats row */}
      {(totalCheckins ?? 0) > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <MetricCard
            label="7-Day Avg"
            value={avg > 0 ? avg.toFixed(1) : '\u2014'}
            icon={Zap}
            iconColor="text-accent"
            suffix="/ 5"
            trend={last7.length >= 3 ? (trend as 'up' | 'down' | 'flat') : undefined}
          />
          <MetricCard
            label="Total Check-ins"
            value={totalCheckins ?? 0}
            icon={Calendar}
            iconColor="text-accent-secondary"
          />
          <MetricCard
            label="Best Day"
            value={last7.length > 0 ? Math.max(...last7.map((e) => e.level)) : '\u2014'}
            icon={TrendingUp}
            iconColor="text-success"
            suffix="/ 5"
          />
        </div>
      )}

      {/* Recharts energy trend */}
      {recentCheckins && recentCheckins.length > 2 && (
        <Card>
          <CardTitle className="text-base mb-4">Energy Over Time</CardTitle>
          <CardContent>
            <EnergyChart checkins={recentCheckins} />
          </CardContent>
        </Card>
      )}

      {/* Weekly bar chart */}
      {last7.length > 0 && (
        <Card>
          <CardTitle className="text-base mb-4">Last 7 Check-ins</CardTitle>
          <CardContent>
            <div className="flex items-end gap-2 h-32">
              {[...last7].reverse().map((e, i) => {
                const info = ENERGY_LEVELS[e.level - 1];
                return (
                  <div key={e.id} className="flex-1 flex flex-col items-center gap-2">
                    <span className="text-xs">{info.emoji}</span>
                    <div className="w-full flex flex-col justify-end h-20">
                      <div
                        className={`w-full rounded-t-md ${info.barColor} transition-all duration-700`}
                        style={{
                          height: `${(e.level / 5) * 100}%`,
                          animationDelay: `${i * 0.08}s`,
                        }}
                      />
                    </div>
                    <span className="text-[10px] text-text-tertiary">
                      {format(parseISO(e.date), 'EEE')}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Energy-Work Correlation Insight */}
      {recentCheckins && recentCheckins.length >= 5 && (
        <Card>
          <CardTitle className="text-base mb-3">Pattern Insight</CardTitle>
          <CardContent>
            {(() => {
              const highDays = recentCheckins.filter((c) => c.level >= 4).map((c) => c.date);
              const lowDays = recentCheckins.filter((c) => c.level <= 2).map((c) => c.date);

              if (highDays.length === 0 && lowDays.length === 0) {
                return <p className="text-sm text-text-tertiary">Keep logging to reveal patterns.</p>;
              }

              const avgLevel = recentCheckins.reduce((s, c) => s + c.level, 0) / recentCheckins.length;
              const dayOfWeekAvg: Record<number, { total: number; count: number }> = {};
              recentCheckins.forEach((c) => {
                const dow = new Date(c.date).getDay();
                if (!dayOfWeekAvg[dow]) dayOfWeekAvg[dow] = { total: 0, count: 0 };
                dayOfWeekAvg[dow].total += c.level;
                dayOfWeekAvg[dow].count++;
              });

              const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
              const sorted = Object.entries(dayOfWeekAvg)
                .map(([dow, data]) => ({ dow: parseInt(dow), avg: data.total / data.count }))
                .sort((a, b) => b.avg - a.avg);

              const bestDay = sorted[0];
              const worstDay = sorted[sorted.length - 1];

              return (
                <div className="space-y-2 text-sm text-text-secondary">
                  {bestDay && worstDay && bestDay.dow !== worstDay.dow && (
                    <p>
                      Your best day is typically <strong className="text-text-primary">{dayNames[bestDay.dow]}</strong> (avg {bestDay.avg.toFixed(1)}/5).
                      Your hardest is <strong className="text-text-primary">{dayNames[worstDay.dow]}</strong> (avg {worstDay.avg.toFixed(1)}/5).
                    </p>
                  )}
                  {avgLevel < 2.5 && (
                    <p className="text-warning-text">
                      Your average energy has been below 2.5 for a while. That\u2019s a burnout signal worth taking seriously.
                    </p>
                  )}
                  {highDays.length > lowDays.length * 2 && (
                    <p className="text-success-text">
                      More good days than bad recently. Whatever you\u2019re doing, keep it up.
                    </p>
                  )}
                </div>
              );
            })()}
          </CardContent>
        </Card>
      )}

      {/* History */}
      {recentCheckins && recentCheckins.length > 0 && (
        <div>
          <h2 className="text-base font-medium text-text-primary mb-3">History</h2>
          <div className="space-y-1.5">
            {recentCheckins.map((c) => {
              const info = ENERGY_LEVELS[c.level - 1];
              return (
                <div
                  key={c.id}
                  className="flex items-center gap-3 py-2.5 px-3 rounded-[var(--radius-sm)] hover:bg-surface-highlight transition-colors"
                >
                  <span className="text-lg">{info.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm text-text-primary">{info.label}</span>
                    {c.notes && (
                      <p className="text-xs text-text-tertiary truncate">{c.notes}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-1.5 rounded-full ${info.barColor}/50`}>
                      <div
                        className={`h-full rounded-full ${info.barColor}`}
                        style={{ width: `${(c.level / 5) * 100}%` }}
                      />
                    </div>
                    <span className="text-[11px] text-text-tertiary font-mono w-12 text-right">
                      {isToday(parseISO(c.date))
                        ? 'Today'
                        : format(parseISO(c.date), 'MMM d')}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {(totalCheckins ?? 0) === 0 && todayCheckin && (
        <EmptyState
          icon={Battery}
          title="Your first check-in is logged"
          description="Come back tomorrow to start seeing patterns. Consistency reveals insights."
        />
      )}
    </div>
  );
}

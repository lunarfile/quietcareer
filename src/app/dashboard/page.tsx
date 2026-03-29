'use client';
import { usePageTitle } from '@/hooks/use-page-title';

import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type EnergyLevel } from '@/lib/db';
import { getUserRole, getSetting } from '@/lib/settings';
import { todayISO, generateId, now, relativeTime } from '@/lib/utils';
import { suggestEnergyMode, getModeCopy } from '@/lib/scoring';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { copy } from '@/lib/copy';
import { useToast } from '@/components/ui/toast';
import Link from 'next/link';
import { QuickActionsCarousel } from '@/components/dashboard/quick-actions-carousel';
import {
  PenLine,
  Flame,
  Trophy,
  ArrowRight,
  Sparkles,
  Check,
} from 'lucide-react';
import { format, startOfWeek, addDays, isSameDay } from 'date-fns';

const ENERGY_EMOJI = ['', '\u{1F634}', '\u{1F610}', '\u{1F642}', '\u{1F60A}', '\u{1F525}'];
const ENERGY_LABELS = ['', 'Exhausted', 'Low', 'Okay', 'Good', 'Thriving'];

export default function DashboardPage() {
  usePageTitle('Home');
  const { toast } = useToast();
  const [role, setRole] = useState('');
  const [concerns, setConcerns] = useState<string[]>([]);
  const today = todayISO();

  useEffect(() => {
    Promise.all([getUserRole(), getSetting('user_concerns')]).then(([r, c]) => {
      setRole(r ?? '');
      setConcerns(c ? JSON.parse(c) : []);
    });
  }, []);

  // Queries
  const todayLogs = useLiveQuery(
    () => db.workLogs.where('date').equals(today).toArray(), [today]
  );
  const totalLogs = useLiveQuery(() => db.workLogs.count());
  const latestEnergy = useLiveQuery(
    () => db.energyCheckins.where('date').equals(today).first()
  );
  const recentEnergy = useLiveQuery(
    () => db.energyCheckins.orderBy('createdAt').reverse().limit(7).toArray()
  );
  const recentLogs = useLiveQuery(
    () => db.workLogs.orderBy('createdAt').reverse().limit(3).toArray()
  );

  // Week data
  const weekLogs = useLiveQuery(() => {
    const ws = startOfWeek(new Date(), { weekStartsOn: 1 });
    const start = format(ws, 'yyyy-MM-dd');
    const end = format(addDays(ws, 6), 'yyyy-MM-dd');
    return db.workLogs.where('date').between(start, end, true, true).toArray();
  });

  const loggedDays = new Set(weekLogs?.map((l) => l.date));
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 5 }, (_, i) => addDays(weekStart, i));

  // Streak
  const allLogDates = useLiveQuery(
    () => db.workLogs.orderBy('date').reverse().uniqueKeys()
  );
  let streak = 0;
  if (allLogDates) {
    const dates = allLogDates as string[];
    const checkDate = new Date();
    for (const date of dates) {
      const expected = format(new Date(checkDate.getTime() - streak * 86400000), 'yyyy-MM-dd');
      if (date === expected) streak++;
      else if (streak === 0 && date === format(new Date(checkDate.getTime() - 86400000), 'yyyy-MM-dd')) streak++;
      else break;
    }
  }

  // Energy mode
  const avgEnergy = recentEnergy && recentEnergy.length > 0
    ? recentEnergy.reduce((s, e) => s + e.level, 0) / recentEnergy.length
    : 3;
  const mode = suggestEnergyMode(avgEnergy);
  const modeCopy = getModeCopy(mode);

  // Hero card state
  const hasLoggedToday = (todayLogs?.length ?? 0) > 0;
  const hasCheckedIn = !!latestEnergy;

  // Smart prompt
  const getPrompt = () => {
    if (concerns.includes('burnout')) return "What drained you today? What didn\u2019t?";
    if (concerns.includes('promotion')) return 'What did you do today worth documenting?';
    if (concerns.includes('layoff')) return 'One sentence. That\u2019s all it takes to build your safety net.';
    if (concerns.includes('quit')) return 'What happened today? Every entry gets you closer to choosing freely.';
    return 'What actually happened at work today?';
  };

  // Inline energy check-in
  const handleQuickEnergy = async (level: EnergyLevel) => {
    const existing = await db.energyCheckins.where('date').equals(today).first();
    if (existing) {
      await db.energyCheckins.update(existing.id, { level, createdAt: now() });
    } else {
      await db.energyCheckins.add({
        id: generateId(),
        date: today,
        level,
        notes: '',
        suggestedMode: null,
        tags: [],
        createdAt: now(),
      });
    }
    toast(copy.energyToast(), 'success');
  };

  const greeting = getGreeting();

  return (
    <div className="animate-fade-up space-y-5">
      {/* Date + Greeting */}
      <div>
        <p className="text-xs text-text-tertiary uppercase tracking-widest font-medium">
          {format(new Date(), 'EEEE')}
        </p>
        <p className="text-xs text-text-tertiary mb-1">
          {format(new Date(), 'MMMM d')}
        </p>
        <h1 className="text-xl font-semibold text-text-primary tracking-tight leading-snug">
          {greeting}{role ? `, ${role}` : ''}.
        </h1>
      </div>

      {/* Quick Actions Carousel */}
      <div>
        <span className="text-xs text-text-tertiary uppercase tracking-wider font-medium mb-3 block">
          Quick Actions
        </span>
        <QuickActionsCarousel />
      </div>

      {/* Recent Activity — horizontal scrollable cards */}
      {recentLogs && recentLogs.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-text-tertiary uppercase tracking-wider font-medium">
              Recent Activity
            </span>
            <Link href="/journal" className="flex items-center gap-1 text-xs text-accent active:opacity-70">
              See all <ArrowRight size={12} />
            </Link>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-5 px-5 snap-x snap-mandatory scrollbar-hide">
            {recentLogs.slice(0, 5).map((log) => (
              <Link
                href="/journal"
                key={log.id}
                className="snap-start shrink-0 w-[200px] bg-bg-secondary border border-surface-border rounded-xl p-3.5 active:scale-[0.98] transition-transform"
              >
                <span className="text-sm mb-1.5 block">
                  {log.impactType === 'shipped' ? '\u{1F680}' : log.impactType === 'fixed' ? '\u{1F527}' : log.impactType === 'led' ? '\u{1F451}' : '\u{1F4CC}'}
                </span>
                <p className="text-sm text-text-primary line-clamp-2 leading-snug">{log.content}</p>
                <div className="flex items-center gap-1.5 mt-2">
                  {log.aiRewrite && <Sparkles size={10} className="text-accent" />}
                  <span className="text-[10px] text-text-tertiary">{relativeTime(log.createdAt)}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* === HERO CARD === */}
      {!hasLoggedToday && (
        /* State A: No entry today */
        <Card variant="accent" className="py-6">
          <p className="text-base font-medium text-text-primary mb-2">
            {getPrompt()}
          </p>
          <p className="text-sm text-text-secondary mb-5 leading-relaxed">
            One sentence is enough. It compounds over time.
          </p>
          <Link href="/journal">
            <Button className="w-full">
              <PenLine size={16} /> Write It Down <ArrowRight size={14} />
            </Button>
          </Link>
        </Card>
      )}

      {hasLoggedToday && !hasCheckedIn && (
        /* State B: Logged, no energy check */
        <Card className="py-5">
          <div className="flex items-center gap-2 mb-4">
            <Check size={14} className="text-success" />
            <span className="text-sm text-success-text">Entry logged today</span>
          </div>
          <p className="text-base font-medium text-text-primary mb-4">
            How&apos;s your energy?
          </p>
          <div className="flex gap-3">
            {([1, 2, 3, 4, 5] as EnergyLevel[]).map((level) => (
              <button
                key={level}
                onClick={() => handleQuickEnergy(level)}
                className="flex-1 flex flex-col items-center gap-1.5 py-3 rounded-xl border-2 border-surface-border active:scale-95 active:border-accent transition-all"
                aria-label={`Energy ${level}: ${ENERGY_LABELS[level]}`}
              >
                <span className="text-2xl">{ENERGY_EMOJI[level]}</span>
                <span className="text-[9px] text-text-tertiary">{ENERGY_LABELS[level]}</span>
              </button>
            ))}
          </div>
        </Card>
      )}

      {hasLoggedToday && hasCheckedIn && (
        /* State C: Both done */
        <Card className={`py-5 ${modeCopy.bgColor}`}>
          <div className="flex items-center gap-2 mb-3">
            <Check size={14} className="text-success" />
            <span className="text-sm text-text-secondary">You&apos;re set for today.</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-2xl">{modeCopy.emoji}</span>
            <div>
              <p className={`text-base font-semibold ${modeCopy.color}`}>
                {modeCopy.label} Mode
              </p>
              <p className="text-sm text-text-secondary leading-relaxed mt-0.5">
                {modeCopy.advice.split('.')[0]}.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Week dots */}
      <div className="flex items-center justify-between px-4">
        {weekDays.map((day) => {
          const dateStr = format(day, 'yyyy-MM-dd');
          const logged = loggedDays.has(dateStr);
          const isToday = isSameDay(day, new Date());
          return (
            <div key={dateStr} className="flex flex-col items-center gap-2">
              <span className="text-[10px] text-text-tertiary uppercase">
                {format(day, 'EEEEE')}
              </span>
              <div className={`w-3 h-3 rounded-full transition-all ${
                logged
                  ? 'bg-success shadow-sm shadow-success/30'
                  : isToday
                    ? 'bg-accent/30 ring-2 ring-accent/20'
                    : 'bg-surface-border'
              }`} />
            </div>
          );
        })}
      </div>

      {/* Stats — inline, not cards */}
      <div className="space-y-2">
        {streak > 0 && (
          <div className="flex items-center gap-2.5">
            <Flame size={14} className="text-warning" />
            <span className="text-sm text-text-secondary">{streak}-day streak</span>
          </div>
        )}
        <div className="flex items-center gap-2.5">
          <Trophy size={14} className="text-accent" />
          <span className="text-sm text-text-secondary">{totalLogs ?? 0} proof points</span>
        </div>
      </div>

      {/* Recent entries moved to horizontal carousel above */}
    </div>
  );
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

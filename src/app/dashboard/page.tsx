'use client';
import { usePageTitle } from '@/hooks/use-page-title';

import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { getUserRole, getSetting } from '@/lib/settings';
import { getGreeting, todayISO } from '@/lib/utils';
import {
  calculateImpactScore,
  calculateVisibilityScore,
  calculateSkillsDiversity,
  calculateRunwayScore,
  calculateEnergyTrend,
  calculateRiskLevel,
  suggestEnergyMode,
  getModeCopy,
  type TrafficLightScore,
} from '@/lib/scoring';
import { Card, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { SkeletonDashboard } from '@/components/ui/skeleton';
import { TrafficLightCard, RiskBadge } from '@/components/ui/traffic-light';
import dynamic from 'next/dynamic';
const CareerHeatmap = dynamic(() => import('@/components/charts/career-heatmap').then((m) => m.CareerHeatmap), { ssr: false });
import { InlineEnergy } from '@/components/dashboard/inline-energy';
import { StreakMilestone } from '@/components/dashboard/streak-milestone';
import { RecentActivity } from '@/components/dashboard/recent-activity';
import { BackupReminder } from '@/components/dashboard/backup-reminder';
const ActivityChart = dynamic(() => import('@/components/charts/activity-chart').then((m) => m.ActivityChart), { ssr: false });
import Link from 'next/link';
import {
  PenLine,
  Battery,
  Trophy,
  Rocket,
  Calendar,
  Flame,
  Sparkles,
  ArrowRight,
  Users,
} from 'lucide-react';
import { format, startOfWeek, addDays, isSameDay, subDays } from 'date-fns';

export default function DashboardPage() {
  usePageTitle('My Week');
  const [role, setRole] = useState('');
  const [loading, setLoading] = useState(true);
  const [concerns, setConcerns] = useState<string[]>([]);
  const today = todayISO();

  useEffect(() => {
    Promise.all([getUserRole(), getSetting('user_concerns')]).then(([r, c]) => {
      setRole(r ?? '');
      setConcerns(c ? JSON.parse(c) : []);
      setLoading(false);
    });

    // Monday auto-redirect to weekly snapshot
    const day = new Date().getDay();
    if (day === 1) {
      const lastShown = localStorage.getItem('qc_monday_snapshot');
      const todayStr = new Date().toISOString().split('T')[0];
      if (lastShown !== todayStr) {
        localStorage.setItem('qc_monday_snapshot', todayStr);
        // Only redirect if user has data
        db.workLogs.count().then((count) => {
          if (count >= 3) {
            window.location.href = '/snapshot';
          }
        });
      }
    }
  }, []);

  // Data queries
  const recentLogs = useLiveQuery(
    () => db.workLogs.where('date').equals(today).toArray(), [today]
  );
  const allLogs = useLiveQuery(
    () => db.workLogs.orderBy('createdAt').reverse().limit(100).toArray()
  );
  const totalLogs = useLiveQuery(() => db.workLogs.count());
  const latestEnergy = useLiveQuery(
    () => db.energyCheckins.where('date').equals(today).first()
  );
  const recentEnergy = useLiveQuery(
    () => db.energyCheckins.orderBy('createdAt').reverse().limit(30).toArray()
  );
  const bragDocs = useLiveQuery(
    () => db.bragDocuments.orderBy('createdAt').reverse().limit(10).toArray()
  );
  const meetings = useLiveQuery(() => db.meetings.toArray());
  const financials = useLiveQuery(() => db.financialData.toArray());

  const weekLogs = useLiveQuery(() => {
    const ws = startOfWeek(new Date(), { weekStartsOn: 1 });
    const start = format(ws, 'yyyy-MM-dd');
    const end = format(addDays(ws, 6), 'yyyy-MM-dd');
    return db.workLogs.where('date').between(start, end, true, true).toArray();
  });

  if (loading) return <SkeletonDashboard />;

  // === Scoring ===
  const last30Logs = allLogs?.filter((l) => {
    const cutoff = format(subDays(new Date(), 30), 'yyyy-MM-dd');
    return l.date >= cutoff;
  }) ?? [];
  const prev30Logs = allLogs?.filter((l) => {
    const start = format(subDays(new Date(), 60), 'yyyy-MM-dd');
    const end = format(subDays(new Date(), 30), 'yyyy-MM-dd');
    return l.date >= start && l.date < end;
  }) ?? [];

  const last30Energy = recentEnergy?.slice(0, 14) ?? [];
  const prev30Energy = recentEnergy?.slice(14, 28) ?? [];

  const totalExpenses = financials?.filter((f) => f.type === 'expense').reduce((s, f) => s + f.amount, 0) ?? 0;
  const totalSavings = financials?.filter((f) => f.type === 'savings').reduce((s, f) => s + f.amount, 0) ?? 0;
  const runwayMonths = totalExpenses > 0 ? totalSavings / totalExpenses : 0;

  const scores: TrafficLightScore[] = [
    calculateImpactScore(last30Logs, prev30Logs),
    calculateVisibilityScore(bragDocs ?? [], meetings ?? [], 0),
    calculateSkillsDiversity(last30Logs, prev30Logs),
    calculateRunwayScore(runwayMonths, runwayMonths),
    calculateEnergyTrend(last30Energy, prev30Energy),
  ];

  const riskLevel = calculateRiskLevel(scores);

  // Energy mode
  const avgEnergy = last30Energy.length > 0
    ? last30Energy.reduce((s, e) => s + e.level, 0) / last30Energy.length
    : 3;
  const mode = suggestEnergyMode(avgEnergy);
  const modeCopy = getModeCopy(mode);

  // Week data
  const loggedDays = new Set(weekLogs?.map((l) => l.date));
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 5 }, (_, i) => addDays(weekStart, i));

  // Streak
  const uniqueDates = [...new Set(allLogs?.map((l) => l.date) ?? [])].sort().reverse();
  let streak = 0;
  const checkDate = new Date();
  for (const date of uniqueDates) {
    const expected = format(subDays(checkDate, streak), 'yyyy-MM-dd');
    if (date === expected) {
      streak++;
    } else if (streak === 0 && date === format(subDays(checkDate, 1), 'yyyy-MM-dd')) {
      streak++;
    } else {
      break;
    }
  }

  // Smart prompt
  const getPrompt = () => {
    if ((recentLogs?.length ?? 0) > 0) return null;
    if (concerns.includes('burnout')) return "What drained you today? What didn\u2019t? Write it down \u2014 patterns emerge fast.";
    if (concerns.includes('promotion')) return 'What did you do today that your manager should know about? Write it before you forget.';
    if (concerns.includes('layoff')) return 'One sentence about what you did today. That\u2019s all it takes to build your safety net.';
    if (concerns.includes('quit')) return 'What happened at work today? Every entry gets you closer to choosing freely.';
    return 'What actually happened at work today? One sentence is enough.';
  };
  const prompt = getPrompt();

  function getSmartGreeting(energy: number, streakDays: number, risk: string, userRole: string): string {
    const name = userRole ? `, ${userRole}` : '';

    // Energy-first greetings
    if (energy <= 2) {
      if (risk === 'HIGH') return `Tough stretch${name}. But you're tracking, and that puts you ahead.`;
      return `Running on low${name}. Be extra kind to yourself today.`;
    }
    if (energy >= 4 && streakDays >= 8) return `Good week${name}. ${streakDays}-day streak. You're building a clear picture.`;
    if (energy >= 4) return `Good energy today${name}. Capture what's working.`;

    // Streak-based
    if (streakDays >= 8) return `${streakDays} days straight${name}. You know more about your work life than most people ever will.`;
    if (streakDays >= 4) return `${streakDays}-day streak${name}. Patterns are starting to show.`;
    if (streakDays === 0) return `Welcome back${name}. Pick up wherever.`;

    // Risk-based
    if (risk === 'HIGH') return `Some signals worth watching${name}. Your data is showing you where to look.`;
    if (risk === 'LOW') return `Things look stable${name}. Good time to plan, not react.`;

    // Default
    return `${getGreeting()}${name}. Steady.`;
  }

  return (
    <div className="animate-fade-up space-y-6">
      {/* Header + Risk Level */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-text-primary tracking-tight">
            {getSmartGreeting(avgEnergy, streak, riskLevel, role)}
          </h1>
          <p className="text-sm text-text-secondary mt-0.5">
            {format(new Date(), 'EEEE, MMMM d')}
          </p>
        </div>
        <div className="group relative">
          <RiskBadge level={riskLevel} />
          <div className="absolute right-0 top-full mt-2 w-64 p-3 rounded-[var(--radius-md)] bg-bg-tertiary border border-surface-border shadow-lg text-xs text-text-secondary leading-relaxed opacity-0 group-hover:opacity-100 transition-opacity z-20 pointer-events-none">
            {riskLevel === 'LOW' && 'Things look stable. Your metrics are healthy across the board.'}
            {riskLevel === 'MODERATE' && 'A few areas need attention. Check the yellow/red metrics below for specifics.'}
            {riskLevel === 'HIGH' && 'Multiple signals need attention. Focus on logging work and building proof to reduce exposure.'}
          </div>
        </div>
      </div>

      {/* Traffic Light Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 stagger-children">
        {scores.map((score) => (
          <TrafficLightCard key={score.label} score={score} />
        ))}
      </div>

      {/* Energy Mode + Streak row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Adaptive Mode */}
        {last30Energy.length > 0 && (
          <Card className={modeCopy.bgColor}>
            <div className="flex items-start gap-3">
              <span className="text-2xl">{modeCopy.emoji}</span>
              <div>
                <p className="text-xs uppercase tracking-wider text-text-tertiary mb-1">
                  Suggested Mode
                </p>
                <p className={`text-base font-semibold ${modeCopy.color}`}>
                  {modeCopy.label}
                </p>
                <p className="text-sm text-text-secondary mt-1 leading-relaxed">
                  {modeCopy.advice}
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Streak + Proof Points */}
        <div className="grid grid-cols-2 gap-3">
          <Card>
            <div className="flex items-center gap-2 mb-1">
              <Flame size={14} className="text-warning" />
              <span className="text-[11px] font-medium uppercase tracking-wider text-text-tertiary">Streak</span>
            </div>
            <p className="text-2xl font-bold font-mono text-text-primary">{streak}</p>
            <p className="text-xs text-text-tertiary">{streak === 1 ? 'day' : 'days'}</p>
          </Card>
          <Card>
            <div className="flex items-center gap-2 mb-1">
              <Trophy size={14} className="text-accent" />
              <span className="text-[11px] font-medium uppercase tracking-wider text-text-tertiary">Proof Bank</span>
            </div>
            <p className="text-2xl font-bold font-mono text-text-primary">{totalLogs ?? 0}</p>
            <p className="text-xs text-text-tertiary">
              {(totalLogs ?? 0) === 0
                ? 'start building'
                : (totalLogs ?? 0) < 10
                  ? 'keep going'
                  : (totalLogs ?? 0) < 25
                    ? 'building momentum'
                    : 'you own these'}
            </p>
          </Card>
        </div>
      </div>

      {/* Career Heatmap */}
      {allLogs && allLogs.length > 0 && (
        <Card>
          <CardTitle className="flex items-center gap-2 text-base mb-4">
            <Calendar size={16} className="text-accent" />
            Activity (12 Weeks)
          </CardTitle>
          <CardContent>
            <CareerHeatmap
              logs={allLogs}
              energyCheckins={recentEnergy ?? []}
              weeks={12}
            />
          </CardContent>
        </Card>
      )}

      {/* Week heat map */}
      <Card>
        <CardTitle className="flex items-center justify-between mb-4">
          <span className="flex items-center gap-2 text-base">
            <Calendar size={16} className="text-accent" />
            This Week
          </span>
          <Badge variant={loggedDays.size >= 5 ? 'success' : 'default'}>
            {loggedDays.size} / 5 days
          </Badge>
        </CardTitle>
        <CardContent>
          <div className="flex gap-2">
            {weekDays.map((day) => {
              const dateStr = format(day, 'yyyy-MM-dd');
              const logged = loggedDays.has(dateStr);
              const isToday = isSameDay(day, new Date());
              return (
                <div
                  key={dateStr}
                  className={`flex-1 flex flex-col items-center gap-2 py-3 rounded-[var(--radius-md)] transition-all ${
                    isToday ? 'bg-surface-highlight ring-1 ring-surface-border' : ''
                  }`}
                >
                  <span className="text-[11px] font-medium uppercase tracking-wider text-text-tertiary">
                    {format(day, 'EEE')}
                  </span>
                  <span className="text-xs text-text-secondary">{format(day, 'd')}</span>
                  <div className={`w-3 h-3 rounded-full transition-all duration-500 ${
                    logged
                      ? 'bg-success shadow-sm shadow-success/30 scale-110'
                      : isToday
                        ? 'bg-accent/30 ring-2 ring-accent/20'
                        : 'bg-surface-border'
                  }`} />
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Recent activity feed */}
      <RecentActivity />

      {/* Backup reminder */}
      <BackupReminder />

      {/* Quick actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { href: '/journal', icon: PenLine, label: 'Field Note', color: 'text-accent' },
          { href: '/energy', icon: Battery, label: 'Battery Check', color: 'text-energy-4' },
          { href: '/brag', icon: Trophy, label: 'Build Proof', color: 'text-warning' },
          { href: '/escape', icon: Rocket, label: 'Check Runway', color: 'text-accent-secondary' },
        ].map((item) => (
          <Link key={item.href} href={item.href}>
            <Card className="group hover:border-surface-border-hover hover:shadow-md transition-all duration-200 cursor-pointer">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-surface-highlight flex items-center justify-center group-hover:scale-105 transition-transform">
                  <item.icon size={18} className={item.color} />
                </div>
                <span className="text-sm font-medium text-text-primary">{item.label}</span>
              </div>
            </Card>
          </Link>
        ))}
      </div>

      {/* Streak milestone */}
      <StreakMilestone streak={streak} />

      {/* Inline energy check-in */}
      <InlineEnergy hasCheckedInToday={!!latestEnergy} />

      {/* Today's focus based on energy mode */}
      {last30Energy.length > 0 && (recentLogs?.length ?? 0) > 0 && (
        <Card className="bg-bg-tertiary/30">
          <div className="flex items-start gap-3">
            <span className="text-lg">{modeCopy.emoji}</span>
            <div>
              <p className="text-xs uppercase tracking-wider text-text-tertiary mb-1">
                Today&apos;s Focus \u00B7 {modeCopy.label} Mode
              </p>
              <p className="text-sm text-text-secondary leading-relaxed">
                {mode === 'push' && 'Tackle the hardest thing on your plate. Start the side project. Have the difficult conversation. Your energy supports bold moves right now.'}
                {mode === 'maintain' && 'Solid day for focused work. Clear your inbox, push on your biggest project, and log your wins before you forget them.'}
                {mode === 'coast' && 'Handle the easy stuff. Cancel what you can. Protect your energy today \u2014 it\u2019s not laziness, it\u2019s strategy.'}
                {mode === 'escape' && 'Check your runway numbers. Update your resume. Start having honest conversations with yourself about what needs to change.'}
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Data freshness warning */}
      {(() => {
        if ((totalLogs ?? 0) === 0) return null;
        const lastLog = allLogs?.[0];
        if (!lastLog) return null;
        const daysSince = Math.floor((Date.now() - lastLog.createdAt) / 86400000);
        if (daysSince < 3) return null;
        return (
          <Card className="border-surface-border-hover bg-bg-tertiary/50">
            <div className="flex items-center gap-3">
              <span className="text-lg">{daysSince >= 7 ? '\u{1F4AD}' : '\u{1F4DD}'}</span>
              <div className="flex-1">
                <p className="text-sm text-text-secondary">
                  {daysSince >= 7
                    ? `It\u2019s been ${daysSince} days since your last field note. Your proof record is going cold.`
                    : `${daysSince} days since your last entry. A quick note keeps your record warm.`}
                </p>
              </div>
              <Link href="/journal">
                <Button size="sm" variant="ghost">
                  <PenLine size={12} /> Log
                </Button>
              </Link>
            </div>
          </Card>
        );
      })()}

      {/* Meeting prep reminder */}
      {(() => {
        const upcoming = (meetings ?? []).filter((m) => {
          if (!m.nextMeetingDate) return false;
          const daysUntil = Math.ceil((new Date(m.nextMeetingDate).getTime() - Date.now()) / 86400000);
          return daysUntil >= 0 && daysUntil <= 2 && !m.prepNotes;
        });
        if (upcoming.length === 0) return null;
        const next = upcoming[0];
        return (
          <Card className="border-warning/30 bg-warning/5">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center shrink-0">
                <Users size={18} className="text-warning" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-text-primary mb-1">
                  {next.title} is coming up
                  {next.nextMeetingDate === todayISO() ? ' today' : ' soon'}.
                </p>
                <p className="text-xs text-text-secondary mb-3">
                  No briefing prepared yet. Generate one so you walk in ready.
                </p>
                <Link href="/meetings">
                  <Button size="sm" variant="secondary">
                    <Users size={14} /> Prep Now <ArrowRight size={12} />
                  </Button>
                </Link>
              </div>
            </div>
          </Card>
        );
      })()}

      {/* Contextual prompt */}
      {prompt && (
        <Card variant="accent" className="group">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
              <Sparkles size={18} className="text-accent" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-text-primary mb-3">{prompt}</p>
              <Link href="/journal">
                <Button size="sm">
                  <PenLine size={14} /> Write It Down <ArrowRight size={12} />
                </Button>
              </Link>
            </div>
          </div>
        </Card>
      )}

      {/* Empty state */}
      {(totalLogs ?? 0) === 0 && (
        <EmptyState
          icon={PenLine}
          title="Your field notes start here."
          description="Write what happened at work today. One sentence is enough. Over time, this becomes the most valuable file you own."
          action={
            <Link href="/journal">
              <Button><PenLine size={14} /> Write Your First Note</Button>
            </Link>
          }
        />
      )}
    </div>
  );
}

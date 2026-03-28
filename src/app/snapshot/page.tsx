'use client';
import { usePageTitle } from '@/hooks/use-page-title';

import { useEffect, useState, useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { generateId, now, todayISO } from '@/lib/utils';
import { getUserRole } from '@/lib/settings';
import {
  calculateImpactScore,
  calculateVisibilityScore,
  calculateSkillsDiversity,
  calculateRunwayScore,
  calculateEnergyTrend,
  calculateRiskLevel,
  suggestEnergyMode,
  getModeCopy,
  generateRuleInsight,
  type TrafficLightScore,
} from '@/lib/scoring';
import { Card, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RiskBadge, TrafficLightCard } from '@/components/ui/traffic-light';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { useToast } from '@/components/ui/toast';
import {
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Flame,
  Trophy,
  Sparkles,
  Lightbulb,
  Calendar,
  Copy,
} from 'lucide-react';
import { format, startOfWeek, addWeeks, subWeeks, addDays, subDays } from 'date-fns';
import { getAIApiKey, getAIProvider, getAIModel } from '@/lib/settings';
import { AI_PROVIDERS, streamAIResponse, type AIProvider } from '@/lib/ai/providers';
import { weeklySnapshotInsight } from '@/lib/ai/prompts';

export default function SnapshotPage() {
  const { toast } = useToast();
  usePageTitle('The Week');
  const [weekOffset, setWeekOffset] = useState(0);
  const [role, setRole] = useState('');
  const [aiInsight, setAiInsight] = useState('');
  const [generatingInsight, setGeneratingInsight] = useState(false);

  useEffect(() => {
    getUserRole().then((r) => setRole(r ?? ''));
  }, []);

  const weekStart = startOfWeek(addWeeks(new Date(), weekOffset), { weekStartsOn: 1 });
  const weekEnd = addDays(weekStart, 6);
  const weekStartStr = format(weekStart, 'yyyy-MM-dd');
  const weekEndStr = format(weekEnd, 'yyyy-MM-dd');

  // Data for this week
  const weekLogs = useLiveQuery(
    () => db.workLogs.where('date').between(weekStartStr, weekEndStr, true, true).toArray(),
    [weekStartStr, weekEndStr]
  );
  const weekEnergy = useLiveQuery(
    () => db.energyCheckins.where('date').between(weekStartStr, weekEndStr, true, true).toArray(),
    [weekStartStr, weekEndStr]
  );

  // Previous week for comparison
  const prevStart = format(subWeeks(weekStart, 1), 'yyyy-MM-dd');
  const prevEnd = format(subDays(weekStart, 1), 'yyyy-MM-dd');
  const prevLogs = useLiveQuery(
    () => db.workLogs.where('date').between(prevStart, prevEnd, true, true).toArray(),
    [prevStart, prevEnd]
  );
  const prevEnergy = useLiveQuery(
    () => db.energyCheckins.where('date').between(prevStart, prevEnd, true, true).toArray(),
    [prevStart, prevEnd]
  );

  const bragDocs = useLiveQuery(() => db.bragDocuments.toArray());
  const meetings = useLiveQuery(() => db.meetings.toArray());
  const financials = useLiveQuery(() => db.financialData.toArray());
  const allLogs = useLiveQuery(() => db.workLogs.orderBy('createdAt').reverse().limit(100).toArray());

  // Saved snapshots
  const savedSnapshots = useLiveQuery(
    () => db.weeklySnapshots.orderBy('weekStartDate').reverse().limit(12).toArray()
  );

  // Calculate scores
  const totalExpenses = financials?.filter((f) => f.type === 'expense').reduce((s, f) => s + f.amount, 0) ?? 0;
  const totalSavings = financials?.filter((f) => f.type === 'savings').reduce((s, f) => s + f.amount, 0) ?? 0;
  const runwayMonths = totalExpenses > 0 ? totalSavings / totalExpenses : 0;

  const scores: TrafficLightScore[] = [
    calculateImpactScore(weekLogs ?? [], prevLogs ?? []),
    calculateVisibilityScore(bragDocs ?? [], meetings ?? [], 0),
    calculateSkillsDiversity(weekLogs ?? [], prevLogs ?? []),
    calculateRunwayScore(runwayMonths, runwayMonths),
    calculateEnergyTrend(weekEnergy ?? [], prevEnergy ?? []),
  ];

  const riskLevel = calculateRiskLevel(scores);
  const avgEnergy = (weekEnergy?.length ?? 0) > 0
    ? (weekEnergy?.reduce((s, e) => s + e.level, 0) ?? 0) / (weekEnergy?.length ?? 1)
    : 3;
  const mode = suggestEnergyMode(avgEnergy);
  const modeCopy = getModeCopy(mode);
  const ruleInsight = generateRuleInsight(scores, mode);

  // Wins (top entries with AI rewrites preferred)
  const wins = (weekLogs ?? [])
    .map((l) => l.aiRewrite ?? l.content)
    .slice(0, 5);

  // Streak from all logs
  const uniqueDates = [...new Set(allLogs?.map((l) => l.date) ?? [])].sort().reverse();
  let streak = 0;
  const checkDate = new Date();
  for (const date of uniqueDates) {
    const expected = format(subDays(checkDate, streak), 'yyyy-MM-dd');
    if (date === expected) streak++;
    else if (streak === 0 && date === format(subDays(checkDate, 1), 'yyyy-MM-dd')) streak++;
    else break;
  }

  const hasEnoughData = (weekLogs?.length ?? 0) >= 1;

  const handleGenerateAIInsight = useCallback(async () => {
    setGeneratingInsight(true);
    setAiInsight('');

    const provider = (await getAIProvider()) as AIProvider;
    const apiKey = await getAIApiKey();
    const model = await getAIModel();

    if (!apiKey) {
      toast('Set up your AI provider in Settings first.', 'error');
      setGeneratingInsight(false);
      return;
    }

    const messages = weeklySnapshotInsight(wins, avgEnergy, riskLevel, modeCopy.label, role);
    const config = AI_PROVIDERS[provider];

    await streamAIResponse(
      provider,
      apiKey,
      model ?? config.defaultModel,
      messages,
      {
        onChunk: (text) => setAiInsight((prev) => prev + text),
        onDone: async (fullText) => {
          setGeneratingInsight(false);
          // Save snapshot
          const existing = savedSnapshots?.find((s) => s.weekStartDate === weekStartStr);
          if (!existing) {
            await db.weeklySnapshots.add({
              id: generateId(),
              weekStartDate: weekStartStr,
              healthScore: Math.round(scores.reduce((s, sc) => s + sc.score, 0) / scores.length),
              riskLevel,
              metrics: JSON.stringify(scores),
              wins: JSON.stringify(wins),
              energyTrend: JSON.stringify({ avg: avgEnergy, direction: mode }),
              streak,
              suggestedMode: mode,
              ruleInsight,
              aiInsight: fullText,
              createdAt: now(),
            });
          }
        },
        onError: (err) => {
          setGeneratingInsight(false);
          toast(`Failed: ${err.message}`, 'error');
        },
      }
    );
  }, [wins, avgEnergy, riskLevel, modeCopy.label, role, weekStartStr, scores, streak, mode, ruleInsight, savedSnapshots, toast]);

  return (
    <div className="animate-fade-up space-y-6">
      {/* Header with week navigation */}
      <div className="flex items-center justify-between">
        <PageHeader
          icon={BarChart3}
          iconColor="text-accent"
          title="The Week, Honestly"
          subtitle={`${format(weekStart, 'MMM d')} \u2013 ${format(weekEnd, 'MMM d, yyyy')}`}
        />
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={() => setWeekOffset((w) => w - 1)}>
            <ChevronLeft size={16} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setWeekOffset(0)}
            disabled={weekOffset === 0}
          >
            This Week
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setWeekOffset((w) => w + 1)}
            disabled={weekOffset >= 0}
          >
            <ChevronRight size={16} />
          </Button>
        </div>
      </div>

      {!hasEnoughData ? (
        <EmptyState
          icon={BarChart3}
          title="Not enough data for a snapshot yet."
          description="Keep logging for a few more days. We need about a week of field notes to show you something useful \u2014 and it will be useful."
          action={
            <a href="/journal">
              <Button><Sparkles size={14} /> Write a Field Note</Button>
            </a>
          }
        />
      ) : (
        <>
          {/* Risk Level Hero */}
          <div className="flex items-center justify-center py-6">
            <RiskBadge level={riskLevel} className="text-lg px-6 py-3" />
          </div>

          {/* Traffic Lights Row */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {scores.map((score) => (
              <TrafficLightCard key={score.label} score={score} />
            ))}
          </div>

          {/* Wins + Mode Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Wins */}
            <Card>
              <CardTitle className="flex items-center gap-2 text-base mb-3">
                <Trophy size={16} className="text-warning" />
                This Week&apos;s Wins
              </CardTitle>
              <CardContent>
                {wins.length > 0 ? (
                  <ul className="space-y-2">
                    {wins.map((win, i) => (
                      <li key={i} className="flex gap-2 text-sm text-text-primary">
                        <span className="text-accent shrink-0">\u2022</span>
                        <span className="leading-relaxed">{win}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-text-tertiary">No wins logged this week.</p>
                )}
              </CardContent>
            </Card>

            {/* Mode + Streak */}
            <div className="space-y-4">
              <Card className={modeCopy.bgColor}>
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{modeCopy.emoji}</span>
                  <div>
                    <p className={`text-sm font-semibold ${modeCopy.color}`}>
                      Mode: {modeCopy.label}
                    </p>
                    <p className="text-xs text-text-secondary mt-0.5">{modeCopy.description}</p>
                  </div>
                </div>
              </Card>
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
                    <Calendar size={14} className="text-accent" />
                    <span className="text-[11px] font-medium uppercase tracking-wider text-text-tertiary">Logged</span>
                  </div>
                  <p className="text-2xl font-bold font-mono text-text-primary">{weekLogs?.length ?? 0}</p>
                  <p className="text-xs text-text-tertiary">field notes</p>
                </Card>
              </div>
            </div>
          </div>

          {/* Insights */}
          <Card variant="accent">
            <div className="flex items-start gap-3">
              <Lightbulb size={18} className="text-accent shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-xs uppercase tracking-wider text-text-tertiary mb-2">Weekly Insight</p>
                <p className="text-sm text-text-primary leading-relaxed">{ruleInsight}</p>

                {aiInsight && (
                  <div className="mt-3 pt-3 border-t border-accent/20">
                    <p className="text-xs uppercase tracking-wider text-accent mb-1">AI Insight</p>
                    <p className="text-sm text-text-primary leading-relaxed">
                      {aiInsight}
                      {generatingInsight && <span className="inline-block w-0.5 h-4 bg-accent ml-0.5 animate-pulse-gentle" />}
                    </p>
                  </div>
                )}

                {!aiInsight && !generatingInsight && (
                  <Button variant="ghost" size="sm" className="mt-3" onClick={handleGenerateAIInsight}>
                    <Sparkles size={12} /> Get AI Insight
                  </Button>
                )}
              </div>
            </div>
          </Card>

          {/* Share as text */}
          <div className="flex justify-center">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                const text = [
                  `QuietCareer \u2014 Week of ${format(weekStart, 'MMM d, yyyy')}`,
                  `Risk: ${riskLevel}`,
                  `Mode: ${modeCopy.label}`,
                  `Streak: ${streak} days`,
                  `Entries: ${weekLogs?.length ?? 0}`,
                  '',
                  scores.map((s) => `${s.label}: ${s.score}/100 (${s.level})`).join('\n'),
                  '',
                  wins.length > 0 ? `Wins:\n${wins.map((w) => `\u2022 ${w}`).join('\n')}` : '',
                  '',
                  ruleInsight,
                  aiInsight ? `\nAI: ${aiInsight}` : '',
                ].filter(Boolean).join('\n');
                navigator.clipboard.writeText(text);
                toast('Snapshot copied \u2014 paste anywhere.', 'success');
              }}
            >
              <Copy size={12} /> Copy Snapshot as Text
            </Button>
          </div>

          {/* Past Snapshots */}
          {savedSnapshots && savedSnapshots.length > 0 && (
            <div>
              <h2 className="text-sm font-medium text-text-secondary mb-3">Past Snapshots</h2>
              <div className="flex flex-wrap gap-2">
                {savedSnapshots.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => {
                      const ws = startOfWeek(new Date(), { weekStartsOn: 1 });
                      const snapshotWeek = new Date(s.weekStartDate);
                      const diff = Math.round((snapshotWeek.getTime() - ws.getTime()) / (7 * 86400000));
                      setWeekOffset(diff);
                    }}
                    className="px-3 py-1.5 text-xs rounded-full border border-surface-border hover:border-accent text-text-secondary hover:text-accent-text transition-colors"
                  >
                    Week of {format(new Date(s.weekStartDate), 'MMM d')}
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

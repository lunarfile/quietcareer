'use client';
import { usePageTitle } from '@/hooks/use-page-title';

import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { getUserRole } from '@/lib/settings';
import {
  calculateImpactScore,
  calculateVisibilityScore,
  calculateSkillsDiversity,
  calculateRunwayScore,
  calculateEnergyTrend,
  calculateRiskLevel,
  type TrafficLightScore,
} from '@/lib/scoring';
import { Card, CardTitle, CardContent } from '@/components/ui/card';
import { TrafficLightCard, RiskBadge } from '@/components/ui/traffic-light';
import { SkeletonDashboard } from '@/components/ui/skeleton';
import dynamic from 'next/dynamic';
import { format, subDays } from 'date-fns';
import { Activity, Shield } from 'lucide-react';

const CareerHeatmap = dynamic(() => import('@/components/charts/career-heatmap').then((m) => m.CareerHeatmap), { ssr: false });
const ActivityChart = dynamic(() => import('@/components/charts/activity-chart').then((m) => m.ActivityChart), { ssr: false });

export default function HealthPage() {
  usePageTitle('Career Health');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 100);
    return () => clearTimeout(timer);
  }, []);

  const allLogs = useLiveQuery(
    () => db.workLogs.orderBy('createdAt').reverse().limit(100).toArray()
  );
  const recentEnergy = useLiveQuery(
    () => db.energyCheckins.orderBy('createdAt').reverse().limit(30).toArray()
  );
  const bragDocs = useLiveQuery(
    () => db.bragDocuments.orderBy('createdAt').reverse().limit(10).toArray()
  );
  const meetings = useLiveQuery(() => db.meetings.toArray());
  const financials = useLiveQuery(() => db.financialData.toArray());

  if (loading) return <SkeletonDashboard />;

  // Scoring
  const last30Logs = allLogs?.filter((l) => l.date >= format(subDays(new Date(), 30), 'yyyy-MM-dd')) ?? [];
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
  const isNewUser = (allLogs?.length ?? 0) < 3;

  return (
    <div className="animate-fade-up space-y-5">
      {/* Header + Risk */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-text-primary">Career Health</h1>
          <p className="text-xs text-text-tertiary mt-0.5">Your metrics at a glance</p>
        </div>
        <RiskBadge level={riskLevel} isNewUser={isNewUser} />
      </div>

      {/* Traffic Lights */}
      <div className="grid grid-cols-2 gap-3">
        {scores.map((score) => {
          const routes: Record<string, string> = {
            Impact: '/journal', Visibility: '/brag', Skills: '/journal',
            Runway: '/escape', Energy: '/energy',
          };
          return (
            <TrafficLightCard
              key={score.label}
              score={score}
              onClick={() => window.location.href = routes[score.label] ?? '/dashboard'}
            />
          );
        })}
      </div>

      {/* Activity Heatmap */}
      {allLogs && allLogs.length > 0 && (
        <Card>
          <CardTitle className="text-sm mb-3">Activity (12 Weeks)</CardTitle>
          <CardContent>
            <CareerHeatmap
              logs={allLogs}
              energyCheckins={recentEnergy ?? []}
              weeks={12}
            />
          </CardContent>
        </Card>
      )}

      {/* Activity Chart */}
      {allLogs && allLogs.length > 3 && (
        <Card>
          <CardTitle className="text-sm mb-3">Daily Activity</CardTitle>
          <CardContent>
            <ActivityChart logs={allLogs} days={14} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

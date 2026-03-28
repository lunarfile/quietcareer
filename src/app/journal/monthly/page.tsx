'use client';
import { usePageTitle } from '@/hooks/use-page-title';

import { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { Card, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MetricCard } from '@/components/ui/metric-card';
import { EmptyState } from '@/components/ui/empty-state';
import { ChevronLeft, ChevronRight, PenLine, TrendingUp, Target, Tag } from 'lucide-react';
import {
  format,
  startOfMonth,
  endOfMonth,
  subMonths,
  addMonths,
  startOfWeek,
  addDays,
  eachWeekOfInterval,
} from 'date-fns';

export default function MonthlyRollupPage() {
  usePageTitle('Field Notes \u2014 Monthly');
  const [monthOffset, setMonthOffset] = useState(0);

  const currentMonth = addMonths(new Date(), monthOffset);
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const monthStartStr = format(monthStart, 'yyyy-MM-dd');
  const monthEndStr = format(monthEnd, 'yyyy-MM-dd');

  // Previous month for comparison
  const prevMonth = subMonths(currentMonth, 1);
  const prevStartStr = format(startOfMonth(prevMonth), 'yyyy-MM-dd');
  const prevEndStr = format(endOfMonth(prevMonth), 'yyyy-MM-dd');

  const monthLogs = useLiveQuery(
    () => db.workLogs.where('date').between(monthStartStr, monthEndStr, true, true).toArray(),
    [monthStartStr, monthEndStr]
  );
  const prevLogs = useLiveQuery(
    () => db.workLogs.where('date').between(prevStartStr, prevEndStr, true, true).toArray(),
    [prevStartStr, prevEndStr]
  );

  const monthCount = monthLogs?.length ?? 0;
  const prevCount = prevLogs?.length ?? 0;
  const changePct = prevCount > 0 ? Math.round(((monthCount - prevCount) / prevCount) * 100) : 0;

  // Unique days logged
  const uniqueDays = new Set(monthLogs?.map((l) => l.date)).size;
  const prevUniqueDays = new Set(prevLogs?.map((l) => l.date)).size;

  // Top projects
  const projectCounts = useMemo(() => {
    const map: Record<string, number> = {};
    monthLogs?.forEach((l) => {
      const p = l.project || 'Uncategorized';
      map[p] = (map[p] ?? 0) + 1;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [monthLogs]);

  // Top tags
  const tagCounts = useMemo(() => {
    const map: Record<string, number> = {};
    monthLogs?.flatMap((l) => l.tags).forEach((t) => {
      if (t) map[t] = (map[t] ?? 0) + 1;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [monthLogs]);

  // Impact type distribution
  const impactCounts = useMemo(() => {
    const map: Record<string, number> = {};
    monthLogs?.forEach((l) => {
      map[l.impactType] = (map[l.impactType] ?? 0) + 1;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [monthLogs]);

  // Week-by-week breakdown
  const weekBreakdown = useMemo(() => {
    const weeks = eachWeekOfInterval({ start: monthStart, end: monthEnd }, { weekStartsOn: 1 });
    return weeks.map((weekStart) => {
      const weekEnd = addDays(weekStart, 6);
      const wsStr = format(weekStart, 'yyyy-MM-dd');
      const weStr = format(weekEnd, 'yyyy-MM-dd');
      const count = monthLogs?.filter((l) => l.date >= wsStr && l.date <= weStr).length ?? 0;
      return { weekStart, label: `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d')}`, count };
    });
  }, [monthLogs, monthStart, monthEnd]);

  return (
    <div className="space-y-6">
      {/* Month selector */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => setMonthOffset((m) => m - 1)}>
          <ChevronLeft size={16} /> Prev
        </Button>
        <span className="text-sm font-medium text-text-primary">
          {format(currentMonth, 'MMMM yyyy')}
        </span>
        <Button variant="ghost" size="sm" onClick={() => setMonthOffset((m) => m + 1)} disabled={monthOffset >= 0}>
          Next <ChevronRight size={16} />
        </Button>
      </div>

      {monthCount > 0 ? (
        <>
          {/* Key metrics with comparison */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MetricCard
              label="Entries"
              value={monthCount}
              icon={PenLine}
              iconColor="text-accent"
              trend={monthCount > prevCount ? 'up' : monthCount < prevCount ? 'down' : 'flat'}
              trendLabel={prevCount > 0 ? `${changePct >= 0 ? '+' : ''}${changePct}% vs last month` : undefined}
            />
            <MetricCard
              label="Days Logged"
              value={uniqueDays}
              icon={TrendingUp}
              iconColor="text-success"
              trend={uniqueDays > prevUniqueDays ? 'up' : uniqueDays < prevUniqueDays ? 'down' : 'flat'}
            />
            <MetricCard
              label="Projects"
              value={projectCounts.length}
              icon={Target}
              iconColor="text-accent-secondary"
            />
            <MetricCard
              label="Avg/Day"
              value={(uniqueDays > 0 ? monthCount / uniqueDays : 0).toFixed(1)}
              icon={TrendingUp}
              iconColor="text-warning"
            />
          </div>

          {/* Impact type distribution */}
          <Card>
            <CardTitle className="text-sm mb-3">Impact Types</CardTitle>
            <CardContent>
              <div className="space-y-2">
                {impactCounts.map(([type, count]) => {
                  const pct = Math.round((count / monthCount) * 100);
                  return (
                    <div key={type} className="flex items-center gap-3">
                      <span className="text-xs text-text-secondary w-20 truncate">{type}</span>
                      <div className="flex-1 h-2 rounded-full bg-surface-highlight overflow-hidden">
                        <div
                          className="h-full rounded-full bg-accent transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-xs text-text-tertiary font-mono w-8 text-right">{pct}%</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Top projects */}
          {projectCounts.length > 0 && (
            <Card>
              <CardTitle className="text-sm mb-3">Top Projects</CardTitle>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {projectCounts.slice(0, 6).map(([project, count]) => (
                    <Badge key={project} variant="accent">{project} ({count})</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Top tags */}
          {tagCounts.length > 0 && (
            <Card>
              <CardTitle className="text-sm mb-3">Top Skills / Tags</CardTitle>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {tagCounts.map(([tag, count]) => (
                    <Badge key={tag} variant="default"><Tag size={8} />{tag} ({count})</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Week-by-week */}
          <Card>
            <CardTitle className="text-sm mb-3">Week by Week</CardTitle>
            <CardContent>
              <div className="space-y-2">
                {weekBreakdown.map((week) => (
                  <div key={week.label} className="flex items-center gap-3">
                    <span className="text-xs text-text-secondary w-32">{week.label}</span>
                    <div className="flex-1 h-2 rounded-full bg-surface-highlight overflow-hidden">
                      <div
                        className="h-full rounded-full bg-accent/60 transition-all duration-500"
                        style={{ width: `${Math.min((week.count / Math.max(...weekBreakdown.map((w) => w.count), 1)) * 100, 100)}%` }}
                      />
                    </div>
                    <span className="text-xs text-text-tertiary font-mono w-6 text-right">{week.count}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        <EmptyState
          icon={PenLine}
          title="No entries this month."
          description="Log some work and come back to see your monthly patterns."
        />
      )}
    </div>
  );
}

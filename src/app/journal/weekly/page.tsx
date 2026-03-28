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
import { useToast } from '@/components/ui/toast';
import { ChevronLeft, ChevronRight, Sparkles, Copy, PenLine, TrendingUp } from 'lucide-react';
import { format, startOfWeek, addWeeks, subWeeks, addDays } from 'date-fns';
import { getAIApiKey, getAIProvider, getAIModel, getUserRole } from '@/lib/settings';
import { AI_PROVIDERS, streamAIResponse, type AIProvider } from '@/lib/ai/providers';
import { weeklyRollupSummary } from '@/lib/ai/prompts';

export default function WeeklyRollupPage() {
  const { toast } = useToast();
  usePageTitle('Field Notes \u2014 Weekly');
  const [weekOffset, setWeekOffset] = useState(0);
  const [aiSummary, setAiSummary] = useState('');
  const [generating, setGenerating] = useState(false);

  const weekStart = startOfWeek(addWeeks(new Date(), weekOffset), { weekStartsOn: 1 });
  const weekEnd = addDays(weekStart, 6);
  const weekStartStr = format(weekStart, 'yyyy-MM-dd');
  const weekEndStr = format(weekEnd, 'yyyy-MM-dd');

  const weekLogs = useLiveQuery(
    () => db.workLogs.where('date').between(weekStartStr, weekEndStr, true, true).toArray(),
    [weekStartStr, weekEndStr]
  );

  // Group by project
  const grouped = useMemo(() => {
    const map: Record<string, typeof weekLogs> = {};
    weekLogs?.forEach((log) => {
      const project = log.project || 'Uncategorized';
      if (!map[project]) map[project] = [];
      map[project]!.push(log);
    });
    return map;
  }, [weekLogs]);

  const uniqueTags = useMemo(() => {
    return new Set(weekLogs?.flatMap((l) => [...l.tags, l.project]).filter(Boolean));
  }, [weekLogs]);

  const impactTypes = useMemo(() => {
    const counts: Record<string, number> = {};
    weekLogs?.forEach((l) => {
      counts[l.impactType] = (counts[l.impactType] ?? 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [weekLogs]);

  const handleGenerateSummary = async () => {
    if (!weekLogs || weekLogs.length === 0) return;
    setGenerating(true);
    setAiSummary('');

    const provider = (await getAIProvider()) as AIProvider;
    const apiKey = await getAIApiKey();
    const model = await getAIModel();
    const role = (await getUserRole()) ?? 'professional';

    if (!apiKey) {
      toast('Set up your AI provider in Settings first.', 'error');
      setGenerating(false);
      return;
    }

    const entries = weekLogs.map((l) => l.aiRewrite ?? l.content);
    const messages = weeklyRollupSummary(entries, role);
    const config = AI_PROVIDERS[provider];

    await streamAIResponse(provider, apiKey, model ?? config.defaultModel, messages, {
      onChunk: (text) => setAiSummary((prev) => prev + text),
      onDone: () => { setGenerating(false); toast('Summary generated.', 'success'); },
      onError: (err) => { setGenerating(false); toast(`Failed: ${err.message}`, 'error'); },
    });
  };

  return (
    <div className="space-y-6">
      {/* Week selector */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => { setWeekOffset((w) => w - 1); setAiSummary(''); }}>
          <ChevronLeft size={16} /> Prev
        </Button>
        <span className="text-sm font-medium text-text-primary">
          {format(weekStart, 'MMM d')} \u2013 {format(weekEnd, 'MMM d, yyyy')}
        </span>
        <Button variant="ghost" size="sm" onClick={() => { setWeekOffset((w) => w + 1); setAiSummary(''); }} disabled={weekOffset >= 0}>
          Next <ChevronRight size={16} />
        </Button>
      </div>

      {/* Stats */}
      {weekLogs && weekLogs.length > 0 ? (
        <>
          <div className="grid grid-cols-3 gap-3">
            <MetricCard label="Entries" value={weekLogs.length} icon={PenLine} iconColor="text-accent" />
            <MetricCard label="Projects" value={Object.keys(grouped).length} icon={TrendingUp} iconColor="text-success" />
            <MetricCard label="Skills" value={uniqueTags.size} icon={TrendingUp} iconColor="text-accent-secondary" />
          </div>

          {/* Impact type distribution */}
          {impactTypes.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {impactTypes.map(([type, count]) => (
                <Badge key={type} variant="accent">{type} ({count})</Badge>
              ))}
            </div>
          )}

          {/* Grouped by project */}
          {Object.entries(grouped).map(([project, logs]) => (
            <Card key={project}>
              <div className="flex items-center justify-between mb-3">
                <CardTitle className="text-sm">{project}</CardTitle>
                <Badge variant="muted">{logs!.length}</Badge>
              </div>
              <CardContent>
                <ul className="space-y-1.5">
                  {logs!.map((log) => (
                    <li key={log.id} className="flex gap-2 text-sm text-text-primary">
                      <span className="text-accent shrink-0">\u2022</span>
                      <span className="leading-relaxed">{log.aiRewrite ?? log.content}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}

          {/* AI Summary */}
          {aiSummary ? (
            <Card variant="accent">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs uppercase tracking-wider text-accent flex items-center gap-1">
                  <Sparkles size={10} /> AI Summary
                </span>
                <Button variant="ghost" size="sm" onClick={() => { navigator.clipboard.writeText(aiSummary); toast('Copied.', 'success'); }}>
                  <Copy size={12} /> Copy
                </Button>
              </div>
              <p className="text-sm text-text-primary leading-relaxed">
                {aiSummary}
                {generating && <span className="inline-block w-0.5 h-4 bg-accent ml-0.5 animate-pulse-gentle" />}
              </p>
            </Card>
          ) : (
            <Button variant="secondary" onClick={handleGenerateSummary} disabled={generating}>
              {generating ? <><Sparkles size={14} className="animate-spin" /> Summarizing...</> : <><Sparkles size={14} /> Generate AI Summary</>}
            </Button>
          )}
        </>
      ) : (
        <EmptyState
          icon={PenLine}
          title="No entries this week."
          description="Go back and log some work, or browse a different week."
        />
      )}
    </div>
  );
}

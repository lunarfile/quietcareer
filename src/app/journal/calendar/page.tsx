'use client';

import { usePageTitle } from '@/hooks/use-page-title';
import { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CareerHeatmap } from '@/components/charts/career-heatmap';
import { ChevronLeft, ChevronRight, Tag, Sparkles } from 'lucide-react';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addMonths,
  subMonths,
  addDays,
  isSameMonth,
  isSameDay,
  isToday,
  parseISO,
} from 'date-fns';

export default function CalendarPage() {
  usePageTitle('Field Notes \u2014 Calendar');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const allLogs = useLiveQuery(
    () => db.workLogs.orderBy('createdAt').reverse().toArray()
  );
  const allEnergy = useLiveQuery(
    () => db.energyCheckins.orderBy('createdAt').reverse().toArray()
  );

  // Log counts by date
  const logCountByDate = useMemo(() => {
    const map: Record<string, number> = {};
    allLogs?.forEach((l) => {
      map[l.date] = (map[l.date] ?? 0) + 1;
    });
    return map;
  }, [allLogs]);

  // Selected day's entries
  const selectedLogs = useMemo(() => {
    if (!selectedDate || !allLogs) return [];
    return allLogs.filter((l) => l.date === selectedDate);
  }, [selectedDate, allLogs]);

  // Build calendar grid
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const weeks: Date[][] = [];
  let day = calStart;
  while (day <= calEnd) {
    const week: Date[] = [];
    for (let i = 0; i < 7; i++) {
      week.push(day);
      day = addDays(day, 1);
    }
    weeks.push(week);
  }

  return (
    <div className="space-y-6">
      {/* Career Heatmap (12 weeks) */}
      <Card>
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-text-primary">Activity Heatmap</span>
          <span className="text-xs text-text-tertiary">Last 12 weeks</span>
        </div>
        <CareerHeatmap
          logs={allLogs ?? []}
          energyCheckins={allEnergy ?? []}
          weeks={12}
        />
      </Card>

      {/* Monthly Calendar */}
      <Card>
        {/* Month header */}
        <div className="flex items-center justify-between mb-4">
          <Button variant="ghost" size="sm" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
            <ChevronLeft size={16} />
          </Button>
          <h3 className="text-base font-semibold text-text-primary">
            {format(currentMonth, 'MMMM yyyy')}
          </h3>
          <Button variant="ghost" size="sm" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
            <ChevronRight size={16} />
          </Button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 mb-1">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
            <div key={d} className="text-center text-[11px] font-medium text-text-tertiary py-1">
              {d}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="space-y-0.5">
          {weeks.map((week, wi) => (
            <div key={wi} className="grid grid-cols-7 gap-0.5">
              {week.map((day) => {
                const dateStr = format(day, 'yyyy-MM-dd');
                const count = logCountByDate[dateStr] ?? 0;
                const inMonth = isSameMonth(day, currentMonth);
                const today = isToday(day);
                const selected = selectedDate === dateStr;

                return (
                  <button
                    key={dateStr}
                    onClick={() => setSelectedDate(selected ? null : dateStr)}
                    className={`relative flex flex-col items-center py-2 rounded-[var(--radius-sm)] transition-all min-h-[44px] ${
                      !inMonth ? 'opacity-30' : ''
                    } ${
                      selected
                        ? 'bg-accent-muted ring-1 ring-accent'
                        : today
                          ? 'bg-surface-highlight'
                          : 'hover:bg-surface-highlight'
                    }`}
                  >
                    <span className={`text-xs ${today ? 'text-accent font-semibold' : 'text-text-secondary'}`}>
                      {format(day, 'd')}
                    </span>
                    {count > 0 && (
                      <div className="flex gap-0.5 mt-1">
                        {Array.from({ length: Math.min(count, 3) }).map((_, i) => (
                          <div
                            key={i}
                            className={`w-1.5 h-1.5 rounded-full ${
                              count >= 3 ? 'bg-accent' : count === 2 ? 'bg-accent/70' : 'bg-accent/40'
                            }`}
                          />
                        ))}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </Card>

      {/* Selected day's entries */}
      {selectedDate && (
        <div className="animate-fade-up">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-sm font-medium text-text-secondary">
              {format(parseISO(selectedDate), 'EEEE, MMMM d, yyyy')}
            </span>
            <Badge variant="muted">{selectedLogs.length} {selectedLogs.length === 1 ? 'entry' : 'entries'}</Badge>
          </div>

          {selectedLogs.length === 0 ? (
            <Card>
              <p className="text-sm text-text-tertiary">No entries on this day.</p>
            </Card>
          ) : (
            <div className="space-y-2">
              {selectedLogs.map((log) => (
                <Card key={log.id} className="hover:border-surface-border-hover transition-all">
                  <p className="text-sm text-text-primary leading-relaxed">{log.content}</p>
                  {log.aiRewrite && (
                    <p className="text-sm text-accent-text/80 mt-2 pl-3 border-l-2 border-accent/50">
                      <Sparkles size={10} className="inline mr-1 text-accent" />
                      {log.aiRewrite}
                    </p>
                  )}
                  <div className="flex items-center gap-1.5 mt-2">
                    {log.project && <Badge variant="accent">{log.project}</Badge>}
                    <Badge variant="default">{log.impactType}</Badge>
                    {log.tags.map((t) => (
                      <Badge key={t} variant="muted"><Tag size={8} />{t}</Badge>
                    ))}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

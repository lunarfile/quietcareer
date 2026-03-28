'use client';

import { useMemo } from 'react';
import { format, subDays, startOfWeek, addDays, isSameDay, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import type { WorkLog, EnergyCheckin } from '@/lib/db';

interface CareerHeatmapProps {
  logs: WorkLog[];
  energyCheckins?: EnergyCheckin[];
  weeks?: number;
  showLabels?: boolean;
  mode?: 'activity' | 'energy';
  className?: string;
}

const DAY_LABELS = ['Mon', '', 'Wed', '', 'Fri', '', ''];

export function CareerHeatmap({
  logs,
  energyCheckins = [],
  weeks = 12,
  showLabels = true,
  mode = 'activity',
  className,
}: CareerHeatmapProps) {
  const { grid, monthLabels } = useMemo(() => {
    const today = new Date();
    const totalDays = weeks * 7;
    const startDate = startOfWeek(subDays(today, totalDays - 1), { weekStartsOn: 1 });

    // Build lookup maps
    const logCountByDate: Record<string, number> = {};
    for (const log of logs) {
      logCountByDate[log.date] = (logCountByDate[log.date] ?? 0) + 1;
    }

    const energyByDate: Record<string, number> = {};
    for (const checkin of energyCheckins) {
      energyByDate[checkin.date] = checkin.level;
    }

    // Build grid: array of weeks, each week is array of 7 days
    const grid: {
      date: Date;
      dateStr: string;
      count: number;
      energy: number;
      isToday: boolean;
      isFuture: boolean;
    }[][] = [];

    const monthLabels: { label: string; weekIndex: number }[] = [];
    let lastMonth = -1;

    for (let w = 0; w < weeks; w++) {
      const week: typeof grid[number] = [];
      for (let d = 0; d < 7; d++) {
        const date = addDays(startDate, w * 7 + d);
        const dateStr = format(date, 'yyyy-MM-dd');
        const month = date.getMonth();

        if (month !== lastMonth && d === 0) {
          monthLabels.push({ label: format(date, 'MMM'), weekIndex: w });
          lastMonth = month;
        }

        week.push({
          date,
          dateStr,
          count: logCountByDate[dateStr] ?? 0,
          energy: energyByDate[dateStr] ?? 0,
          isToday: isSameDay(date, today),
          isFuture: date > today,
        });
      }
      grid.push(week);
    }

    return { grid, monthLabels };
  }, [logs, energyCheckins, weeks]);

  const getActivityColor = (count: number, isFuture: boolean) => {
    if (isFuture) return 'bg-bg-primary';
    if (count === 0) return 'bg-surface-border/30';
    if (count === 1) return 'bg-accent/30';
    if (count === 2) return 'bg-accent/50';
    if (count === 3) return 'bg-accent/70';
    return 'bg-accent';
  };

  const getEnergyColor = (level: number, isFuture: boolean) => {
    if (isFuture) return 'bg-bg-primary';
    if (level === 0) return 'bg-surface-border/30';
    if (level === 1) return 'bg-energy-1/60';
    if (level === 2) return 'bg-energy-2/60';
    if (level === 3) return 'bg-energy-3/60';
    if (level === 4) return 'bg-energy-4/60';
    return 'bg-energy-5/60';
  };

  return (
    <div className={cn('', className)}>
      {/* Month labels */}
      <div className="flex mb-1" style={{ paddingLeft: showLabels ? 28 : 0 }}>
        {monthLabels.map((m, i) => (
          <span
            key={`${m.label}-${i}`}
            className="text-[10px] text-text-tertiary"
            style={{
              position: 'relative',
              left: `${m.weekIndex * (10 + 2)}px`,
              marginRight: i < monthLabels.length - 1
                ? `${((monthLabels[i + 1]?.weekIndex ?? weeks) - m.weekIndex) * 12 - 20}px`
                : 0,
            }}
          >
            {m.label}
          </span>
        ))}
      </div>

      <div className="flex gap-0.5">
        {/* Day labels */}
        {showLabels && (
          <div className="flex flex-col gap-0.5 mr-1">
            {DAY_LABELS.map((label, i) => (
              <div
                key={i}
                className="h-[10px] w-5 flex items-center justify-end"
              >
                <span className="text-[9px] text-text-tertiary leading-none">
                  {label}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Grid */}
        <div className="flex gap-0.5">
          {grid.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-0.5">
              {week.map((day) => (
                <div
                  key={day.dateStr}
                  className={cn(
                    'w-[10px] h-[10px] rounded-[2px] transition-colors duration-200',
                    mode === 'activity'
                      ? getActivityColor(day.count, day.isFuture)
                      : getEnergyColor(day.energy, day.isFuture),
                    day.isToday && 'ring-1 ring-text-primary/50'
                  )}
                  title={`${format(day.date, 'MMM d, yyyy')}: ${day.count} ${day.count === 1 ? 'entry' : 'entries'}${day.energy > 0 ? ` | Energy: ${day.energy}/5` : ''}`}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 mt-2">
        <span className="text-[10px] text-text-tertiary">Less</span>
        <div className="flex gap-0.5">
          {mode === 'activity' ? (
            <>
              <div className="w-[10px] h-[10px] rounded-[2px] bg-surface-border/30" />
              <div className="w-[10px] h-[10px] rounded-[2px] bg-accent/30" />
              <div className="w-[10px] h-[10px] rounded-[2px] bg-accent/50" />
              <div className="w-[10px] h-[10px] rounded-[2px] bg-accent/70" />
              <div className="w-[10px] h-[10px] rounded-[2px] bg-accent" />
            </>
          ) : (
            <>
              <div className="w-[10px] h-[10px] rounded-[2px] bg-energy-1/60" />
              <div className="w-[10px] h-[10px] rounded-[2px] bg-energy-2/60" />
              <div className="w-[10px] h-[10px] rounded-[2px] bg-energy-3/60" />
              <div className="w-[10px] h-[10px] rounded-[2px] bg-energy-4/60" />
              <div className="w-[10px] h-[10px] rounded-[2px] bg-energy-5/60" />
            </>
          )}
        </div>
        <span className="text-[10px] text-text-tertiary">More</span>
      </div>
    </div>
  );
}

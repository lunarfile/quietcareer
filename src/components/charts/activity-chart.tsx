'use client';

import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { format, subDays } from 'date-fns';
import type { WorkLog } from '@/lib/db';

interface ActivityChartProps {
  logs: WorkLog[];
  days?: number;
}

export function ActivityChart({ logs, days = 14 }: ActivityChartProps) {
  const data = useMemo(() => {
    const today = new Date();
    return Array.from({ length: days }, (_, i) => {
      const date = subDays(today, days - 1 - i);
      const dateStr = format(date, 'yyyy-MM-dd');
      const count = logs.filter((l) => l.date === dateStr).length;
      return {
        date: format(date, 'EEE'),
        fullDate: dateStr,
        entries: count,
      };
    });
  }, [logs, days]);

  return (
    <ResponsiveContainer width="100%" height={160}>
      <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="var(--color-surface-border)"
          vertical={false}
        />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 10, fill: 'var(--color-text-tertiary)' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          allowDecimals={false}
          tick={{ fontSize: 10, fill: 'var(--color-text-tertiary)' }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          contentStyle={{
            background: 'var(--color-bg-tertiary)',
            border: '1px solid var(--color-surface-border)',
            borderRadius: 'var(--radius-md)',
            fontSize: 12,
            color: 'var(--color-text-primary)',
          }}
          formatter={(value: number) => [`${value} ${value === 1 ? 'entry' : 'entries'}`, '']}
          labelFormatter={(label: string) => label}
        />
        <Bar
          dataKey="entries"
          fill="var(--color-accent)"
          radius={[4, 4, 0, 0]}
          maxBarSize={24}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

'use client';

import { useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';
import { format, parseISO } from 'date-fns';
import type { EnergyCheckin } from '@/lib/db';

interface EnergyChartProps {
  checkins: EnergyCheckin[];
}

const ENERGY_LABELS = ['', 'Exhausted', 'Low', 'Okay', 'Good', 'Thriving'];

export function EnergyChart({ checkins }: EnergyChartProps) {
  const data = useMemo(() => {
    return [...checkins]
      .reverse()
      .map((c) => ({
        date: format(parseISO(c.date), 'MMM d'),
        level: c.level,
        label: ENERGY_LABELS[c.level],
      }));
  }, [checkins]);

  if (data.length < 2) return null;

  const avg = data.reduce((s, d) => s + d.level, 0) / data.length;

  return (
    <ResponsiveContainer width="100%" height={180}>
      <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
        <defs>
          <linearGradient id="energyGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--color-accent)" stopOpacity={0.2} />
            <stop offset="95%" stopColor="var(--color-accent)" stopOpacity={0} />
          </linearGradient>
        </defs>
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
          domain={[1, 5]}
          ticks={[1, 2, 3, 4, 5]}
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
          formatter={(value: number) => [ENERGY_LABELS[value], 'Energy']}
        />
        <ReferenceLine
          y={avg}
          stroke="var(--color-text-tertiary)"
          strokeDasharray="3 3"
          strokeWidth={1}
        />
        <Area
          type="monotone"
          dataKey="level"
          stroke="var(--color-accent)"
          strokeWidth={2}
          fill="url(#energyGradient)"
          dot={{ r: 3, fill: 'var(--color-accent)', strokeWidth: 0 }}
          activeDot={{ r: 5, fill: 'var(--color-accent)', strokeWidth: 2, stroke: 'var(--color-bg-primary)' }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

'use client';

import { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';

interface RunwayChartProps {
  savings: number;
  monthlyExpenses: number;
  monthlyIncome: number;
  expenseReduction: number; // 0-30 percent
  sideIncome: number; // extra monthly
  severanceMonths: number; // 0, 3, or 6
  months?: number;
}

export function RunwayChart({
  savings,
  monthlyExpenses,
  monthlyIncome,
  expenseReduction,
  sideIncome,
  severanceMonths,
  months = 24,
}: RunwayChartProps) {
  const data = useMemo(() => {
    const points = [];
    const modifiedExpenses = monthlyExpenses * (1 - expenseReduction / 100);
    const severanceLump = severanceMonths * monthlyIncome;

    let baseBalance = savings;
    let modBalance = savings + severanceLump;

    for (let m = 0; m <= months; m++) {
      points.push({
        month: m,
        label: m === 0 ? 'Now' : `${m}mo`,
        baseline: Math.max(0, Math.round(baseBalance)),
        scenario: Math.max(0, Math.round(modBalance)),
      });

      // After month 0, assume no primary income (escape scenario)
      baseBalance -= monthlyExpenses;
      modBalance -= modifiedExpenses;
      modBalance += sideIncome;
    }

    return points;
  }, [savings, monthlyExpenses, monthlyIncome, expenseReduction, sideIncome, severanceMonths, months]);

  const baselineRunway = monthlyExpenses > 0 ? savings / monthlyExpenses : 0;
  const modifiedExpenses = monthlyExpenses * (1 - expenseReduction / 100);
  const netBurn = modifiedExpenses - sideIncome;
  const modifiedSavings = savings + severanceMonths * monthlyIncome;
  const scenarioRunway = netBurn > 0 ? modifiedSavings / netBurn : 99;

  return (
    <div>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data} margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-surface-border)" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10, fill: 'var(--color-text-tertiary)' }}
            axisLine={false}
            tickLine={false}
            interval={5}
          />
          <YAxis
            tick={{ fontSize: 10, fill: 'var(--color-text-tertiary)' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
          />
          <Tooltip
            contentStyle={{
              background: 'var(--color-bg-tertiary)',
              border: '1px solid var(--color-surface-border)',
              borderRadius: 'var(--radius-md)',
              fontSize: 12,
              color: 'var(--color-text-primary)',
            }}
            formatter={(value: number, name: string) => [
              `$${value.toLocaleString()}`,
              name === 'baseline' ? 'Current Path' : 'With Changes',
            ]}
          />
          <ReferenceLine y={0} stroke="var(--color-danger)" strokeDasharray="3 3" />
          {/* Baseline */}
          <Line
            type="monotone"
            dataKey="baseline"
            stroke="var(--color-text-tertiary)"
            strokeWidth={1.5}
            strokeDasharray="6 3"
            dot={false}
          />
          {/* Scenario */}
          <Line
            type="monotone"
            dataKey="scenario"
            stroke="var(--color-accent)"
            strokeWidth={2.5}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="flex items-center gap-6 mt-2 px-2">
        <div className="flex items-center gap-2">
          <div className="w-6 h-0.5 bg-text-tertiary" style={{ borderTop: '1.5px dashed var(--color-text-tertiary)' }} />
          <span className="text-[10px] text-text-tertiary">Current ({baselineRunway.toFixed(1)}mo)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-6 h-0.5 bg-accent rounded" />
          <span className="text-[10px] text-accent-text">With changes ({scenarioRunway.toFixed(1)}mo)</span>
        </div>
      </div>
    </div>
  );
}

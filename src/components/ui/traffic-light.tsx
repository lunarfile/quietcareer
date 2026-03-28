'use client';

import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { TrafficLightScore } from '@/lib/scoring';

interface TrafficLightCardProps {
  score: TrafficLightScore;
  compact?: boolean;
}

const lightColors = {
  green: { dot: 'bg-success', ring: 'ring-success/20', text: 'text-success-text' },
  yellow: { dot: 'bg-warning', ring: 'ring-warning/20', text: 'text-warning-text' },
  red: { dot: 'bg-danger', ring: 'ring-danger/20', text: 'text-danger-text' },
};

const trendIcons = {
  up: TrendingUp,
  down: TrendingDown,
  flat: Minus,
};

const trendColors = {
  up: 'text-success-text',
  down: 'text-danger-text',
  flat: 'text-text-tertiary',
};

export function TrafficLightCard({ score, compact = false }: TrafficLightCardProps) {
  const colors = lightColors[score.level];
  const TrendIcon = trendIcons[score.trend];

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <div className={cn('w-2.5 h-2.5 rounded-full', colors.dot, 'ring-2', colors.ring)} />
        <span className="text-xs text-text-secondary">{score.label}</span>
        <TrendIcon size={10} className={trendColors[score.trend]} />
      </div>
    );
  }

  return (
    <div className="group rounded-[var(--radius-md)] border border-surface-border bg-bg-secondary p-4 hover:border-surface-border-hover hover:-translate-y-px transition-all duration-200">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className={cn('w-3 h-3 rounded-full', colors.dot, 'ring-3', colors.ring)} />
          <span className="text-[11px] font-medium uppercase tracking-wider text-text-tertiary">
            {score.label}
          </span>
        </div>
        <div className={cn('flex items-center gap-1', trendColors[score.trend])}>
          <TrendIcon size={12} />
        </div>
      </div>
      <div className="flex items-baseline gap-1.5 mb-1.5">
        <span className={cn('text-2xl font-semibold font-mono', colors.text)}>
          {score.score}
        </span>
        <span className="text-xs text-text-tertiary">/ 100</span>
      </div>
      <p className="text-xs text-text-tertiary leading-relaxed">{score.detail}</p>
    </div>
  );
}

interface RiskBadgeProps {
  level: 'LOW' | 'MODERATE' | 'HIGH';
  className?: string;
}

export function RiskBadge({ level, className }: RiskBadgeProps) {
  const config = {
    LOW: { bg: 'bg-success/10', border: 'border-success/30', text: 'text-success-text', label: 'Low Risk' },
    MODERATE: { bg: 'bg-warning/10', border: 'border-warning/30', text: 'text-warning-text', label: 'Moderate Risk' },
    HIGH: { bg: 'bg-danger/10', border: 'border-danger/30', text: 'text-danger-text', label: 'High Risk' },
  }[level];

  return (
    <div className={cn('inline-flex items-center gap-2 px-4 py-2 rounded-full border', config.bg, config.border, className)}>
      <div className={cn('w-2 h-2 rounded-full', level === 'LOW' ? 'bg-success' : level === 'MODERATE' ? 'bg-warning' : 'bg-danger')} />
      <span className={cn('text-sm font-semibold', config.text)}>{config.label}</span>
    </div>
  );
}

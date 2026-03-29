'use client';

import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus, ChevronRight } from 'lucide-react';
import type { TrafficLightScore } from '@/lib/scoring';

interface TrafficLightCardProps {
  score: TrafficLightScore;
  compact?: boolean;
  href?: string;
  onClick?: () => void;
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

export function TrafficLightCard({ score, compact = false, href, onClick }: TrafficLightCardProps) {
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
    <div
      className={cn(
        'group rounded-[var(--radius-md)] border border-surface-border bg-bg-secondary p-4 hover:border-surface-border-hover hover:-translate-y-px transition-all duration-200',
        (href || onClick) && 'cursor-pointer active:scale-[0.98]'
      )}
      onClick={onClick}
      role={href || onClick ? 'button' : undefined}
      tabIndex={href || onClick ? 0 : undefined}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className={cn('w-3 h-3 rounded-full', colors.dot, 'ring-3', colors.ring)} />
          <span className="text-[11px] font-medium uppercase tracking-wider text-text-tertiary">
            {score.label}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <TrendIcon size={12} className={trendColors[score.trend]} />
          {(href || onClick) && <ChevronRight size={12} className="text-text-tertiary opacity-0 group-hover:opacity-100 transition-opacity" />}
        </div>
      </div>
      <div className="flex items-baseline gap-1.5 mb-1.5">
        <span className={cn('text-2xl font-semibold font-mono', colors.text)}>
          {score.score}
        </span>
        <span className="text-xs text-text-tertiary">/ 100</span>
      </div>
      <p className="text-xs text-text-tertiary leading-relaxed">{score.detail}</p>
      {score.action && (
        <p className="text-[10px] text-accent-text mt-1.5 font-medium">{'\u2192'} {score.action}</p>
      )}
    </div>
  );
}

interface RiskBadgeProps {
  level: 'LOW' | 'MODERATE' | 'HIGH';
  isNewUser?: boolean;
  className?: string;
}

export function RiskBadge({ level, isNewUser, className }: RiskBadgeProps) {
  // Don't show scary "High Risk" to new users with no data
  const effectiveLevel = isNewUser && level === 'HIGH' ? 'BUILDING' : level;

  const config = {
    BUILDING: { bg: 'bg-accent/10', border: 'border-accent/30', text: 'text-accent-text', label: 'Getting Started' },
    LOW: { bg: 'bg-success/10', border: 'border-success/30', text: 'text-success-text', label: 'Low Risk' },
    MODERATE: { bg: 'bg-warning/10', border: 'border-warning/30', text: 'text-warning-text', label: 'Moderate Risk' },
    HIGH: { bg: 'bg-danger/10', border: 'border-danger/30', text: 'text-danger-text', label: 'High Risk' },
  }[effectiveLevel];

  return (
    <div className={cn('inline-flex items-center gap-2 px-4 py-2 rounded-full border', config.bg, config.border, className)}>
      <div className={cn('w-2 h-2 rounded-full', effectiveLevel === 'BUILDING' ? 'bg-accent' : effectiveLevel === 'LOW' ? 'bg-success' : effectiveLevel === 'MODERATE' ? 'bg-warning' : 'bg-danger')} />
      <span className={cn('text-sm font-semibold', config.text)}>{config.label}</span>
    </div>
  );
}

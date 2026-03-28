'use client';

import { cn } from '@/lib/utils';
import { type LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react';

type Trend = 'up' | 'down' | 'flat';

interface MetricCardProps {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  iconColor?: string;
  trend?: Trend;
  trendLabel?: string;
  suffix?: string;
  className?: string;
}

const trendIcons: Record<Trend, typeof TrendingUp> = {
  up: TrendingUp,
  down: TrendingDown,
  flat: Minus,
};

const trendColors: Record<Trend, string> = {
  up: 'text-success-text',
  down: 'text-danger-text',
  flat: 'text-text-tertiary',
};

export function MetricCard({
  label,
  value,
  icon: Icon,
  iconColor = 'text-accent',
  trend,
  trendLabel,
  suffix,
  className,
}: MetricCardProps) {
  const TrendIcon = trend ? trendIcons[trend] : null;

  return (
    <div
      className={cn(
        'group rounded-[var(--radius-md)] border border-surface-border bg-bg-secondary p-4',
        'hover:border-surface-border-hover hover:shadow-md hover:-translate-y-px transition-all duration-200',
        className
      )}
    >
      <div className="flex items-center gap-2 mb-2">
        {Icon && <Icon size={14} className={iconColor} />}
        <span className="text-[11px] font-medium uppercase tracking-wider text-text-tertiary">
          {label}
        </span>
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className="text-2xl font-semibold font-mono text-text-primary">
          {value}
        </span>
        {suffix && (
          <span className="text-sm text-text-tertiary">{suffix}</span>
        )}
      </div>
      {trend && TrendIcon && (
        <div className={cn('flex items-center gap-1 mt-1.5', trendColors[trend])}>
          <TrendIcon size={12} />
          {trendLabel && <span className="text-xs">{trendLabel}</span>}
        </div>
      )}
    </div>
  );
}

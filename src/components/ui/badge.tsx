'use client';

import { cn } from '@/lib/utils';

type BadgeVariant = 'default' | 'accent' | 'success' | 'warning' | 'danger' | 'muted';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: 'bg-surface-highlight text-text-secondary border-surface-border',
  accent: 'bg-accent-muted text-accent-text border-accent/20',
  success: 'bg-success/10 text-success-text border-success/20',
  warning: 'bg-warning/10 text-warning-text border-warning/20',
  danger: 'bg-danger/10 text-danger-text border-danger/20',
  muted: 'bg-bg-tertiary text-text-tertiary border-surface-border',
};

export function Badge({ children, variant = 'default', className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full border',
        variantStyles[variant],
        className
      )}
    >
      {children}
    </span>
  );
}

'use client';

import { cn } from '@/lib/utils';

interface StepIndicatorProps {
  steps: number;
  current: number;
  className?: string;
}

export function StepIndicator({ steps, current, className }: StepIndicatorProps) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      {Array.from({ length: steps }).map((_, i) => (
        <div
          key={i}
          className={cn(
            'h-1.5 rounded-full transition-all duration-500 ease-out',
            i === current
              ? 'w-8 bg-accent'
              : i < current
                ? 'w-4 bg-accent/40'
                : 'w-4 bg-surface-border'
          )}
        />
      ))}
    </div>
  );
}

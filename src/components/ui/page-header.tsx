'use client';

import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { type LucideIcon } from 'lucide-react';

interface PageHeaderProps {
  icon?: LucideIcon;
  iconColor?: string;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  className?: string;
}

export function PageHeader({
  icon: Icon,
  iconColor = 'text-accent',
  title,
  subtitle,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn('flex items-start justify-between mb-8', className)}>
      <div className="flex items-center gap-3">
        {Icon && (
          <div className="w-10 h-10 rounded-xl bg-accent-muted flex items-center justify-center shrink-0">
            <Icon size={20} className={iconColor} />
          </div>
        )}
        <div>
          <h1 className="text-xl font-semibold text-text-primary leading-tight">
            {title}
          </h1>
          {subtitle && (
            <p className="text-sm text-text-secondary mt-0.5">{subtitle}</p>
          )}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

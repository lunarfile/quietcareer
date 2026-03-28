'use client';

import { useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface TooltipProps {
  content: string;
  children: ReactNode;
  position?: 'top' | 'bottom';
}

export function Tooltip({ content, children, position = 'top' }: TooltipProps) {
  const [show, setShow] = useState(false);

  return (
    <div
      className="relative inline-flex"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && (
        <div
          className={cn(
            'absolute z-50 px-2.5 py-1.5 text-xs text-text-primary bg-bg-tertiary border border-surface-border rounded-[var(--radius-sm)] shadow-md whitespace-nowrap animate-fade-in',
            'left-1/2 -translate-x-1/2',
            position === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'
          )}
        >
          {content}
        </div>
      )}
    </div>
  );
}

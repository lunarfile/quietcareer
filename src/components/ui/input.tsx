'use client';

import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helper?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, helper, error, id, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={id} className="text-sm font-medium text-text-secondary">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={id}
          className={cn(
            'h-10 w-full rounded-[var(--radius-sm)] border border-surface-border bg-bg-input px-3 text-sm text-text-primary',
            'placeholder:text-text-tertiary',
            'focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent',
            'transition-colors duration-150',
            error && 'border-danger focus:border-danger focus:ring-danger',
            className
          )}
          {...props}
        />
        {helper && !error && (
          <span className="text-xs text-text-tertiary">{helper}</span>
        )}
        {error && <span className="text-xs text-danger-text">{error}</span>}
      </div>
    );
  }
);

Input.displayName = 'Input';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  helper?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, helper, error, id, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={id} className="text-sm font-medium text-text-secondary">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={id}
          rows={4}
          className={cn(
            'w-full rounded-[var(--radius-sm)] border border-surface-border bg-bg-input px-3 py-2.5 text-sm text-text-primary',
            'placeholder:text-text-tertiary',
            'focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent',
            'transition-colors duration-150 resize-none',
            error && 'border-danger focus:border-danger focus:ring-danger',
            className
          )}
          {...props}
        />
        {helper && !error && (
          <span className="text-xs text-text-tertiary">{helper}</span>
        )}
        {error && <span className="text-xs text-danger-text">{error}</span>}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';

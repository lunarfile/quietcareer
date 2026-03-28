'use client';

import { useState, createContext, useContext, useCallback, type ReactNode } from 'react';
import { Button } from './button';

interface ConfirmOptions {
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'default';
}

interface ConfirmContextType {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextType>({
  confirm: () => Promise.resolve(false),
});

export function useConfirm() {
  return useContext(ConfirmContext);
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{
    options: ConfirmOptions;
    resolve: (value: boolean) => void;
  } | null>(null);

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setState({ options, resolve });
    });
  }, []);

  const handleConfirm = () => {
    state?.resolve(true);
    setState(null);
  };

  const handleCancel = () => {
    state?.resolve(false);
    setState(null);
  };

  return (
    <ConfirmContext value={{ confirm }}>
      {children}
      {state && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in"
            onClick={handleCancel}
          />

          {/* Dialog */}
          <div className="relative bg-bg-secondary border border-surface-border rounded-[var(--radius-lg)] shadow-lg p-6 max-w-sm w-full mx-4 animate-fade-up">
            <h3 className="text-base font-semibold text-text-primary mb-2">
              {state.options.title}
            </h3>
            <p className="text-sm text-text-secondary leading-relaxed mb-6">
              {state.options.description}
            </p>
            <div className="flex gap-3 justify-end">
              <Button variant="ghost" size="sm" onClick={handleCancel}>
                {state.options.cancelLabel ?? 'Cancel'}
              </Button>
              <Button
                variant={state.options.variant === 'danger' ? 'danger' : 'primary'}
                size="sm"
                onClick={handleConfirm}
              >
                {state.options.confirmLabel ?? 'Confirm'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext>
  );
}

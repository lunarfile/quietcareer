'use client';

import { Component, type ReactNode } from 'react';
import { Shield, RefreshCw } from 'lucide-react';
import { Button } from './button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="flex flex-col items-center justify-center min-h-[40vh] px-6 text-center">
            <Shield size={40} className="text-text-tertiary mb-4" strokeWidth={1} />
            <h3 className="text-base font-semibold text-text-primary mb-2">
              Something went wrong.
            </h3>
            <p className="text-sm text-text-secondary mb-6 max-w-sm">
              Your data is safe. This is a display error, not a data error.
            </p>
            <Button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
            >
              <RefreshCw size={14} /> Reload
            </Button>
          </div>
        )
      );
    }

    return this.props.children;
  }
}

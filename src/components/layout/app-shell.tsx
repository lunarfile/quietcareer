'use client';

import { type ReactNode, useEffect, useState, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { Sidebar } from './sidebar';
import { MobileNav } from './mobile-nav';
import { ToastProvider } from '@/components/ui/toast';
import { PageTransition } from '@/components/ui/page-transition';
import { DailyQuote } from '@/components/brand/daily-quote';
import { FabMenu } from '@/components/ui/fab-menu';
import { OfflineIndicator } from '@/components/ui/offline-indicator';
import { ConfirmProvider } from '@/components/ui/confirm-dialog';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { CommandPalette } from '@/components/ui/command-palette';
import { QuickEntry } from '@/components/ui/quick-entry';
import { GlobalSearch } from '@/components/ui/global-search';
import { SessionLock } from '@/components/ui/session-lock';

const ONBOARDING_ROUTES = ['/', '/onboarding'];

function shouldShowDailyQuote(): boolean {
  if (typeof window === 'undefined') return false;
  const today = new Date().toISOString().split('T')[0];
  const lastShown = localStorage.getItem('qc_quote_date');
  return lastShown !== today;
}

function markQuoteShown(): void {
  const today = new Date().toISOString().split('T')[0];
  localStorage.setItem('qc_quote_date', today);
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isOnboarding = ONBOARDING_ROUTES.includes(pathname);
  const [showQuote, setShowQuote] = useState(false);

  useEffect(() => {
    if (!isOnboarding && shouldShowDailyQuote()) {
      setShowQuote(true);
    }
  }, [isOnboarding]);

  const handleQuoteComplete = useCallback(() => {
    markQuoteShown();
    setShowQuote(false);
  }, []);

  if (isOnboarding) {
    return (
      <ToastProvider>
        <main className="min-h-screen pt-12 md:pt-0">{children}</main>
      </ToastProvider>
    );
  }

  return (
    <ToastProvider>
    <ConfirmProvider>
    <SessionLock>
      {showQuote && <DailyQuote onComplete={handleQuoteComplete} />}
      <OfflineIndicator />
      <CommandPalette />
      <QuickEntry />
      <GlobalSearch />
      <div className="flex min-h-screen">
        <Sidebar />
        <main id="main-content" className="flex-1 pb-24 md:pb-0 overflow-x-hidden">
          <div className="mx-auto max-w-[960px] px-4 pt-12 pb-6 md:px-8 md:pt-8 md:pb-8">
            <ErrorBoundary>
              <PageTransition>{children}</PageTransition>
            </ErrorBoundary>
          </div>
        </main>
        <FabMenu />
        <MobileNav />
      </div>
    </SessionLock>
    </ConfirmProvider>
    </ToastProvider>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, X } from 'lucide-react';
import Link from 'next/link';

const REMINDER_INTERVAL_DAYS = 14;

export function BackupReminder() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const lastBackup = localStorage.getItem('qc_last_backup');
    if (!lastBackup) {
      // Only show after 7 days of use
      const firstUse = localStorage.getItem('qc_first_use');
      if (!firstUse) {
        localStorage.setItem('qc_first_use', Date.now().toString());
        return;
      }
      const daysSinceFirst = Math.floor((Date.now() - parseInt(firstUse)) / 86400000);
      if (daysSinceFirst >= 7) setShow(true);
    } else {
      const daysSinceBackup = Math.floor((Date.now() - parseInt(lastBackup)) / 86400000);
      if (daysSinceBackup >= REMINDER_INTERVAL_DAYS) setShow(true);
    }
  }, []);

  const dismiss = () => {
    setShow(false);
    // Snooze for 7 days
    localStorage.setItem('qc_last_backup', (Date.now() - 7 * 86400000).toString());
  };

  const markBacked = () => {
    localStorage.setItem('qc_last_backup', Date.now().toString());
    setShow(false);
  };

  if (!show) return null;

  return (
    <Card className="bg-bg-tertiary/30 border-surface-border-hover">
      <div className="flex items-start gap-3">
        <Download size={16} className="text-accent-secondary shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm text-text-secondary">
            Back up your data? It&apos;s been a while.
          </p>
          <div className="flex gap-2 mt-2">
            <Link href="/settings?tab=data" onClick={markBacked}>
              <Button size="sm" variant="secondary">
                <Download size={12} /> Export Now
              </Button>
            </Link>
            <Button size="sm" variant="ghost" onClick={dismiss}>
              Later
            </Button>
          </div>
        </div>
        <button onClick={dismiss} className="text-text-tertiary hover:text-text-secondary" aria-label="Dismiss">
          <X size={14} />
        </button>
      </div>
    </Card>
  );
}

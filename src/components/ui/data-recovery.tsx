'use client';

import { useEffect, useState } from 'react';
import { checkIntegrity, restoreFromBackup, type IntegrityResult } from '@/lib/auto-backup';
import { Button } from './button';
import { Shield, AlertTriangle, Check } from 'lucide-react';

export function DataRecoveryGuard({ children }: { children: React.ReactNode }) {
  const [result, setResult] = useState<IntegrityResult | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [restored, setRestored] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    checkIntegrity().then((r) => {
      setResult(r);
      setChecking(false);
    }).catch(() => setChecking(false));
  }, []);

  const handleRestore = async () => {
    setRestoring(true);
    const outcome = await restoreFromBackup();
    setRestoring(false);
    if (outcome) {
      setRestored(true);
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    }
  };

  const handleSkip = () => {
    setResult(null);
  };

  if (checking) return <>{children}</>;

  // Show recovery prompt if data loss detected
  if (result?.status === 'data-loss-detected' && result.backupAvailable) {
    const ageHours = result.backupAge ? Math.round(result.backupAge / 3600000) : null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg-primary px-6">
        <div className="max-w-sm w-full text-center">
          {restored ? (
            <div className="animate-fade-up">
              <Check size={48} className="text-success mx-auto mb-4" />
              <h2 className="text-lg font-semibold text-text-primary mb-2">Data Restored</h2>
              <p className="text-sm text-text-secondary">Reloading...</p>
            </div>
          ) : (
            <div className="animate-fade-up">
              <AlertTriangle size={48} className="text-warning mx-auto mb-4" />
              <h2 className="text-lg font-semibold text-text-primary mb-2">
                Data Loss Detected
              </h2>
              <p className="text-sm text-text-secondary mb-2 leading-relaxed">
                Some of your data appears to be missing:
              </p>
              <div className="flex flex-wrap justify-center gap-1.5 mb-4">
                {result.lostTables.map((t) => (
                  <span key={t} className="text-xs px-2 py-1 bg-danger/10 text-danger-text rounded-full">
                    {t}
                  </span>
                ))}
              </div>
              <p className="text-sm text-text-secondary mb-6">
                A backup was found{ageHours !== null ? ` (${ageHours < 1 ? 'less than an hour' : `${ageHours} hours`} old)` : ''}.
              </p>
              <div className="space-y-3">
                <Button size="lg" className="w-full" onClick={handleRestore} disabled={restoring}>
                  <Shield size={16} /> {restoring ? 'Restoring...' : 'Restore from Backup'}
                </Button>
                <button
                  onClick={handleSkip}
                  className="text-sm text-text-tertiary hover:text-text-secondary transition-colors"
                >
                  Skip — start fresh
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

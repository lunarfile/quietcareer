'use client';

import { useState, useEffect } from 'react';
import { Shield, Lock } from 'lucide-react';
import { Button } from './button';
import { initializeEncryption, isEncryptionReady } from '@/lib/crypto';

interface SessionLockProps {
  children: React.ReactNode;
}

export function SessionLock({ children }: SessionLockProps) {
  const [locked, setLocked] = useState(false);
  const [passphrase, setPassphrase] = useState('');
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // Check if passphrase is enabled
    const hasPassphrase = localStorage.getItem('qc_passphrase_enabled');
    if (hasPassphrase === 'true' && !isEncryptionReady()) {
      setLocked(true);
    }
    setChecking(false);
  }, []);

  const handleUnlock = async () => {
    try {
      await initializeEncryption(passphrase);
      setLocked(false);
      setError('');
    } catch {
      setError('Failed to unlock. Try again.');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleUnlock();
  };

  if (checking) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-bg-primary">
        <Shield size={28} className="text-accent animate-pulse-gentle" />
      </div>
    );
  }

  if (!locked) return <>{children}</>;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-bg-primary px-6">
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full bg-accent/[0.02] blur-[100px]" />
      </div>

      <div className="relative z-10 w-full max-w-sm text-center">
        <div className="w-16 h-16 rounded-2xl bg-accent-muted flex items-center justify-center mx-auto mb-6">
          <Lock size={28} className="text-accent" />
        </div>

        <h2 className="text-xl font-semibold text-text-primary mb-2">
          Session Locked
        </h2>
        <p className="text-sm text-text-secondary mb-8">
          Enter your passphrase to access your career data.
        </p>

        <input
          type="password"
          value={passphrase}
          onChange={(e) => { setPassphrase(e.target.value); setError(''); }}
          onKeyDown={handleKeyDown}
          placeholder="Your passphrase"
          autoFocus
          className="w-full h-12 px-4 rounded-[var(--radius-md)] border border-surface-border bg-bg-input text-sm text-text-primary text-center placeholder:text-text-tertiary focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
        />

        {error && (
          <p className="text-xs text-danger-text mt-2">{error}</p>
        )}

        <Button size="lg" onClick={handleUnlock} className="w-full mt-4" disabled={!passphrase}>
          Unlock
        </Button>

        <p className="text-xs text-text-tertiary mt-6">
          Your data is encrypted locally. This passphrase never leaves your device.
        </p>
      </div>
    </div>
  );
}

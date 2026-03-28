'use client';

import { useState, useEffect } from 'react';
import { Shield, Lock, Fingerprint } from 'lucide-react';
import { Button } from './button';
import { initializeEncryption, isEncryptionReady } from '@/lib/crypto';
import {
  isBiometricAvailable,
  isBiometricSupported,
  hasBiometricCredential,
  authenticateBiometric,
} from '@/lib/webauthn';

interface SessionLockProps {
  children: React.ReactNode;
}

export function SessionLock({ children }: SessionLockProps) {
  const [locked, setLocked] = useState(false);
  const [passphrase, setPassphrase] = useState('');
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(true);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricAttempting, setBiometricAttempting] = useState(false);

  useEffect(() => {
    const check = async () => {
      const hasPassphrase = localStorage.getItem('qc_passphrase_enabled') === 'true';
      if (hasPassphrase && !isEncryptionReady()) {
        setLocked(true);

        // Check biometric availability
        if (hasBiometricCredential()) {
          const supported = await isBiometricSupported();
          setBiometricAvailable(supported);

          // Auto-prompt biometric on load
          if (supported) {
            setBiometricAttempting(true);
            const success = await authenticateBiometric();
            setBiometricAttempting(false);
            if (success) {
              // Retrieve stored passphrase and initialize encryption
              const storedPass = localStorage.getItem('qc_biometric_pass');
              if (storedPass) {
                await initializeEncryption(storedPass);
                setLocked(false);
                setChecking(false);
                return;
              }
            }
          }
        }
      }
      setChecking(false);
    };
    check();
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

  const handleBiometric = async () => {
    setBiometricAttempting(true);
    setError('');
    const success = await authenticateBiometric();
    setBiometricAttempting(false);

    if (success) {
      const storedPass = localStorage.getItem('qc_biometric_pass');
      if (storedPass) {
        await initializeEncryption(storedPass);
        setLocked(false);
      } else {
        setError('Biometric verified but passphrase not linked. Enter passphrase manually.');
      }
    } else {
      setError('Biometric verification failed. Try again or use passphrase.');
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
          {biometricAvailable
            ? 'Use biometrics or enter your passphrase.'
            : 'Enter your passphrase to access your career data.'}
        </p>

        {/* Biometric button */}
        {biometricAvailable && (
          <Button
            size="lg"
            onClick={handleBiometric}
            disabled={biometricAttempting}
            className="w-full mb-4"
          >
            <Fingerprint size={18} />
            {biometricAttempting ? 'Verifying...' : 'Unlock with Biometrics'}
          </Button>
        )}

        {biometricAvailable && (
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px bg-surface-border" />
            <span className="text-xs text-text-tertiary">or passphrase</span>
            <div className="flex-1 h-px bg-surface-border" />
          </div>
        )}

        {/* Passphrase input */}
        <input
          type="password"
          value={passphrase}
          onChange={(e) => { setPassphrase(e.target.value); setError(''); }}
          onKeyDown={handleKeyDown}
          placeholder="Your passphrase"
          autoFocus={!biometricAvailable}
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

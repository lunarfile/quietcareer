'use client';

import { useState } from 'react';
import { Button } from './button';
import { Lock, X } from 'lucide-react';

interface PassphraseModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (passphrase: string) => void;
}

export function PassphraseModal({ open, onClose, onSubmit }: PassphraseModalProps) {
  const [passphrase, setPassphrase] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');

  if (!open) return null;

  const handleSubmit = () => {
    if (passphrase.length < 4) {
      setError('At least 4 characters.');
      return;
    }
    if (passphrase !== confirm) {
      setError('Passphrases don\u2019t match.');
      return;
    }
    onSubmit(passphrase);
    setPassphrase('');
    setConfirm('');
    setError('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div className="relative bg-bg-secondary border border-surface-border rounded-[var(--radius-lg)] shadow-lg p-6 max-w-sm w-full mx-4 animate-fade-up">
        <button onClick={onClose} className="absolute top-4 right-4 text-text-tertiary hover:text-text-primary" aria-label="Close">
          <X size={16} />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-accent-muted flex items-center justify-center">
            <Lock size={18} className="text-accent" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-text-primary">Set Passphrase</h3>
            <p className="text-xs text-text-tertiary">Encrypts sensitive data locally</p>
          </div>
        </div>

        <div className="space-y-3">
          <input
            type="password"
            value={passphrase}
            onChange={(e) => { setPassphrase(e.target.value); setError(''); }}
            placeholder="Choose a passphrase"
            autoFocus
            className="w-full h-10 px-3 rounded-[var(--radius-sm)] border border-surface-border bg-bg-input text-sm text-text-primary placeholder:text-text-tertiary focus:border-accent focus:outline-none"
          />
          <input
            type="password"
            value={confirm}
            onChange={(e) => { setConfirm(e.target.value); setError(''); }}
            placeholder="Confirm passphrase"
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            className="w-full h-10 px-3 rounded-[var(--radius-sm)] border border-surface-border bg-bg-input text-sm text-text-primary placeholder:text-text-tertiary focus:border-accent focus:outline-none"
          />
          {error && <p className="text-xs text-danger-text">{error}</p>}
        </div>

        <div className="flex gap-3 mt-5">
          <Button variant="ghost" size="sm" onClick={onClose} className="flex-1">Cancel</Button>
          <Button size="sm" onClick={handleSubmit} className="flex-1">Enable Lock</Button>
        </div>

        <p className="text-[10px] text-text-tertiary mt-4 text-center">
          This passphrase never leaves your device. If you forget it, you can reset in Settings &gt; Data.
        </p>
      </div>
    </div>
  );
}

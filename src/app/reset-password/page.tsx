'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { updatePassword } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Shield } from 'lucide-react';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const handleReset = async () => {
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords don\u2019t match.');
      return;
    }

    setLoading(true);
    setError('');
    const { error: err } = await updatePassword(password);
    setLoading(false);

    if (err) {
      setError(err);
    } else {
      setDone(true);
      setTimeout(() => router.replace('/dashboard'), 2000);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6 bg-bg-primary">
      <div className="w-full max-w-sm text-center">
        <Shield size={40} className="text-accent mx-auto mb-6" />

        {done ? (
          <div className="animate-fade-up">
            <h2 className="text-lg font-semibold text-text-primary mb-2">Password updated</h2>
            <p className="text-sm text-text-secondary">Redirecting to your dashboard...</p>
          </div>
        ) : (
          <>
            <h2 className="text-lg font-semibold text-text-primary mb-2">Set new password</h2>
            <p className="text-sm text-text-secondary mb-6">Enter your new password below.</p>

            <div className="space-y-3">
              <input
                type="password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                placeholder="New password (6+ characters)"
                autoFocus
                className="w-full h-12 px-4 rounded-xl border border-surface-border bg-bg-input text-sm text-text-primary placeholder:text-text-tertiary focus:border-accent focus:outline-none"
              />
              <input
                type="password"
                value={confirm}
                onChange={(e) => { setConfirm(e.target.value); setError(''); }}
                onKeyDown={(e) => e.key === 'Enter' && handleReset()}
                placeholder="Confirm password"
                className="w-full h-12 px-4 rounded-xl border border-surface-border bg-bg-input text-sm text-text-primary placeholder:text-text-tertiary focus:border-accent focus:outline-none"
              />
              {error && <p className="text-xs text-danger-text">{error}</p>}
              <Button className="w-full h-12" onClick={handleReset} disabled={loading}>
                {loading ? 'Updating...' : 'Update Password'}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isOnboardingComplete } from '@/lib/settings';
import { useAuth } from '@/lib/auth-context';
import { handleAuthCallback, signInWithEmail, signUpWithEmail, resetPassword, getCurrentUser, restoreFromCloud } from '@/lib/supabase';
import { db } from '@/lib/db';
import { AnimatedShield } from '@/components/brand/animated-shield';
import { GoogleSignInButton } from '@/components/auth/google-button';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';

type AuthMode = 'welcome' | 'signin' | 'signup';

export default function WelcomePage() {
  const router = useRouter();
  const { isSignedIn } = useAuth();
  const { toast } = useToast();
  const [checking, setChecking] = useState(true);
  const [show, setShow] = useState(false);
  const [mode, setMode] = useState<AuthMode>('welcome');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);


  const handleEmailSubmit = async () => {
    if (!email.trim() || !password.trim()) { toast('Enter email and password.', 'error'); return; }
    if (password.length < 6) { toast('Password must be at least 6 characters.', 'error'); return; }
    setLoading(true);
    if (mode === 'signup') {
      const { error } = await signUpWithEmail(email, password);
      setLoading(false);
      if (error) { toast(error, 'error'); return; }
      toast('Account created! Check your email to confirm.', 'success');
      setMode('signin');
    } else {
      const { user: u, error } = await signInWithEmail(email, password);
      setLoading(false);
      if (error) { toast(error, 'error'); return; }
      if (u) router.replace('/onboarding');
    }
  };

  useEffect(() => {
    async function init() {
      // Handle OAuth callback
      const callbackUser = await handleAuthCallback();
      const user = callbackUser || await getCurrentUser();

      if (user) {
        // Signed in — always try restore if settings are empty
        const settingsCount = await db.settings.count();
        if (settingsCount === 0) {
          await restoreFromCloud();
          await new Promise((r) => setTimeout(r, 1000));
        }
        const complete = await isOnboardingComplete();
        router.replace(complete ? '/dashboard' : '/onboarding');
        return;
      }

      // Not signed in
      const complete = await isOnboardingComplete();
      if (complete) {
        router.replace('/dashboard');
      } else {
        setChecking(false);
        setTimeout(() => setShow(true), 200);
      }
    }
    init();
  }, [router]);

  if (checking) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-bg-primary">
        <div className="w-8 h-8 rounded-full border-2 border-accent border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen px-6 overflow-hidden">
      {/* Ambient gradient background */}
      <div className="absolute inset-0 bg-bg-primary" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-accent/[0.03] blur-[120px]" />

      <div className="relative z-10 flex flex-col items-center text-center max-w-sm w-full">
        {/* Shield */}
        <div
          className="mb-8"
          style={{
            opacity: show ? 1 : 0,
            transition: 'opacity 0.6s ease',
          }}
        >
          <AnimatedShield size={80} />
        </div>

        {/* Title */}
        <h1
          className="text-3xl font-semibold text-text-primary mb-3 tracking-tight"
          style={{
            opacity: show ? 1 : 0,
            transform: show ? 'translateY(0)' : 'translateY(16px)',
            transition: 'all 0.7s cubic-bezier(0.16, 1, 0.3, 1) 0.4s',
          }}
        >
          QuietCareer
        </h1>

        <p
          className="text-base text-text-secondary mb-2 leading-relaxed"
          style={{
            opacity: show ? 1 : 0,
            transform: show ? 'translateY(0)' : 'translateY(12px)',
            transition: 'all 0.7s cubic-bezier(0.16, 1, 0.3, 1) 0.6s',
          }}
        >
          Your private career intelligence system.
        </p>

        <p
          className="text-sm text-text-tertiary mb-10 max-w-xs leading-relaxed"
          style={{
            opacity: show ? 1 : 0,
            transform: show ? 'translateY(0)' : 'translateY(12px)',
            transition: 'all 0.7s cubic-bezier(0.16, 1, 0.3, 1) 0.8s',
          }}
        >
          No accounts. No cloud we control. Everything stays on your device.
        </p>

        {/* Auth */}
        <div className="w-full space-y-4" style={{ opacity: show ? 1 : 0, transform: show ? 'translateY(0)' : 'translateY(12px)', transition: 'all 0.7s cubic-bezier(0.16, 1, 0.3, 1) 1s' }}>

          {mode === 'welcome' && (
            <>
              <GoogleSignInButton
                onSuccess={() => router.replace('/onboarding')}
                onError={(err) => toast(err, 'error')}
              />
              <div className="flex items-center gap-3"><div className="flex-1 h-px bg-surface-border" /><span className="text-xs text-text-tertiary">or</span><div className="flex-1 h-px bg-surface-border" /></div>
              <Button variant="secondary" className="w-full h-12" onClick={() => setMode('signin')}>Sign in with email</Button>
              <button onClick={() => setMode('signup')} className="text-sm text-text-tertiary hover:text-text-secondary transition-colors">Create an account</button>
              <button onClick={() => router.push('/onboarding')} className="text-xs text-text-tertiary/60 hover:text-text-tertiary transition-colors pt-2 block mx-auto">Continue without an account</button>
            </>
          )}

          {(mode === 'signin' || mode === 'signup') && (
            <>
              <p className="text-sm font-medium text-text-primary">{mode === 'signup' ? 'Create your account' : 'Welcome back'}</p>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" autoFocus className="w-full h-12 px-4 rounded-xl border border-surface-border bg-bg-input text-sm text-text-primary placeholder:text-text-tertiary focus:border-accent focus:outline-none" />
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleEmailSubmit()} placeholder={mode === 'signup' ? 'Create password (6+ characters)' : 'Password'} className="w-full h-12 px-4 rounded-xl border border-surface-border bg-bg-input text-sm text-text-primary placeholder:text-text-tertiary focus:border-accent focus:outline-none" />
              <Button className="w-full h-12" onClick={handleEmailSubmit} disabled={loading}>{loading ? 'Please wait...' : mode === 'signup' ? 'Create Account' : 'Sign In'}</Button>
              <div className="flex items-center gap-3"><div className="flex-1 h-px bg-surface-border" /><span className="text-xs text-text-tertiary">or</span><div className="flex-1 h-px bg-surface-border" /></div>
              <GoogleSignInButton
                onSuccess={() => router.replace('/onboarding')}
                onError={(err) => toast(err, 'error')}
                size="medium"
              />
              {mode === 'signin' && (
                <button onClick={async () => {
                  if (!email.trim()) { toast('Enter your email first.', 'error'); return; }
                  const { error } = await resetPassword(email);
                  if (error) toast(error, 'error');
                  else toast('Password reset email sent. Check your inbox.', 'success');
                }} className="text-xs text-accent hover:text-accent-hover transition-colors">
                  Forgot password?
                </button>
              )}
              <button onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')} className="text-sm text-text-tertiary hover:text-text-secondary transition-colors">{mode === 'signin' ? "No account? Sign up" : 'Have an account? Sign in'}</button>
              <button onClick={() => setMode('welcome')} className="text-xs text-text-tertiary/60 hover:text-text-tertiary transition-colors">Back</button>
            </>
          )}
        </div>

        <p className="text-[10px] text-text-tertiary/50 mt-8 max-w-xs" style={{ opacity: show ? 1 : 0, transition: 'opacity 1s ease 1s' }}>Your data is encrypted before leaving your device. We cannot read it.</p>
      </div>
    </div>
  );
}

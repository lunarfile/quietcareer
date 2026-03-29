'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isOnboardingComplete } from '@/lib/settings';
import { useAuth } from '@/lib/auth-context';
import { handleAuthCallback, signInWithGoogle, signInWithEmail, signUpWithEmail } from '@/lib/supabase';
import { AnimatedShield } from '@/components/brand/animated-shield';
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

  const handleGoogle = async () => { setLoading(true); await signInWithGoogle(); };

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
    // Handle OAuth callback (returning from Google)
    handleAuthCallback().then((callbackUser) => {
      if (callbackUser) {
        // User just signed in — check if onboarding done
        isOnboardingComplete().then((complete) => {
          router.replace(complete ? '/dashboard' : '/onboarding');
        });
        return;
      }

      // Check if already signed in + onboarded
      isOnboardingComplete().then((complete) => {
        if (complete) {
          router.replace('/dashboard');
        } else {
          setChecking(false);
          setTimeout(() => setShow(true), 200);
        }
      });
    });
  }, [router]);

  // If already signed in, redirect
  useEffect(() => {
    if (isSignedIn) {
      isOnboardingComplete().then((complete) => {
        if (complete) router.replace('/dashboard');
        else router.replace('/onboarding');
      });
    }
  }, [isSignedIn, router]);

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
              <button onClick={handleGoogle} disabled={loading} className="w-full h-12 flex items-center justify-center gap-3 rounded-xl border border-surface-border bg-bg-secondary text-sm font-medium text-text-primary active:scale-[0.98] transition-all">
                <svg viewBox="0 0 24 24" width="18" height="18"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                {loading ? 'Signing in...' : 'Continue with Google'}
              </button>
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
              <button onClick={handleGoogle} disabled={loading} className="w-full h-10 flex items-center justify-center gap-2 rounded-xl border border-surface-border text-xs text-text-secondary active:scale-[0.98] transition-all">
                <svg viewBox="0 0 24 24" width="14" height="14"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                Continue with Google
              </button>
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

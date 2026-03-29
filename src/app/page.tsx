'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isOnboardingComplete } from '@/lib/settings';
import { useAuth } from '@/lib/auth-context';
import { handleAuthCallback } from '@/lib/supabase';
import { AnimatedShield } from '@/components/brand/animated-shield';
import { SignInButton } from '@/components/auth/sign-in-button';

export default function WelcomePage() {
  const router = useRouter();
  const { user, isSignedIn } = useAuth();
  const [checking, setChecking] = useState(true);
  const [show, setShow] = useState(false);

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

        {/* Google Sign-In — primary action */}
        <div
          className="w-full space-y-3"
          style={{
            opacity: show ? 1 : 0,
            transform: show ? 'translateY(0)' : 'translateY(12px)',
            transition: 'all 0.7s cubic-bezier(0.16, 1, 0.3, 1) 1s',
          }}
        >
          <SignInButton className="w-full h-12 text-base" />
          <p className="text-[10px] text-text-tertiary">
            Sign in to back up your data across devices. Encrypted before upload.
          </p>

          <button
            onClick={() => router.push('/onboarding')}
            className="text-sm text-text-tertiary hover:text-text-secondary transition-colors pt-2 block mx-auto"
          >
            Continue without signing in
          </button>
        </div>
      </div>
    </div>
  );
}

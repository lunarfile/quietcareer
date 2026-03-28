'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isOnboardingComplete } from '@/lib/settings';
import { AnimatedShield } from '@/components/brand/animated-shield';
import { Button } from '@/components/ui/button';

export default function WelcomePage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [show, setShow] = useState(false);

  useEffect(() => {
    isOnboardingComplete().then((complete) => {
      if (complete) {
        router.replace('/dashboard');
      } else {
        setChecking(false);
        // Stagger the reveal
        setTimeout(() => setShow(true), 200);
      }
    });
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
      <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-bg-primary to-transparent" />

      <div className="relative z-10 flex flex-col items-center text-center max-w-md">
        {/* Animated shield */}
        <div
          className="mb-8"
          style={{
            opacity: show ? 1 : 0,
            transition: 'opacity 0.6s ease',
          }}
        >
          <AnimatedShield size={88} />
        </div>

        {/* Title */}
        <h1
          className="text-3xl md:text-4xl font-semibold text-text-primary mb-3 tracking-tight"
          style={{
            opacity: show ? 1 : 0,
            transform: show ? 'translateY(0)' : 'translateY(16px)',
            transition: 'all 0.7s cubic-bezier(0.16, 1, 0.3, 1) 0.4s',
          }}
        >
          Welcome to QuietCareer
        </h1>

        {/* Subtitle */}
        <p
          className="text-lg text-text-secondary mb-3 leading-relaxed"
          style={{
            opacity: show ? 1 : 0,
            transform: show ? 'translateY(0)' : 'translateY(12px)',
            transition: 'all 0.7s cubic-bezier(0.16, 1, 0.3, 1) 0.6s',
          }}
        >
          Your private career intelligence system.
        </p>

        {/* Privacy message */}
        <p
          className="text-sm text-text-tertiary mb-12 max-w-xs leading-relaxed"
          style={{
            opacity: show ? 1 : 0,
            transform: show ? 'translateY(0)' : 'translateY(12px)',
            transition: 'all 0.7s cubic-bezier(0.16, 1, 0.3, 1) 0.8s',
          }}
        >
          Everything stays on your device. No accounts. No tracking. No cloud we control.
        </p>

        {/* CTA */}
        <div
          style={{
            opacity: show ? 1 : 0,
            transform: show ? 'translateY(0)' : 'translateY(12px)',
            transition: 'all 0.7s cubic-bezier(0.16, 1, 0.3, 1) 1s',
          }}
        >
          <Button
            size="lg"
            onClick={() => router.push('/onboarding')}
            className="px-10 shadow-lg shadow-accent/20"
          >
            Get Started
          </Button>
        </div>

        {/* Footer tag */}
        <p
          className="text-sm text-text-tertiary mt-12 tracking-wide max-w-xs leading-relaxed"
          style={{
            opacity: show ? 0.7 : 0,
            transform: show ? 'translateY(0)' : 'translateY(8px)',
            transition: 'all 0.7s cubic-bezier(0.16, 1, 0.3, 1) 0.6s',
          }}
        >
          Yours alone. No employer sees this. No data leaves your device.
        </p>
      </div>
    </div>
  );
}

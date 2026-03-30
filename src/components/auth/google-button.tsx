'use client';

import { useEffect, useRef, useCallback } from 'react';
import { getSupabase } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';

const GOOGLE_CLIENT_ID = '836846008385-lo92tmemaadlq29k6dm896najtm8cn6k.apps.googleusercontent.com';

interface GoogleButtonProps {
  onSuccess?: (user: User) => void;
  onError?: (error: string) => void;
  theme?: 'outline' | 'filled_blue' | 'filled_black';
  size?: 'large' | 'medium' | 'small';
  width?: number;
}

let initialized = false;

export function GoogleSignInButton({
  onSuccess,
  onError,
  theme = 'outline',
  size = 'large',
  width = 320,
}: GoogleButtonProps) {
  const buttonRef = useRef<HTMLDivElement>(null);
  const callbackRef = useRef({ onSuccess, onError });
  callbackRef.current = { onSuccess, onError };

  useEffect(() => {
    function tryInit() {
      const google = (window as unknown as {
        google?: {
          accounts: {
            id: {
              initialize: (config: unknown) => void;
              renderButton: (el: HTMLElement, config: unknown) => void;
            };
          };
        };
      }).google;

      if (!google || !buttonRef.current) return false;

      if (!initialized) {
        google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: async (response: { credential: string }) => {
            const { data, error } = await getSupabase().auth.signInWithIdToken({
              provider: 'google',
              token: response.credential,
            });
            if (error) {
              callbackRef.current.onError?.(error.message);
              return;
            }
            if (data?.user) {
              callbackRef.current.onSuccess?.(data.user);
            }
          },
        });
        initialized = true;
      }

      google.accounts.id.renderButton(buttonRef.current, {
        theme,
        size,
        width,
        text: 'continue_with',
        shape: 'rectangular',
        logo_alignment: 'left',
      });

      return true;
    }

    if (!tryInit()) {
      const timer = setTimeout(tryInit, 1000);
      return () => clearTimeout(timer);
    }
  // Only run once on mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={buttonRef} className="flex justify-center" />;
}

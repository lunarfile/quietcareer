'use client';

import { useEffect, useRef } from 'react';
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

export function GoogleSignInButton({
  onSuccess,
  onError,
  theme = 'outline',
  size = 'large',
  width = 320,
}: GoogleButtonProps) {
  const buttonRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
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

    if (!google || !buttonRef.current) {
      // Google script not loaded yet — retry after a short delay
      const timer = setTimeout(() => {
        const g = (window as unknown as { google?: unknown }).google as typeof google;
        if (g && buttonRef.current) {
          initGoogle(g);
        }
      }, 1000);
      return () => clearTimeout(timer);
    }

    initGoogle(google);

    function initGoogle(g: NonNullable<typeof google>) {
      g.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: async (response: { credential: string }) => {
          const { data, error } = await getSupabase().auth.signInWithIdToken({
            provider: 'google',
            token: response.credential,
          });

          if (error) {
            onError?.(error.message);
            return;
          }

          if (data?.user) {
            onSuccess?.(data.user);
          }
        },
      });

      if (buttonRef.current) {
        g.accounts.id.renderButton(buttonRef.current, {
          theme,
          size,
          width,
          text: 'continue_with',
          shape: 'rectangular',
          logo_alignment: 'left',
        });
      }
    }
  }, [onSuccess, onError, theme, size, width]);

  return <div ref={buttonRef} className="flex justify-center" />;
}

'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { getCurrentUser, onAuthStateChange, syncToCloud, handleAuthCallback } from './supabase';
import type { User } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isSignedIn: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  isSignedIn: false,
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Handle OAuth callback (returning from Google sign-in)
    handleAuthCallback().then((callbackUser) => {
      if (callbackUser) {
        setUser(callbackUser);
        setLoading(false);
        syncToCloud().catch(() => {});
        return;
      }
    });

    // Check current session
    getCurrentUser().then((u) => {
      setUser(u);
      setLoading(false);

      // Auto-sync on sign-in
      if (u) {
        syncToCloud().catch(() => {});
      }
    });

    // Listen for auth changes
    const { data } = onAuthStateChange((u) => {
      setUser(u);
      setLoading(false);

      // Auto-sync when user signs in
      if (u) {
        syncToCloud().catch(() => {});
      }
    });

    return () => {
      data?.subscription?.unsubscribe();
    };
  }, []);

  return (
    <AuthContext value={{ user, loading, isSignedIn: !!user }}>
      {children}
    </AuthContext>
  );
}

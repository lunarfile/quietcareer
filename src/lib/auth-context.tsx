'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { getCurrentUser, onAuthStateChange, syncToCloud, restoreFromCloud, handleAuthCallback } from './supabase';
import { db } from './db';
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
    getCurrentUser().then(async (u) => {
      setUser(u);
      setLoading(false);

      if (u) {
        // If local DB is empty but user is signed in, restore from cloud
        const localCount = await db.workLogs.count();
        if (localCount === 0) {
          await restoreFromCloud();
        } else {
          await syncToCloud().catch(() => {});
        }
      }
    });

    // Listen for auth changes
    const { data } = onAuthStateChange(async (u) => {
      setUser(u);
      setLoading(false);

      if (u) {
        // On sign-in: restore from cloud if local is empty, else sync
        const localCount = await db.workLogs.count();
        if (localCount === 0) {
          await restoreFromCloud();
        } else {
          await syncToCloud().catch(() => {});
        }
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

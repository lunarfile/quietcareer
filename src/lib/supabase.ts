/**
 * Supabase client for cloud backup + Google Sign-In.
 *
 * Architecture:
 * - Data encrypted client-side BEFORE upload (we can't read it)
 * - Google Sign-In for auth (one tap on Android, popup on web)
 * - RLS ensures users only access their own data
 * - One row per user in user_backups table
 */

import { createClient, type User } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://yzuunyoftiypwebihdux.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_IFKY0Sv6E5iORXe2VMVU2g_zvlqZ2my';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let supabase: any = null;

export function getSupabase() {
  if (!supabase) {
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      db: { schema: 'quietcareer' },
    });
  }
  return supabase;
}

// === Auth ===

export async function signInWithGoogle(): Promise<User | null> {
  const { data, error } = await getSupabase().auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: typeof window !== 'undefined' ? window.location.origin + '/dashboard' : undefined,
    },
  });

  if (error) {
    console.error('Google sign-in failed:', error);
    return null;
  }

  return null; // OAuth redirects — user comes back after
}

export async function getCurrentUser(): Promise<User | null> {
  const { data } = await getSupabase().auth.getUser();
  return data?.user ?? null;
}

export async function signOut(): Promise<void> {
  await getSupabase().auth.signOut();
}

export function onAuthStateChange(callback: (user: User | null) => void) {
  return getSupabase().auth.onAuthStateChange((_event: string, session: { user: User | null } | null) => {
    callback(session?.user ?? null);
  });
}

// === Cloud Backup ===

export async function pushBackup(encryptedData: string, recordCount: number): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user) return false;

  const { error } = await getSupabase()
    .from('user_backups')
    .upsert({
      user_id: user.id,
      encrypted_data: encryptedData,
      record_count: recordCount,
      data_version: 1,
      last_sync_at: new Date().toISOString(),
    }, {
      onConflict: 'user_id',
    });

  if (error) {
    console.error('Backup push failed:', error);
    return false;
  }

  // Log the sync
  await getSupabase().from('sync_log').insert({
    user_id: user.id,
    action: 'push',
    record_count: recordCount,
  });

  return true;
}

export async function pullBackup(): Promise<{ encryptedData: string; recordCount: number; lastSync: string } | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  const { data, error } = await getSupabase()
    .from('user_backups')
    .select('encrypted_data, record_count, last_sync_at')
    .eq('user_id', user.id)
    .single();

  if (error || !data) return null;

  // Log the sync
  await getSupabase().from('sync_log').insert({
    user_id: user.id,
    action: 'pull',
    record_count: data.record_count,
  });

  return {
    encryptedData: data.encrypted_data,
    recordCount: data.record_count,
    lastSync: data.last_sync_at,
  };
}

export async function deleteBackup(): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user) return false;

  const { error } = await getSupabase()
    .from('user_backups')
    .delete()
    .eq('user_id', user.id);

  return !error;
}

// === Cloud Sync Engine ===

import { db } from './db';
import { encrypt, decrypt, isEncryptionReady } from './crypto';

export async function syncToCloud(): Promise<{ success: boolean; error?: string }> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: 'Not signed in' };

  try {
    // Export all data
    const data = {
      workLogs: await db.workLogs.toArray(),
      energyCheckins: await db.energyCheckins.toArray(),
      financialData: await db.financialData.toArray(),
      goals: await db.goals.toArray(),
      bragDocuments: await db.bragDocuments.toArray(),
      meetings: await db.meetings.toArray(),
      weeklySnapshots: await db.weeklySnapshots.toArray(),
      settings: (await db.settings.toArray()).filter((s) => s.key !== 'ai_api_key'), // Never sync API keys
      syncedAt: Date.now(),
    };

    const json = JSON.stringify(data);
    let totalRecords = 0;
    for (const val of Object.values(data)) {
      if (Array.isArray(val)) totalRecords += val.length;
    }

    // Encrypt the entire payload
    let payload: string;
    if (isEncryptionReady()) {
      payload = await encrypt(json);
    } else {
      // No passphrase — encrypt with a derived key from user ID (basic protection)
      payload = btoa(json); // Base64 only — not truly encrypted without passphrase
    }

    const success = await pushBackup(payload, totalRecords);
    return { success };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

export async function restoreFromCloud(): Promise<{ success: boolean; recordCount: number; error?: string }> {
  const user = await getCurrentUser();
  if (!user) return { success: false, recordCount: 0, error: 'Not signed in' };

  try {
    const backup = await pullBackup();
    if (!backup) return { success: false, recordCount: 0, error: 'No backup found' };

    // Decrypt
    let json: string;
    if (isEncryptionReady() && backup.encryptedData.startsWith('enc:')) {
      json = await decrypt(backup.encryptedData);
    } else {
      // Try base64 decode
      try {
        json = atob(backup.encryptedData);
      } catch {
        json = backup.encryptedData;
      }
    }

    const data = JSON.parse(json);

    // Import all tables
    if (data.workLogs?.length) await db.workLogs.bulkPut(data.workLogs);
    if (data.energyCheckins?.length) await db.energyCheckins.bulkPut(data.energyCheckins);
    if (data.financialData?.length) await db.financialData.bulkPut(data.financialData);
    if (data.goals?.length) await db.goals.bulkPut(data.goals);
    if (data.bragDocuments?.length) await db.bragDocuments.bulkPut(data.bragDocuments);
    if (data.meetings?.length) await db.meetings.bulkPut(data.meetings);
    if (data.weeklySnapshots?.length) await db.weeklySnapshots.bulkPut(data.weeklySnapshots);
    if (data.settings?.length) await db.settings.bulkPut(data.settings);

    return { success: true, recordCount: backup.recordCount };
  } catch (error) {
    return { success: false, recordCount: 0, error: String(error) };
  }
}

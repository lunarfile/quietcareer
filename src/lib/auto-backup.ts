/**
 * Automatic backup system.
 * - Writes backup to localStorage as a safety net (IndexedDB can be cleared independently)
 * - Keeps last backup with record counts for integrity checking
 * - On startup, detects data loss and offers restore
 *
 * For Capacitor: would use @capacitor/filesystem for file-level backup.
 * For web: uses localStorage (limited to ~5MB but covers most users).
 */

import { db } from './db';

const BACKUP_KEY = 'qc_auto_backup';
const COUNTS_KEY = 'qc_record_counts';
const LAST_BACKUP_TIME_KEY = 'qc_last_auto_backup';
const MIN_BACKUP_INTERVAL = 5 * 60 * 1000; // 5 minutes debounce

interface RecordCounts {
  workLogs: number;
  energyCheckins: number;
  goals: number;
  bragDocuments: number;
  meetings: number;
  financialData: number;
  timestamp: number;
}

// === Record Counts (for integrity detection) ===

async function getCurrentCounts(): Promise<RecordCounts> {
  return {
    workLogs: await db.workLogs.count(),
    energyCheckins: await db.energyCheckins.count(),
    goals: await db.goals.count(),
    bragDocuments: await db.bragDocuments.count(),
    meetings: await db.meetings.count(),
    financialData: await db.financialData.count(),
    timestamp: Date.now(),
  };
}

function getStoredCounts(): RecordCounts | null {
  try {
    const raw = localStorage.getItem(COUNTS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveCounts(counts: RecordCounts): void {
  localStorage.setItem(COUNTS_KEY, JSON.stringify(counts));
}

// === Auto Backup ===

export async function performAutoBackup(): Promise<void> {
  // Debounce — don't backup more than once per 5 minutes
  const lastBackup = localStorage.getItem(LAST_BACKUP_TIME_KEY);
  if (lastBackup && Date.now() - parseInt(lastBackup) < MIN_BACKUP_INTERVAL) return;

  try {
    const data = {
      workLogs: await db.workLogs.toArray(),
      energyCheckins: await db.energyCheckins.toArray(),
      financialData: await db.financialData.toArray(),
      goals: await db.goals.toArray(),
      bragDocuments: await db.bragDocuments.toArray(),
      meetings: await db.meetings.toArray(),
      weeklySnapshots: await db.weeklySnapshots.toArray(),
      settings: await db.settings.toArray(),
      backupAt: Date.now(),
    };

    const json = JSON.stringify(data);

    // Only backup if data is small enough for localStorage (~5MB limit)
    if (json.length < 4 * 1024 * 1024) {
      localStorage.setItem(BACKUP_KEY, json);
    }

    // Save record counts for integrity checking
    const counts = await getCurrentCounts();
    saveCounts(counts);

    localStorage.setItem(LAST_BACKUP_TIME_KEY, Date.now().toString());
  } catch (error) {
    console.error('Auto-backup failed:', error);
  }
}

// === Integrity Check ===

export interface IntegrityResult {
  status: 'ok' | 'data-loss-detected' | 'no-baseline';
  lostTables: string[];
  backupAvailable: boolean;
  backupAge: number | null; // milliseconds
}

export async function checkIntegrity(): Promise<IntegrityResult> {
  const storedCounts = getStoredCounts();

  if (!storedCounts) {
    return { status: 'no-baseline', lostTables: [], backupAvailable: false, backupAge: null };
  }

  const currentCounts = await getCurrentCounts();
  const lostTables: string[] = [];

  // Check each table — if stored count was > 0 but current is 0, data was lost
  if (storedCounts.workLogs > 0 && currentCounts.workLogs === 0) lostTables.push('workLogs');
  if (storedCounts.energyCheckins > 0 && currentCounts.energyCheckins === 0) lostTables.push('energyCheckins');
  if (storedCounts.goals > 0 && currentCounts.goals === 0) lostTables.push('goals');
  if (storedCounts.bragDocuments > 0 && currentCounts.bragDocuments === 0) lostTables.push('bragDocuments');
  if (storedCounts.meetings > 0 && currentCounts.meetings === 0) lostTables.push('meetings');
  if (storedCounts.financialData > 0 && currentCounts.financialData === 0) lostTables.push('financialData');

  const backupRaw = localStorage.getItem(BACKUP_KEY);
  const backupAvailable = !!backupRaw;
  const backupAge = backupRaw ? Date.now() - (JSON.parse(backupRaw)?.backupAt ?? 0) : null;

  if (lostTables.length > 0) {
    return { status: 'data-loss-detected', lostTables, backupAvailable, backupAge };
  }

  return { status: 'ok', lostTables: [], backupAvailable, backupAge };
}

// === Auto Restore ===

export async function restoreFromBackup(): Promise<{ restored: number } | null> {
  const raw = localStorage.getItem(BACKUP_KEY);
  if (!raw) return null;

  try {
    const data = JSON.parse(raw);
    let restored = 0;

    if (data.workLogs?.length) { await db.workLogs.bulkPut(data.workLogs); restored += data.workLogs.length; }
    if (data.energyCheckins?.length) { await db.energyCheckins.bulkPut(data.energyCheckins); restored += data.energyCheckins.length; }
    if (data.financialData?.length) { await db.financialData.bulkPut(data.financialData); restored += data.financialData.length; }
    if (data.goals?.length) { await db.goals.bulkPut(data.goals); restored += data.goals.length; }
    if (data.bragDocuments?.length) { await db.bragDocuments.bulkPut(data.bragDocuments); restored += data.bragDocuments.length; }
    if (data.meetings?.length) { await db.meetings.bulkPut(data.meetings); restored += data.meetings.length; }
    if (data.weeklySnapshots?.length) { await db.weeklySnapshots.bulkPut(data.weeklySnapshots); restored += data.weeklySnapshots.length; }
    if (data.settings?.length) { await db.settings.bulkPut(data.settings); restored += data.settings.length; }

    // Update counts after restore
    const counts = await getCurrentCounts();
    saveCounts(counts);

    return { restored };
  } catch (error) {
    console.error('Restore failed:', error);
    return null;
  }
}

// === Trigger backup after data changes ===

let backupTimer: ReturnType<typeof setTimeout> | null = null;

export function scheduleBackup(): void {
  if (backupTimer) clearTimeout(backupTimer);
  backupTimer = setTimeout(() => {
    performAutoBackup();
    backupTimer = null;
  }, 10000); // 10 second debounce after last write
}

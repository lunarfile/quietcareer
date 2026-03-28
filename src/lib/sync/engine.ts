/**
 * Sync engine — merges local and remote data using last-write-wins per record.
 * Each record has a unique id and updatedAt/createdAt timestamp.
 */

import { db } from '@/lib/db';
import type { SyncData, SyncAdapter } from './types';

const SYNC_VERSION = 1;

function getDeviceId(): string {
  let id = localStorage.getItem('qc_device_id');
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem('qc_device_id', id);
  }
  return id;
}

export async function exportLocalData(): Promise<SyncData> {
  return {
    version: SYNC_VERSION,
    syncedAt: Date.now(),
    deviceId: getDeviceId(),
    data: {
      workLogs: await db.workLogs.toArray(),
      energyCheckins: await db.energyCheckins.toArray(),
      financialData: await db.financialData.toArray(),
      goals: await db.goals.toArray(),
      bragDocuments: await db.bragDocuments.toArray(),
      meetings: await db.meetings.toArray(),
      weeklySnapshots: await db.weeklySnapshots.toArray(),
      settings: await db.settings.toArray(),
    },
  };
}

/**
 * Merge remote data into local IndexedDB.
 * Strategy: for each record, keep the one with the newer updatedAt/createdAt.
 */
export async function mergeRemoteData(remote: SyncData): Promise<{
  imported: number;
  skipped: number;
}> {
  let imported = 0;
  let skipped = 0;

  const tables = [
    { name: 'workLogs', table: db.workLogs, key: 'id', timeField: 'updatedAt' },
    { name: 'energyCheckins', table: db.energyCheckins, key: 'id', timeField: 'createdAt' },
    { name: 'financialData', table: db.financialData, key: 'id', timeField: 'updatedAt' },
    { name: 'goals', table: db.goals, key: 'id', timeField: 'updatedAt' },
    { name: 'bragDocuments', table: db.bragDocuments, key: 'id', timeField: 'updatedAt' },
    { name: 'meetings', table: db.meetings, key: 'id', timeField: 'updatedAt' },
    { name: 'weeklySnapshots', table: db.weeklySnapshots, key: 'id', timeField: 'createdAt' },
    { name: 'settings', table: db.settings, key: 'key', timeField: 'updatedAt' },
  ] as const;

  for (const { name, table, key, timeField } of tables) {
    const remoteRecords = (remote.data as Record<string, unknown[]>)[name] ?? [];

    for (const record of remoteRecords) {
      const rec = record as Record<string, unknown>;
      const keyValue = rec[key] as string;
      const remoteTime = (rec[timeField] as number) ?? 0;

      const local = await (table as { get: (k: string) => Promise<Record<string, unknown> | undefined> }).get(keyValue);

      if (!local) {
        // New record from remote — import it
        await (table as { put: (r: unknown) => Promise<unknown> }).put(record);
        imported++;
      } else {
        const localTime = (local[timeField] as number) ?? 0;
        if (remoteTime > localTime) {
          // Remote is newer — update local
          await (table as { put: (r: unknown) => Promise<unknown> }).put(record);
          imported++;
        } else {
          skipped++;
        }
      }
    }
  }

  return { imported, skipped };
}

/**
 * Full sync cycle: pull remote, merge, push local.
 */
export async function performSync(adapter: SyncAdapter): Promise<{
  imported: number;
  skipped: number;
  pushed: boolean;
}> {
  // Pull
  const remote = await adapter.read();

  let imported = 0;
  let skipped = 0;

  if (remote) {
    const result = await mergeRemoteData(remote);
    imported = result.imported;
    skipped = result.skipped;
  }

  // Push (always push local state after merge)
  const localData = await exportLocalData();
  await adapter.write(localData);

  return { imported, skipped, pushed: true };
}

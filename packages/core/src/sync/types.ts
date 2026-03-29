/**
 * Sync system types.
 * Supports Google Drive, Dropbox, OneDrive, and custom folder sync.
 */

export type SyncProvider = 'none' | 'google-drive' | 'dropbox' | 'onedrive' | 'manual';

export interface SyncState {
  provider: SyncProvider;
  lastSyncAt: number | null;
  lastSyncStatus: 'success' | 'error' | 'syncing' | null;
  error: string | null;
}

export interface SyncData {
  version: number;
  syncedAt: number;
  deviceId: string;
  data: {
    workLogs: unknown[];
    energyCheckins: unknown[];
    financialData: unknown[];
    goals: unknown[];
    bragDocuments: unknown[];
    meetings: unknown[];
    weeklySnapshots: unknown[];
    settings: unknown[];
  };
}

export interface SyncAdapter {
  name: string;
  /** Check if the adapter is authenticated and ready */
  isReady(): Promise<boolean>;
  /** Start the OAuth flow or connection process */
  connect(): Promise<void>;
  /** Disconnect / revoke access */
  disconnect(): Promise<void>;
  /** Read the sync file from remote */
  read(): Promise<SyncData | null>;
  /** Write the sync file to remote */
  write(data: SyncData): Promise<void>;
}

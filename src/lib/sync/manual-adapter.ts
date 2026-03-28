/**
 * Manual sync adapter — export/import JSON files.
 * Works with any cloud storage: iCloud, Google Drive, Dropbox, NAS.
 * User manually saves the file to their synced folder.
 */

import type { SyncAdapter, SyncData } from './types';
import { exportLocalData } from './engine';

export class ManualSyncAdapter implements SyncAdapter {
  name = 'Manual (File Export/Import)';

  async isReady(): Promise<boolean> {
    return true; // Always ready
  }

  async connect(): Promise<void> {
    // No connection needed
  }

  async disconnect(): Promise<void> {
    // No-op
  }

  async read(): Promise<SyncData | null> {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json,.quietcareer';
      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) {
          resolve(null);
          return;
        }
        try {
          const text = await file.text();
          const data = JSON.parse(text) as SyncData;
          resolve(data);
        } catch {
          resolve(null);
        }
      };
      input.oncancel = () => resolve(null);
      input.click();
    });
  }

  async write(data: SyncData): Promise<void> {
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `quietcareer-sync-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
}

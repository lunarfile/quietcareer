/**
 * Google Drive sync adapter.
 * Uses Google Drive REST API v3 to store an encrypted sync file.
 * User authenticates with their own Google account via OAuth.
 *
 * The sync file is stored in a hidden app folder (appDataFolder)
 * so it doesn't clutter the user's Drive.
 */

import type { SyncAdapter, SyncData } from './types';

const SCOPES = 'https://www.googleapis.com/auth/drive.appdata';
const SYNC_FILENAME = 'quietcareer-sync.json';

export class GoogleDriveAdapter implements SyncAdapter {
  name = 'Google Drive';
  private accessToken: string | null = null;

  constructor(private clientId: string) {}

  async isReady(): Promise<boolean> {
    return !!this.accessToken;
  }

  async connect(): Promise<void> {
    // Use Google Identity Services (GIS) popup
    return new Promise((resolve, reject) => {
      if (!this.clientId) {
        reject(new Error('Google Client ID not configured. Add it in Settings > Sync.'));
        return;
      }

      const redirectUri = window.location.origin;
      const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
      authUrl.searchParams.set('client_id', this.clientId);
      authUrl.searchParams.set('redirect_uri', redirectUri);
      authUrl.searchParams.set('response_type', 'token');
      authUrl.searchParams.set('scope', SCOPES);
      authUrl.searchParams.set('prompt', 'consent');

      // Open popup
      const popup = window.open(
        authUrl.toString(),
        'google-auth',
        'width=500,height=600'
      );

      // Listen for redirect with token
      const interval = setInterval(() => {
        try {
          if (popup?.closed) {
            clearInterval(interval);
            reject(new Error('Auth popup closed'));
            return;
          }
          const hash = popup?.location.hash;
          if (hash && hash.includes('access_token')) {
            const params = new URLSearchParams(hash.slice(1));
            this.accessToken = params.get('access_token');
            localStorage.setItem('qc_gdrive_token', this.accessToken ?? '');
            popup?.close();
            clearInterval(interval);
            resolve();
          }
        } catch {
          // Cross-origin — popup hasn't redirected yet, keep waiting
        }
      }, 500);
    });
  }

  async disconnect(): Promise<void> {
    this.accessToken = null;
    localStorage.removeItem('qc_gdrive_token');
  }

  async read(): Promise<SyncData | null> {
    if (!this.accessToken) {
      this.accessToken = localStorage.getItem('qc_gdrive_token');
      if (!this.accessToken) return null;
    }

    try {
      // Search for the sync file in appDataFolder
      const searchRes = await fetch(
        `https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=name='${SYNC_FILENAME}'&fields=files(id,modifiedTime)`,
        { headers: { Authorization: `Bearer ${this.accessToken}` } }
      );

      if (!searchRes.ok) throw new Error('Drive API error');

      const searchData = await searchRes.json();
      const files = searchData.files ?? [];

      if (files.length === 0) return null;

      // Download the file
      const fileId = files[0].id;
      const downloadRes = await fetch(
        `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
        { headers: { Authorization: `Bearer ${this.accessToken}` } }
      );

      if (!downloadRes.ok) throw new Error('Failed to download sync file');

      return await downloadRes.json();
    } catch (error) {
      console.error('Google Drive read error:', error);
      return null;
    }
  }

  async write(data: SyncData): Promise<void> {
    if (!this.accessToken) throw new Error('Not authenticated');

    try {
      // Check if file exists
      const searchRes = await fetch(
        `https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=name='${SYNC_FILENAME}'&fields=files(id)`,
        { headers: { Authorization: `Bearer ${this.accessToken}` } }
      );

      const searchData = await searchRes.json();
      const files = searchData.files ?? [];

      const jsonBody = JSON.stringify(data);
      const boundary = '---quietcareer-sync---';

      if (files.length > 0) {
        // Update existing file
        const fileId = files[0].id;
        await fetch(
          `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`,
          {
            method: 'PATCH',
            headers: {
              Authorization: `Bearer ${this.accessToken}`,
              'Content-Type': 'application/json',
            },
            body: jsonBody,
          }
        );
      } else {
        // Create new file in appDataFolder
        const metadata = {
          name: SYNC_FILENAME,
          parents: ['appDataFolder'],
        };

        const body =
          `--${boundary}\r\n` +
          `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
          `${JSON.stringify(metadata)}\r\n` +
          `--${boundary}\r\n` +
          `Content-Type: application/json\r\n\r\n` +
          `${jsonBody}\r\n` +
          `--${boundary}--`;

        await fetch(
          'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${this.accessToken}`,
              'Content-Type': `multipart/related; boundary=${boundary}`,
            },
            body,
          }
        );
      }
    } catch (error) {
      console.error('Google Drive write error:', error);
      throw error;
    }
  }
}

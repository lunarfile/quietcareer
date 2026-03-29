/**
 * Client-side encryption using Web Crypto API.
 * AES-256-GCM with PBKDF2 key derivation.
 *
 * SECURITY FIXES:
 * - Salt stored in IndexedDB (primary) + localStorage (fallback) — survives independent clears
 * - Verification canary to detect wrong passphrase
 * - No silent plaintext fallback
 */

import { db } from './db';

const PBKDF2_ITERATIONS = 600_000;
const SALT_LENGTH = 16;
const IV_LENGTH = 12;
const CANARY_PLAINTEXT = 'quietcareer-verify-v1';
const ENC_PREFIX = 'enc:'; // Prefix for encrypted values — no more heuristic detection

let cachedKey: CryptoKey | null = null;

function getEncoder() {
  return new TextEncoder();
}

function getDecoder() {
  return new TextDecoder();
}

export async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    getEncoder().encode(passphrase) as BufferSource,
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as BufferSource,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

// === Salt Storage (redundant: IndexedDB + localStorage) ===

async function getSalt(): Promise<Uint8Array | null> {
  // Try IndexedDB first (primary)
  try {
    const setting = await db.settings.get('encryption_salt');
    if (setting?.value) {
      return new Uint8Array(JSON.parse(setting.value));
    }
  } catch {
    // IndexedDB might not be ready yet
  }

  // Fallback to localStorage
  const stored = localStorage.getItem('qc_salt');
  if (stored) {
    const salt = new Uint8Array(JSON.parse(stored));
    // Migrate to IndexedDB for safety
    try {
      await db.settings.put({
        key: 'encryption_salt',
        value: stored,
        encrypted: false,
        updatedAt: Date.now(),
      });
    } catch {
      // Best effort migration
    }
    return salt;
  }

  return null;
}

async function saveSalt(salt: Uint8Array): Promise<void> {
  const serialized = JSON.stringify(Array.from(salt));

  // Store in BOTH locations for redundancy
  localStorage.setItem('qc_salt', serialized);

  try {
    await db.settings.put({
      key: 'encryption_salt',
      value: serialized,
      encrypted: false,
      updatedAt: Date.now(),
    });
  } catch {
    // IndexedDB might not be ready — localStorage is the fallback
  }
}

// === Canary (verifies correct passphrase) ===

async function saveCanary(): Promise<void> {
  if (!cachedKey) return;
  const encrypted = await encrypt(CANARY_PLAINTEXT);
  try {
    await db.settings.put({
      key: 'encryption_canary',
      value: encrypted,
      encrypted: false,
      updatedAt: Date.now(),
    });
  } catch {
    // Best effort
  }
}

async function verifyCanary(): Promise<boolean> {
  try {
    const setting = await db.settings.get('encryption_canary');
    if (!setting?.value) return true; // No canary yet — first time, skip verification
    const decrypted = await decrypt(setting.value);
    return decrypted === CANARY_PLAINTEXT;
  } catch {
    return false; // Decryption failed — wrong passphrase
  }
}

// === Public API ===

export async function initializeEncryption(passphrase: string): Promise<void> {
  let salt = await getSalt();

  if (!salt) {
    salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
    await saveSalt(salt);
  }

  cachedKey = await deriveKey(passphrase, salt);

  // Verify passphrase is correct
  const isValid = await verifyCanary();
  if (!isValid) {
    cachedKey = null;
    throw new Error('Wrong passphrase. Your encrypted data cannot be unlocked with this passphrase.');
  }

  // Save canary if first time
  const existingCanary = await db.settings.get('encryption_canary').catch(() => null);
  if (!existingCanary?.value) {
    await saveCanary();
  }
}

export async function encrypt(plaintext: string): Promise<string> {
  if (!cachedKey) throw new Error('Encryption not initialized.');

  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const encoded = getEncoder().encode(plaintext);

  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv as BufferSource },
    cachedKey,
    encoded as BufferSource
  );

  const packed = new Uint8Array(iv.length + ciphertext.byteLength);
  packed.set(iv, 0);
  packed.set(new Uint8Array(ciphertext), iv.length);

  // Prefix with enc: for deterministic detection
  return ENC_PREFIX + btoa(String.fromCharCode(...packed));
}

export async function decrypt(packed: string): Promise<string> {
  if (!cachedKey) throw new Error('Encryption not initialized.');

  // Strip enc: prefix if present
  const data = packed.startsWith(ENC_PREFIX) ? packed.slice(ENC_PREFIX.length) : packed;

  const raw = Uint8Array.from(atob(data), (c) => c.charCodeAt(0));
  const iv = raw.slice(0, IV_LENGTH);
  const ciphertext = raw.slice(IV_LENGTH);

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: iv as BufferSource },
    cachedKey,
    ciphertext as BufferSource
  );

  return getDecoder().decode(decrypted);
}

export function isEncryptionReady(): boolean {
  return cachedKey !== null;
}

export function lockEncryption(): void {
  cachedKey = null;
}

// === Persistent Storage Request ===

export async function requestPersistentStorage(): Promise<boolean> {
  if (typeof navigator === 'undefined') return false;
  if (!navigator.storage?.persist) return false;
  try {
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}

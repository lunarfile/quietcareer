/**
 * Client-side encryption using Web Crypto API.
 * AES-256-GCM with PBKDF2 key derivation.
 * All sensitive data is encrypted before storing in IndexedDB.
 */

const PBKDF2_ITERATIONS = 600_000;
const SALT_LENGTH = 16;
const IV_LENGTH = 12;

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

export async function initializeEncryption(passphrase: string): Promise<void> {
  // Check for existing salt or create new one
  const storedSalt = localStorage.getItem('qc_salt');
  let salt: Uint8Array;

  if (storedSalt) {
    salt = new Uint8Array(JSON.parse(storedSalt));
  } else {
    salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
    localStorage.setItem('qc_salt', JSON.stringify(Array.from(salt)));
  }

  cachedKey = await deriveKey(passphrase, salt);
}

export async function encrypt(plaintext: string): Promise<string> {
  if (!cachedKey) throw new Error('Encryption not initialized. Call initializeEncryption first.');

  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const encoded = getEncoder().encode(plaintext);

  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv as BufferSource },
    cachedKey,
    encoded as BufferSource
  );

  // Pack iv + ciphertext as base64
  const packed = new Uint8Array(iv.length + ciphertext.byteLength);
  packed.set(iv, 0);
  packed.set(new Uint8Array(ciphertext), iv.length);

  return btoa(String.fromCharCode(...packed));
}

export async function decrypt(packed: string): Promise<string> {
  if (!cachedKey) throw new Error('Encryption not initialized. Call initializeEncryption first.');

  const raw = Uint8Array.from(atob(packed), (c) => c.charCodeAt(0));
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

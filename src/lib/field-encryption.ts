/**
 * Field-level encryption for sensitive data before storing in IndexedDB.
 * Only encrypts when passphrase protection is enabled.
 *
 * SECURITY FIXES:
 * - NO silent plaintext fallback — errors propagate
 * - Uses enc: prefix for deterministic encrypted field detection
 * - Graceful handling of mixed encrypted/plaintext data
 */

import { encrypt, decrypt, isEncryptionReady } from './crypto';

const ENC_PREFIX = 'enc:';

/**
 * Encrypt a string field. Throws on failure (no silent plaintext fallback).
 */
export async function encryptField(value: string | null): Promise<string | null> {
  if (!value || !isEncryptionReady()) return value;
  return await encrypt(value); // encrypt() now adds enc: prefix automatically
}

/**
 * Decrypt a string field. Only attempts decryption on enc: prefixed values.
 */
export async function decryptField(value: string | null): Promise<string | null> {
  if (!value || !isEncryptionReady()) return value;

  // Only decrypt values that are actually encrypted (have enc: prefix)
  if (!value.startsWith(ENC_PREFIX)) return value; // Plaintext — return as-is

  try {
    return await decrypt(value);
  } catch {
    // Decryption failed — might be wrong key or corrupted data
    // Return the raw value rather than crash the UI
    console.error('Failed to decrypt field. Data may be corrupted or key is wrong.');
    return '[Encrypted — wrong passphrase?]';
  }
}

/**
 * Encrypt sensitive fields in a work log before saving.
 */
export async function encryptWorkLog<T extends { content: string; aiRewrite: string | null }>(
  log: T
): Promise<T> {
  if (!isEncryptionReady()) return log;
  return {
    ...log,
    content: (await encryptField(log.content)) ?? log.content,
    aiRewrite: await encryptField(log.aiRewrite),
  };
}

/**
 * Decrypt sensitive fields in a work log after reading.
 */
export async function decryptWorkLog<T extends { content: string; aiRewrite: string | null }>(
  log: T
): Promise<T> {
  if (!isEncryptionReady()) return log;
  return {
    ...log,
    content: (await decryptField(log.content)) ?? log.content,
    aiRewrite: await decryptField(log.aiRewrite),
  };
}

/**
 * Batch decrypt work logs.
 */
export async function decryptWorkLogs<T extends { content: string; aiRewrite: string | null }>(
  logs: T[]
): Promise<T[]> {
  if (!isEncryptionReady()) return logs;
  return Promise.all(logs.map(decryptWorkLog));
}

/**
 * Encrypt sensitive fields in an energy check-in.
 */
export async function encryptCheckin<T extends { notes: string }>(
  checkin: T
): Promise<T> {
  if (!isEncryptionReady()) return checkin;
  return {
    ...checkin,
    notes: (await encryptField(checkin.notes)) ?? checkin.notes,
  };
}

/**
 * Encrypt sensitive fields in a goal.
 */
export async function encryptGoal<T extends { title: string; notes: string }>(
  goal: T
): Promise<T> {
  if (!isEncryptionReady()) return goal;
  return {
    ...goal,
    title: (await encryptField(goal.title)) ?? goal.title,
    notes: (await encryptField(goal.notes)) ?? goal.notes,
  };
}

/**
 * Encrypt sensitive fields in a brag document.
 */
export async function encryptBragDoc<T extends { generatedContent: string; editedContent: string }>(
  doc: T
): Promise<T> {
  if (!isEncryptionReady()) return doc;
  return {
    ...doc,
    generatedContent: (await encryptField(doc.generatedContent)) ?? doc.generatedContent,
    editedContent: (await encryptField(doc.editedContent)) ?? doc.editedContent,
  };
}

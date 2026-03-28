/**
 * Field-level encryption for sensitive data before storing in IndexedDB.
 * Only encrypts when passphrase protection is enabled.
 * Sensitive fields: content, aiRewrite, notes, financial amounts, titles.
 */

import { encrypt, decrypt, isEncryptionReady } from './crypto';

/**
 * Encrypt a string field if encryption is active.
 */
export async function encryptField(value: string | null): Promise<string | null> {
  if (!value || !isEncryptionReady()) return value;
  try {
    return await encrypt(value);
  } catch {
    return value; // Fallback: store unencrypted if encryption fails
  }
}

/**
 * Decrypt a string field if it looks encrypted (base64).
 */
export async function decryptField(value: string | null): Promise<string | null> {
  if (!value || !isEncryptionReady()) return value;
  try {
    // Check if the value looks like it might be encrypted (base64)
    if (/^[A-Za-z0-9+/]+=*$/.test(value) && value.length > 20) {
      return await decrypt(value);
    }
    return value; // Not encrypted, return as-is
  } catch {
    return value; // Decryption failed, return raw (might be unencrypted)
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

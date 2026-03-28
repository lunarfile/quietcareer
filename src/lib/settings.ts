import { db } from './db';
import { encrypt, decrypt, isEncryptionReady } from './crypto';

export async function getSetting(key: string): Promise<string | null> {
  const setting = await db.settings.get(key);
  if (!setting) return null;

  if (setting.encrypted && isEncryptionReady()) {
    return decrypt(setting.value);
  }
  return setting.value;
}

export async function setSetting(
  key: string,
  value: string,
  encrypted: boolean = false
): Promise<void> {
  const storedValue = encrypted && isEncryptionReady() ? await encrypt(value) : value;

  await db.settings.put({
    key,
    value: storedValue,
    encrypted,
    updatedAt: Date.now(),
  });
}

export async function deleteSetting(key: string): Promise<void> {
  await db.settings.delete(key);
}

// Convenience helpers for common settings
export async function getAIProvider(): Promise<string> {
  return (await getSetting('ai_provider')) ?? 'openrouter';
}

export async function getAIApiKey(): Promise<string | null> {
  return getSetting('ai_api_key');
}

export async function getAIModel(): Promise<string | null> {
  return getSetting('ai_model');
}

export async function getUserRole(): Promise<string | null> {
  return getSetting('user_role');
}

export async function isOnboardingComplete(): Promise<boolean> {
  const val = await getSetting('onboarding_complete');
  return val === 'true';
}

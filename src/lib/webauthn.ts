/**
 * WebAuthn biometric authentication for local session lock.
 * Uses platform authenticators (Windows Hello, Touch ID, Face ID, fingerprint).
 * No server needed — credential is stored locally.
 */

const CREDENTIAL_KEY = 'qc_webauthn_credential';

export function isBiometricAvailable(): boolean {
  return typeof window !== 'undefined' &&
    !!window.PublicKeyCredential &&
    typeof window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function';
}

export async function isBiometricSupported(): Promise<boolean> {
  if (!isBiometricAvailable()) return false;
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

export function hasBiometricCredential(): boolean {
  return !!localStorage.getItem(CREDENTIAL_KEY);
}

/**
 * Register a new biometric credential (one-time setup).
 */
export async function registerBiometric(): Promise<boolean> {
  try {
    const userId = new Uint8Array(16);
    crypto.getRandomValues(userId);

    const challenge = new Uint8Array(32);
    crypto.getRandomValues(challenge);

    const credential = await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: {
          name: 'QuietCareer',
          id: window.location.hostname,
        },
        user: {
          id: userId,
          name: 'quietcareer-user',
          displayName: 'QuietCareer User',
        },
        pubKeyCredParams: [
          { alg: -7, type: 'public-key' },   // ES256
          { alg: -257, type: 'public-key' },  // RS256
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform', // Only device biometrics, no USB keys
          userVerification: 'required',
          residentKey: 'preferred',
        },
        timeout: 60000,
      },
    }) as PublicKeyCredential | null;

    if (!credential) return false;

    // Store credential ID for future authentication
    const credentialId = btoa(String.fromCharCode(...new Uint8Array(credential.rawId)));
    localStorage.setItem(CREDENTIAL_KEY, credentialId);

    return true;
  } catch (error) {
    console.error('Biometric registration failed:', error);
    return false;
  }
}

/**
 * Authenticate with biometrics (verify on each session).
 */
export async function authenticateBiometric(): Promise<boolean> {
  const storedCredentialId = localStorage.getItem(CREDENTIAL_KEY);
  if (!storedCredentialId) return false;

  try {
    const credentialIdBuffer = Uint8Array.from(atob(storedCredentialId), (c) => c.charCodeAt(0));

    const challenge = new Uint8Array(32);
    crypto.getRandomValues(challenge);

    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge,
        allowCredentials: [
          {
            id: credentialIdBuffer,
            type: 'public-key',
            transports: ['internal'],
          },
        ],
        userVerification: 'required',
        timeout: 60000,
      },
    });

    return !!assertion;
  } catch (error) {
    console.error('Biometric authentication failed:', error);
    return false;
  }
}

/**
 * Remove biometric credential.
 */
export function removeBiometric(): void {
  localStorage.removeItem(CREDENTIAL_KEY);
}

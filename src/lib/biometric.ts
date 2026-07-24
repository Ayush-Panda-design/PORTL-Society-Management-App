import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import { hasNativeModule } from '@/lib/native-module';

const ENABLED_KEY = 'portl_biometric_enabled';
const EMAIL_KEY = 'portl_biometric_email';

type LocalAuthModule = typeof import('expo-local-authentication');

let localAuthModule: LocalAuthModule | null | undefined;

/**
 * Lazy-load native biometrics. Returns null when the module is not linked yet
 * (e.g. old dev client before rebuild) so the app can still boot.
 */
async function loadLocalAuth(): Promise<LocalAuthModule | null> {
  if (localAuthModule !== undefined) return localAuthModule;
  if (Platform.OS === 'web') {
    localAuthModule = null;
    return null;
  }

  if (!hasNativeModule('ExpoLocalAuthentication')) {
    console.info(
      '[biometric] ExpoLocalAuthentication not in this build — run npx expo run:android',
    );
    localAuthModule = null;
    return null;
  }

  try {
    localAuthModule = await import('expo-local-authentication');
    return localAuthModule;
  } catch (e) {
    console.info('[biometric] expo-local-authentication unavailable — rebuild the native app:', e);
    localAuthModule = null;
    return null;
  }
}

export async function isBiometricHardwareAvailable(): Promise<boolean> {
  const LocalAuthentication = await loadLocalAuth();
  if (!LocalAuthentication) return false;
  try {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    if (!hasHardware) return false;
    return LocalAuthentication.isEnrolledAsync();
  } catch {
    return false;
  }
}

export async function biometricLabel(): Promise<string> {
  const LocalAuthentication = await loadLocalAuth();
  if (!LocalAuthentication) return 'Biometrics';
  try {
    const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
    const hasFingerprint = types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT);
    const hasFace = types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION);
    const hasIris = types.includes(LocalAuthentication.AuthenticationType.IRIS);

    // Prefer fingerprint when both are reported. Android often lists face as
    // supported even when BiometricPrompt actually uses the fingerprint sensor.
    if (hasFingerprint) {
      return Platform.OS === 'ios' ? 'Touch ID' : 'Fingerprint';
    }
    if (hasFace) {
      return Platform.OS === 'ios' ? 'Face ID' : 'Face unlock';
    }
    if (hasIris) {
      return 'Iris unlock';
    }
  } catch {
    // fall through
  }
  return 'Biometrics';
}

export async function isBiometricEnabled(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  try {
    const value = await SecureStore.getItemAsync(ENABLED_KEY);
    return value === '1';
  } catch {
    return false;
  }
}

export async function getBiometricEmail(): Promise<string | null> {
  if (Platform.OS === 'web') return null;
  try {
    return await SecureStore.getItemAsync(EMAIL_KEY);
  } catch {
    return null;
  }
}

export async function enableBiometricLogin(email: string): Promise<void> {
  const LocalAuthentication = await loadLocalAuth();
  if (!LocalAuthentication) {
    throw new Error('Biometrics need a rebuilt app. Run: npx expo run:android');
  }
  const label = await biometricLabel();
  const ok = await LocalAuthentication.authenticateAsync({
    promptMessage: `Enable ${label} unlock for Portl`,
    cancelLabel: 'Cancel',
    disableDeviceFallback: false,
  });
  if (!ok.success) {
    throw new Error(ok.error === 'user_cancel' ? 'Cancelled' : `${label} authentication failed`);
  }
  await SecureStore.setItemAsync(ENABLED_KEY, '1');
  await SecureStore.setItemAsync(EMAIL_KEY, email.trim().toLowerCase());
}

export async function disableBiometricLogin(): Promise<void> {
  if (Platform.OS === 'web') return;
  await SecureStore.deleteItemAsync(ENABLED_KEY);
  await SecureStore.deleteItemAsync(EMAIL_KEY);
}

/** Unlock an existing SecureStore session with biometrics (no password re-entry). */
export async function authenticateWithBiometrics(
  promptMessage?: string,
): Promise<boolean> {
  const LocalAuthentication = await loadLocalAuth();
  if (!LocalAuthentication) return false;
  const enabled = await isBiometricEnabled();
  if (!enabled) return false;
  try {
    const label = await biometricLabel();
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: promptMessage ?? `Unlock with ${label}`,
      cancelLabel: 'Cancel',
      disableDeviceFallback: false,
    });
    return result.success;
  } catch {
    return false;
  }
}

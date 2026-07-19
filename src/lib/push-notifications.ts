import Constants from 'expo-constants';
import { isRunningInExpoGo } from 'expo';
import * as Device from 'expo-device';
import { AppState, InteractionManager, Linking, Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import Toast from 'react-native-toast-message';

import { supabase } from '@/lib/supabase';

const DENIED_EXPLAINED_KEY = 'portl_push_denied_explained';
const ANDROID_CHANNEL_ID = 'default';

/** Prevents double registration from getSession + INITIAL_SESSION racing. */
const inFlightByUser = new Map<string, Promise<string | null>>();

type NotificationsModule = typeof import('expo-notifications');

let notificationsModule: NotificationsModule | null | undefined;
let handlerConfigured = false;

function resolveProjectId(): string | undefined {
  const fromEnv = process.env.EXPO_PUBLIC_EAS_PROJECT_ID?.trim();
  if (fromEnv) return fromEnv;

  const fromEas = Constants.easConfig?.projectId;
  if (fromEas) return fromEas;

  const fromExtra = (
    Constants.expoConfig?.extra as { eas?: { projectId?: string } | undefined } | undefined
  )?.eas?.projectId;

  if (fromExtra && !fromExtra.startsWith('REPLACE_')) return fromExtra;
  return undefined;
}

/**
 * Expo Go (store client) cannot receive remote push on modern Android SDKs.
 * Prefer executionEnvironment over isRunningInExpoGo alone — some sessions mis-report.
 */
export function canUseRemotePush(): boolean {
  if (Platform.OS === 'web') return false;
  const env = Constants.executionEnvironment;
  if (env === 'storeClient') return false;
  // Bare / standalone / null (dev client) are OK if the native module loads.
  return true;
}

/** Wait until JS interactions settle and the app reports active. */
async function whenUiReady(timeoutMs = 10_000): Promise<boolean> {
  await new Promise<void>((resolve) => {
    InteractionManager.runAfterInteractions(() => resolve());
  });
  await new Promise((r) => setTimeout(r, 400));

  if (AppState.currentState === 'active') return true;

  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      sub.remove();
      resolve(false);
    }, timeoutMs);

    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        clearTimeout(timer);
        sub.remove();
        resolve(true);
      }
    });
  });
}

async function maybeExplainDenied(): Promise<void> {
  try {
    const already = await SecureStore.getItemAsync(DENIED_EXPLAINED_KEY);
    if (already === '1') return;
    await SecureStore.setItemAsync(DENIED_EXPLAINED_KEY, '1');
  } catch {
    // ignore
  }

  Toast.show({
    type: 'info',
    text1: 'Notifications are off',
    text2: 'Enable them for gate alerts, polls, notices, and join updates.',
    visibilityTime: 5000,
    onPress: () => {
      void Linking.openSettings();
    },
  });
}

/**
 * Lazy-load expo-notifications. Returns null when the native module is unavailable
 * (Expo Go Android, web, etc.).
 */
export async function loadNotifications(): Promise<NotificationsModule | null> {
  if (notificationsModule !== undefined) return notificationsModule;

  if (!canUseRemotePush()) {
    notificationsModule = null;
    return null;
  }

  // Still skip known Expo Go — importing can crash Android in store client.
  if (isRunningInExpoGo() && Constants.executionEnvironment === 'storeClient') {
    notificationsModule = null;
    return null;
  }

  try {
    notificationsModule = await import('expo-notifications');
    return notificationsModule;
  } catch (e) {
    console.info('[push] expo-notifications unavailable:', e);
    notificationsModule = null;
    return null;
  }
}

/** Show banners while the app is open; call once at startup. */
export async function configurePushPresentation(): Promise<void> {
  const Notifications = await loadNotifications();
  if (!Notifications) return;

  if (!handlerConfigured) {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
    handlerConfigured = true;
  }

  if (Platform.OS === 'android') {
    try {
      // Omit `sound` — the string "default" is treated as a missing custom sound file.
      await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
        name: 'Portl alerts',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#0F766E',
      });
    } catch (e) {
      console.warn('[push] Channel setup skipped:', e);
    }
  }
}

async function registerForPushNotificationsInner(userId: string): Promise<string | null> {
  if (Platform.OS === 'web') return null;

  if (!Device.isDevice) {
    console.info('[push] Skipping token registration — not a physical device.');
    return null;
  }

  if (!(await whenUiReady())) {
    console.info('[push] Skipping token registration — UI not ready.');
    return null;
  }

  await configurePushPresentation();
  const Notifications = await loadNotifications();
  if (!Notifications) {
    console.info(
      '[push] Skipping token registration — use a development build (not Expo Go) for remote push.',
    );
    return null;
  }

  const current = await Notifications.getPermissionsAsync();
  let status = current.status;
  console.info('[push] Permission status:', status, {
    canAskAgain: current.canAskAgain,
    env: Constants.executionEnvironment,
  });

  if (status !== 'granted') {
    // On Android, status is often "denied" before the first prompt; only stop if we cannot ask.
    if (current.canAskAgain === false) {
      await maybeExplainDenied();
      return null;
    }

    if (!(await whenUiReady())) return null;
    try {
      const requested = await Notifications.requestPermissionsAsync();
      status = requested.status;
      console.info('[push] Permission after request:', status);
    } catch (e) {
      console.warn('[push] Permission request skipped (no Activity):', e);
      return null;
    }
  } else {
    console.info('[push] Already allowed — skipping dialog, fetching Expo push token…');
  }

  if (status !== 'granted') {
    await maybeExplainDenied();
    return null;
  }

  const projectId = resolveProjectId();
  if (!projectId) {
    console.warn(
      '[push] Missing EAS projectId — set extra.eas.projectId or EXPO_PUBLIC_EAS_PROJECT_ID.',
    );
  }

  let tokenResult;
  try {
    tokenResult = projectId
      ? await Notifications.getExpoPushTokenAsync({ projectId })
      : await Notifications.getExpoPushTokenAsync();
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes('FirebaseApp') || msg.includes('fcm-credentials')) {
      console.warn(
        '[push] Android FCM not configured. Add google-services.json, set android.googleServicesFile in app.json, upload FCM V1 key to EAS, then rebuild the dev client. See https://docs.expo.dev/push-notifications/fcm-credentials/',
      );
      return null;
    }
    throw e;
  }
  const token = tokenResult.data;
  if (!token) {
    console.warn('[push] getExpoPushTokenAsync returned empty token');
    return null;
  }

  const { error } = await supabase
    .from('profiles')
    .update({ push_token: token })
    .eq('id', userId);

  if (error) {
    console.warn('[push] Failed to save token:', error.message);
    return null;
  }

  console.info('[push] Token registered for', userId.slice(0, 8) + '…');
  return token;
}

/**
 * Requests permission (only if not already decided) and saves an Expo push token.
 * Safe when the native module is missing — never throws to callers.
 *
 * @param force When true, bypasses in-flight dedupe so Settings can re-sync.
 */
export async function registerForPushNotifications(
  userId: string,
  options?: { force?: boolean },
): Promise<string | null> {
  if (!options?.force) {
    const existing = inFlightByUser.get(userId);
    if (existing) return existing;
  }

  const run = (async () => {
    try {
      return await registerForPushNotificationsInner(userId);
    } catch (e) {
      console.warn('[push] Registration unavailable:', e);
      return null;
    } finally {
      inFlightByUser.delete(userId);
    }
  })();

  inFlightByUser.set(userId, run);
  return run;
}

/** Human-readable status for Settings / debugging. */
export async function getPushRegistrationHint(): Promise<{
  canRegister: boolean;
  permission: string;
  hint: string;
}> {
  if (Platform.OS === 'web') {
    return { canRegister: false, permission: 'n/a', hint: 'Push is not available on web.' };
  }
  if (!canUseRemotePush() || isRunningInExpoGo()) {
    return {
      canRegister: false,
      permission: 'n/a',
      hint: 'Open the Portl development build (not Expo Go) to receive alerts.',
    };
  }
  const Notifications = await loadNotifications();
  if (!Notifications) {
    return {
      canRegister: false,
      permission: 'n/a',
      hint: 'Rebuild the Portl development client with expo-notifications.',
    };
  }
  const { status, canAskAgain } = await Notifications.getPermissionsAsync();
  if (status === 'granted') {
    return {
      canRegister: true,
      permission: status,
      hint: 'Allowed — tap to sync your device for alerts.',
    };
  }
  if (status === 'denied' || canAskAgain === false) {
    return {
      canRegister: true,
      permission: status,
      hint: 'Blocked — open system settings to allow notifications.',
    };
  }
  return {
    canRegister: true,
    permission: status,
    hint: 'Tap to allow notifications for gate alerts and polls.',
  };
}

/** Best-effort clear of stored token on sign-out. */
export async function clearPushToken(userId: string): Promise<void> {
  try {
    await supabase.from('profiles').update({ push_token: null }).eq('id', userId);
  } catch (e) {
    console.warn('[push] Failed to clear token:', e);
  }
}

export type SendPushPayload = {
  userId?: string;
  userIds?: string[];
  title: string;
  body: string;
  data?: Record<string, unknown>;
};

/** Invokes the send-push Edge Function. Failures are logged, never thrown. */
export async function invokeSendPush(payload: SendPushPayload): Promise<void> {
  const ids = [
    ...(payload.userId ? [payload.userId] : []),
    ...(payload.userIds ?? []),
  ].filter(Boolean);

  if (ids.length === 0) return;

  try {
    const { data, error } = await supabase.functions.invoke('send-push', {
      body: {
        userId: payload.userId,
        userIds: ids,
        title: payload.title,
        body: payload.body,
        data: payload.data ?? {},
      },
    });

    if (error) {
      console.warn('[push] send-push invoke failed:', error.message, error);
      return;
    }

    const result = data as { sent?: number; skipped?: number; detail?: string; error?: string } | null;
    if (result?.error) {
      console.warn('[push] send-push error:', result.error);
      return;
    }
    if (result && (result.sent === 0 || (result.skipped ?? 0) > 0)) {
      console.warn(
        '[push] send-push delivered to 0 devices — recipients need a saved push_token (open the Portl development build and allow notifications).',
        result,
      );
      return;
    }
    if (result?.sent) {
      console.info('[push] send-push sent', result.sent, 'message(s)');
    }
  } catch (e) {
    console.warn('[push] send-push invoke error:', e);
  }
}

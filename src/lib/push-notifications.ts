import Constants from 'expo-constants';
import { isRunningInExpoGo } from 'expo';
import * as Device from 'expo-device';
import { AppState, InteractionManager, Linking, Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import Toast from 'react-native-toast-message';

import { supabase } from '@/lib/supabase';

const DENIED_EXPLAINED_KEY = 'portl_push_denied_explained';

/** Prevents double registration from getSession + INITIAL_SESSION racing. */
const inFlightByUser = new Map<string, Promise<string | null>>();

function resolveProjectId(): string | undefined {
  const fromEnv = process.env.EXPO_PUBLIC_EAS_PROJECT_ID?.trim();
  if (fromEnv) return fromEnv;

  const fromEas = Constants.easConfig?.projectId;
  if (fromEas) return fromEas;

  const fromExtra = (
    Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined
  )?.eas?.projectId;

  if (fromExtra && !fromExtra.startsWith('REPLACE_')) return fromExtra;
  return undefined;
}

/** Wait until JS interactions settle and the app reports active (Activity is usually ready then). */
async function whenUiReady(timeoutMs = 10_000): Promise<boolean> {
  await new Promise<void>((resolve) => {
    InteractionManager.runAfterInteractions(() => resolve());
  });
  // Give Android Activity a beat after Fast Refresh / cold start.
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
    // SecureStore can fail on web / locked devices — still show once this session.
  }

  // Toast does not need a native Alert Activity (avoids InvocationTargetException on HMR).
  Toast.show({
    type: 'info',
    text1: 'Notifications are off',
    text2: 'Enable them in settings for visitor alerts and notices.',
    visibilityTime: 5000,
    onPress: () => {
      void Linking.openSettings();
    },
  });
}

/**
 * Lazy-load expo-notifications only outside Expo Go.
 * SDK 53+ throws on Android if this module is imported inside Expo Go.
 */
async function loadNotifications() {
  if (isRunningInExpoGo()) {
    return null;
  }
  return import('expo-notifications');
}

async function registerForPushNotificationsInner(userId: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    return null;
  }

  if (isRunningInExpoGo()) {
    console.info(
      '[push] Skipping token registration — remote push is unavailable in Expo Go (use a development build).',
    );
    return null;
  }

  if (!Device.isDevice) {
    console.info('[push] Skipping token registration — not a physical device.');
    return null;
  }

  if (!(await whenUiReady())) {
    console.info('[push] Skipping token registration — UI not ready.');
    return null;
  }

  const Notifications = await loadNotifications();
  if (!Notifications) return null;

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });

  if (Platform.OS === 'android') {
    try {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    } catch (e) {
      console.warn('[push] Channel setup skipped:', e);
    }
  }

  const current = await Notifications.getPermissionsAsync();
  let status = current.status;

  if (status !== 'granted') {
    if (current.canAskAgain === false || status === 'denied') {
      await maybeExplainDenied();
      return null;
    }

    if (!(await whenUiReady())) return null;
    try {
      const requested = await Notifications.requestPermissionsAsync();
      status = requested.status;
    } catch (e) {
      console.warn('[push] Permission request skipped (no Activity):', e);
      return null;
    }
  }

  if (status !== 'granted') {
    await maybeExplainDenied();
    return null;
  }

  const projectId = resolveProjectId();
  const tokenResult = projectId
    ? await Notifications.getExpoPushTokenAsync({ projectId })
    : await Notifications.getExpoPushTokenAsync();

  const token = tokenResult.data;
  if (!token) return null;

  const { error } = await supabase
    .from('profiles')
    .update({ push_token: token })
    .eq('id', userId);

  if (error) {
    console.warn('[push] Failed to save token:', error.message);
    return null;
  }

  return token;
}

/**
 * Requests permission (first time) and saves an Expo push token on the profile.
 * Safe on Expo Go / emulators / web / denied permissions — never throws to callers.
 */
export async function registerForPushNotifications(userId: string): Promise<string | null> {
  const existing = inFlightByUser.get(userId);
  if (existing) return existing;

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
    const { error } = await supabase.functions.invoke('send-push', {
      body: {
        userId: payload.userId,
        userIds: ids,
        title: payload.title,
        body: payload.body,
        data: payload.data ?? {},
      },
    });
    if (error) {
      console.warn('[push] send-push invoke failed:', error.message);
    }
  } catch (e) {
    console.warn('[push] send-push invoke error:', e);
  }
}

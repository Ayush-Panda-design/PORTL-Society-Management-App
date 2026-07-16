import Constants from 'expo-constants';
import { isRunningInExpoGo } from 'expo';
import * as Device from 'expo-device';
import { Alert, Linking, Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

import { supabase } from '@/lib/supabase';

const DENIED_EXPLAINED_KEY = 'portl_push_denied_explained';

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

async function maybeExplainDenied(): Promise<void> {
  try {
    const already = await SecureStore.getItemAsync(DENIED_EXPLAINED_KEY);
    if (already === '1') return;
    await SecureStore.setItemAsync(DENIED_EXPLAINED_KEY, '1');
  } catch {
    // SecureStore can fail on web / locked devices — still show once this session.
  }

  Alert.alert(
    'Notifications are off',
    'Enable notifications in system settings to get visitor alerts and society notices. You can turn them on anytime.',
    [
      { text: 'Not now', style: 'cancel' },
      {
        text: 'Open settings',
        onPress: () => {
          void Linking.openSettings();
        },
      },
    ],
  );
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

/**
 * Requests permission (first time) and saves an Expo push token on the profile.
 * Safe on Expo Go / emulators / web / denied permissions — never throws to callers.
 */
export async function registerForPushNotifications(userId: string): Promise<string | null> {
  try {
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
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }

    const current = await Notifications.getPermissionsAsync();
    let status = current.status;

    if (status !== 'granted') {
      if (current.canAskAgain === false || status === 'denied') {
        await maybeExplainDenied();
        return null;
      }

      const requested = await Notifications.requestPermissionsAsync();
      status = requested.status;
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
  } catch (e) {
    console.warn('[push] Registration unavailable:', e);
    return null;
  }
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

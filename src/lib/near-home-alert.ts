import { AppState, Platform } from 'react-native';
import Toast from 'react-native-toast-message';

import {
  NEAR_HOME_RADIUS_M,
  distanceMeters,
  fetchSocietyCoords,
  getCurrentCoords,
  isLocationAvailable,
  watchPosition,
} from '@/lib/location-helpers';
import { loadNotifications } from '@/lib/push-notifications';

type WatchState = {
  societyId: string;
  visitorName?: string;
  subscription: { remove: () => void } | null;
};

let activeWatch: WatchState | null = null;

async function fireNearHomeNotification(visitorName?: string) {
  const Notifications = await loadNotifications();
  if (!Notifications) {
    Toast.show({
      type: 'success',
      text1: 'You’re near home',
      text2: visitorName
        ? `Expecting ${visitorName} — open Portl if needed.`
        : 'Delivery window — you’re close to the society.',
    });
    return;
  }

  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Almost home',
      body: visitorName
        ? `You’re near the society — ${visitorName} may arrive soon.`
        : 'You’re near your society.',
      data: { type: 'visitor_pending' },
      sound: true,
    },
    trigger: null,
  });
}

/** One-shot watch: notify when the resident enters ~800m of society. */
export async function startNearHomeAlert(params: {
  societyId: string;
  visitorName?: string;
}): Promise<boolean> {
  if (Platform.OS === 'web') {
    Toast.show({ type: 'info', text1: 'Near-home alerts need the mobile app' });
    return false;
  }

  if (!(await isLocationAvailable())) {
    Toast.show({
      type: 'info',
      text1: 'Location needs a rebuild',
      text2: 'Run npx expo run:android to enable near-home alerts.',
    });
    return false;
  }

  const home = await fetchSocietyCoords(params.societyId);
  if (!home) {
    Toast.show({
      type: 'info',
      text1: 'Society location missing',
      text2: 'Ask an admin to set society coordinates first.',
    });
    return false;
  }

  stopNearHomeAlert();

  // Immediate check (already near).
  const here = await getCurrentCoords();
  if (!here) {
    Toast.show({ type: 'error', text1: 'Location permission needed' });
    return false;
  }

  if (distanceMeters(here, home) <= NEAR_HOME_RADIUS_M) {
    await fireNearHomeNotification(params.visitorName);
    Toast.show({ type: 'success', text1: 'You’re already near home' });
    return true;
  }

  activeWatch = {
    societyId: params.societyId,
    visitorName: params.visitorName,
    subscription: null,
  };

  activeWatch.subscription = await watchPosition(async (coords) => {
    if (!activeWatch) return;
    if (AppState.currentState !== 'active' && AppState.currentState !== 'background') return;
    const meters = distanceMeters(coords, home);
    if (meters <= NEAR_HOME_RADIUS_M) {
      const name = activeWatch.visitorName;
      stopNearHomeAlert();
      await fireNearHomeNotification(name);
    }
  });

  if (!activeWatch.subscription) {
    activeWatch = null;
    Toast.show({ type: 'error', text1: 'Could not start location watch' });
    return false;
  }

  Toast.show({
    type: 'success',
    text1: 'Near-home alert on',
    text2: 'We’ll nudge you when you’re ~5 min away.',
  });
  return true;
}

export function stopNearHomeAlert(): void {
  activeWatch?.subscription?.remove();
  activeWatch = null;
}

export function isNearHomeAlertActive(): boolean {
  return activeWatch != null;
}

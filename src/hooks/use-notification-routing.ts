import { isRunningInExpoGo } from 'expo';
import Constants from 'expo-constants';
import type { Href } from 'expo-router';
import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { AppState, Platform } from 'react-native';
import Toast from 'react-native-toast-message';

import type { NotificationData, NotificationType } from '@/lib/notifications';
import {
  canUseRemotePush,
  configurePushPresentation,
  registerForPushNotifications,
} from '@/lib/push-notifications';
import {
  handleVisitorNotificationAction,
  VISITOR_ACTION_APPROVE,
  VISITOR_ACTION_REJECT,
} from '@/lib/visitor-notification-actions';
import { useAuthStore } from '@/stores/authStore';
import type { UserRole } from '@/types/database';

function hrefForNotification(
  data: NotificationData,
  role: UserRole | null,
): Href | null {
  const type = data.type as NotificationType | undefined;
  if (!type || !role) return null;

  switch (type) {
    case 'visitor_pending':
    case 'visitor_checked_in':
      return role === 'resident' ? ('/(resident)/visitors' as Href) : null;
    case 'visitor_decision':
      return role === 'guard' ? ('/(guard)/dashboard' as Href) : null;
    case 'notice':
      return role === 'resident' ? ('/(resident)/notices' as Href) : null;
    case 'broadcast':
      if (role === 'resident') return '/(resident)/notices' as Href;
      if (role === 'admin') return '/(admin)/broadcasts' as Href;
      return null;
    case 'poll_new':
    case 'poll_results':
      if (role !== 'resident') return null;
      return data.pollId
        ? (`/(resident)/polls/${data.pollId}` as Href)
        : ('/(resident)/polls' as Href);
    case 'join_request':
      return role === 'admin' ? ('/(admin)/join-requests' as Href) : null;
    case 'join_reviewed':
      if (data.status === 'active') {
        if (role === 'resident') return '/(resident)' as Href;
        if (role === 'guard') return '/(guard)' as Href;
        return '/(admin)' as Href;
      }
      return '/(onboarding)' as Href;
    case 'complaint_new':
      return role === 'admin' ? ('/(admin)/complaints' as Href) : null;
    case 'complaint_updated':
      return role === 'resident' ? ('/(resident)/helpdesk' as Href) : null;
    default:
      return null;
  }
}

function parseData(raw: unknown): NotificationData | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;
  if (typeof obj.type !== 'string') return null;
  return obj as NotificationData;
}

/**
 * Routes notification taps to the right screen based on payload + user role.
 * Also handles Approve / Reject actions on visitor_pending notifications.
 */
export function useNotificationRouting() {
  const router = useRouter();
  const role = useAuthStore((s) => s.profile?.role ?? null);
  const session = useAuthStore((s) => s.session);
  const userId = session?.user?.id;
  const handledColdStart = useRef(false);

  useEffect(() => {
    if (!userId || Platform.OS === 'web') return;
    if (!canUseRemotePush()) return;

    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void registerForPushNotifications(userId, { force: true });
      }
    });
    return () => sub.remove();
  }, [userId]);

  useEffect(() => {
    if (!session || Platform.OS === 'web') return;
    if (!canUseRemotePush()) return;
    if (isRunningInExpoGo() && Constants.executionEnvironment === 'storeClient') return;

    let subscription: { remove: () => void } | undefined;

    const run = async () => {
      try {
        await configurePushPresentation();
        const Notifications = await import('expo-notifications');

        const navigate = (data: NotificationData | null) => {
          if (!data) return;
          const href = hrefForNotification(data, role);
          if (href) router.push(href);
        };

        const handleResponse = async (response: {
          actionIdentifier: string;
          notification: { request: { content: { data?: unknown } } };
        }) => {
          const data = parseData(response.notification.request.content.data);
          const actionId = response.actionIdentifier;

          if (
            actionId === VISITOR_ACTION_APPROVE ||
            actionId === VISITOR_ACTION_REJECT
          ) {
            const result = await handleVisitorNotificationAction({
              actionId,
              visitorId: data?.visitorId,
              flatId: data?.flatId,
              visitorName: data?.visitorName,
            });
            if (result.handled) {
              Toast.show({
                type: result.error ? 'error' : 'success',
                text1: result.error
                  ? 'Could not update visitor'
                  : actionId === VISITOR_ACTION_APPROVE
                    ? 'Visitor approved'
                    : 'Visitor rejected',
                text2: result.error,
              });
            }
            return;
          }

          // Default tap (not an action button)
          if (
            actionId === Notifications.DEFAULT_ACTION_IDENTIFIER ||
            actionId === 'expo.modules.notifications.actions.DEFAULT'
          ) {
            navigate(data);
          }
        };

        if (!handledColdStart.current) {
          handledColdStart.current = true;
          const last = await Notifications.getLastNotificationResponseAsync();
          if (last) {
            await handleResponse(last);
          }
        }

        subscription = Notifications.addNotificationResponseReceivedListener((response) => {
          void handleResponse(response);
        });
      } catch (e) {
        console.warn('[push] notification routing unavailable:', e);
      }
    };

    void run();

    return () => {
      subscription?.remove();
    };
  }, [session, role, router]);
}

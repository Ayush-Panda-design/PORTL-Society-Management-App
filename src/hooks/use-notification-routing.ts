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
import { destinationForProfile } from '@/lib/auth-routing';
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
  permissions: readonly string[] = [],
): Href | null {
  const type = data.type as NotificationType | undefined;
  if (!type || !role) return null;

  switch (type) {
    case 'visitor_pending':
      return role === 'resident' ? ('/(resident)/visitors' as Href) : null;
    case 'visitor_checked_in':
    case 'visitor_auto_approved':
    case 'visitor_checked_out':
      return role === 'resident' ? ('/(resident)/visitor-history' as Href) : null;
    case 'visitor_escalated':
      if (role === 'admin' || permissions.includes('visitors.manage')) {
        return '/(admin)/escalated-visitors' as Href;
      }
      if (role === 'resident') return '/(resident)/visitors' as Href;
      if (role === 'guard') return '/(guard)/dashboard' as Href;
      return null;
    case 'visitor_decision':
      return role === 'guard' ? ('/(guard)/verify' as Href) : null;
    case 'notice':
      return role === 'resident' ? ('/(resident)/notices' as Href) : null;
    case 'broadcast':
      if (role === 'resident') return '/(resident)/notices' as Href;
      if (role === 'admin') return '/(admin)/broadcasts' as Href;
      if (role === 'guard') return '/(guard)/dashboard' as Href;
      return null;
    case 'complaint_new':
      if (role === 'admin' || permissions.includes('complaints.manage')) {
        return '/(admin)/complaints' as Href;
      }
      return null;
    case 'poll_new':
    case 'poll_results':
      if (role !== 'resident') return null;
      return data.pollId
        ? (`/(resident)/polls/${data.pollId}` as Href)
        : ('/(resident)/polls' as Href);
    case 'join_request':
      if (role === 'admin' || permissions.includes('members.review')) {
        return '/(admin)/join-requests' as Href;
      }
      return null;
    case 'join_reviewed':
      if (data.status === 'active') {
        if (role === 'resident') return '/(resident)' as Href;
        if (role === 'guard') return '/(guard)' as Href;
        return '/(admin)' as Href;
      }
      return '/(onboarding)' as Href;
    case 'complaint_updated':
      return role === 'resident' ? ('/(resident)/helpdesk' as Href) : null;
    case 'payment_due':
    case 'payment_confirmed':
      return role === 'resident'
        ? ('/(resident)/payments' as Href)
        : role === 'admin'
          ? ('/(admin)/payments' as Href)
          : null;
    case 'amenity_booked':
    case 'amenity_waitlist':
      return role === 'resident'
        ? ('/(resident)/amenities' as Href)
        : role === 'admin'
          ? ('/(admin)/amenities' as Href)
          : null;
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
  const permissions = useAuthStore((s) => s.permissions);
  const session = useAuthStore((s) => s.session);
  const fetchProfile = useAuthStore((s) => s.fetchProfile);
  const isPlatformAdmin = useAuthStore((s) => s.isPlatformAdmin);
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

        const navigate = async (data: NotificationData | null) => {
          if (!data) return;

          // Join approval must refresh profile or AuthGate keeps bouncing to pending.
          if (data.type === 'join_reviewed' && userId) {
            const nextProfile = await fetchProfile(userId);
            const dest = destinationForProfile(
              nextProfile,
              useAuthStore.getState().user,
              useAuthStore.getState().isPlatformAdmin,
            );
            router.replace(dest);
            return;
          }

          const href = hrefForNotification(data, role, permissions);
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
              createdBy: data?.createdBy,
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
            void navigate(data);
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
  }, [session, role, permissions, router, fetchProfile, userId, isPlatformAdmin]);
}

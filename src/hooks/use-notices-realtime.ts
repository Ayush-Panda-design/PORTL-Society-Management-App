import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { AppState, Platform } from 'react-native';

import { queryKeys } from '@/lib/query-client';
import { canUseRemotePush } from '@/lib/push-notifications';
import { supabase } from '@/lib/supabase';

function invalidateNotices(
  queryClient: ReturnType<typeof useQueryClient>,
  societyId: string,
) {
  void queryClient.invalidateQueries({
    queryKey: queryKeys.notices(societyId),
  });
}

/**
 * Keep the notices react-query cache in sync via Supabase Realtime,
 * plus refetch when the app returns to the foreground / a notice push arrives.
 * Mount once per society (e.g. from the tab layout).
 */
export function useNoticesRealtime(societyId: string | null | undefined): void {
  const queryClient = useQueryClient();
  const instanceId = useRef(`n${Math.random().toString(36).slice(2, 10)}`).current;

  useEffect(() => {
    if (!societyId) return;

    const channel = supabase
      .channel(`notices:${societyId}:${instanceId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notices',
          filter: `society_id=eq.${societyId}`,
        },
        () => {
          invalidateNotices(queryClient, societyId);
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [societyId, queryClient, instanceId]);

  useEffect(() => {
    if (!societyId) return;

    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        invalidateNotices(queryClient, societyId);
      }
    });

    return () => sub.remove();
  }, [societyId, queryClient]);

  useEffect(() => {
    if (!societyId || Platform.OS === 'web' || !canUseRemotePush()) return;

    let remove: (() => void) | undefined;

    void (async () => {
      try {
        const Notifications = await import('expo-notifications');
        const sub = Notifications.addNotificationReceivedListener((notification) => {
          const data = notification.request.content.data as { type?: string } | undefined;
          if (data?.type === 'notice') {
            invalidateNotices(queryClient, societyId);
          }
        });
        remove = () => sub.remove();
      } catch {
        // Push module unavailable (Expo Go / web) — polling + realtime still apply.
      }
    })();

    return () => {
      remove?.();
    };
  }, [societyId, queryClient]);
}

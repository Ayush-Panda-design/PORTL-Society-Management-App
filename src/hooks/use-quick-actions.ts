import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';

import { hrefForQuickAction, syncQuickActions } from '@/lib/quick-actions';
import { useAuthStore } from '@/stores/authStore';

/**
 * Registers home-screen long-press shortcuts and routes taps into the app.
 */
export function useQuickActions() {
  const router = useRouter();
  const role = useAuthStore((s) => s.profile?.role ?? null);
  const session = useAuthStore((s) => s.session);
  const handledLaunch = useRef(false);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    void syncQuickActions(session ? role : null);
  }, [role, session]);

  useEffect(() => {
    if (Platform.OS === 'web' || !session) return;
    let sub: { remove: () => void } | undefined;

    const run = async () => {
      try {
        const QuickActions = await import('expo-quick-actions');

        if (!handledLaunch.current) {
          handledLaunch.current = true;
          const initial = QuickActions.initial;
          if (initial?.id) {
            const href = hrefForQuickAction(String(initial.id), role);
            if (href) router.push(href);
          }
        }

        sub = QuickActions.addListener((action) => {
          const href = hrefForQuickAction(String(action.id), role);
          if (href) router.push(href);
        });
      } catch (e) {
        console.info('[quick-actions] listener unavailable:', e);
      }
    };

    void run();
    return () => sub?.remove();
  }, [session, role, router]);
}

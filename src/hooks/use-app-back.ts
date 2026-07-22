import { useNavigation } from '@react-navigation/native';
import { useRouter, useSegments } from 'expo-router';
import { useCallback } from 'react';

import { backFallbackForSegments } from '@/lib/navigation-back';
import { destinationForProfile } from '@/lib/auth-routing';
import { dismissTopModal } from '@/lib/modal-back-stack';
import { useAuthStore } from '@/stores/authStore';

type UseAppBackOptions = {
  /** When false, do nothing if there is no history (lets the OS handle e.g. exit app). */
  allowRoleHomeFallback?: boolean;
};

type NavLike = {
  canGoBack: () => boolean;
  goBack: () => void;
  getParent?: () => NavLike | undefined;
};

/**
 * Back navigation that respects tab/stack history on the focused navigator.
 * Walks parent navigators so a root Android BackHandler still finds tab history.
 * Open modals/sheets are dismissed first.
 */
export function useAppBack(options?: UseAppBackOptions) {
  const navigation = useNavigation();
  const router = useRouter();
  const segments = useSegments();
  const profile = useAuthStore((s) => s.profile);
  const user = useAuthStore((s) => s.user);
  const allowRoleHomeFallback = options?.allowRoleHomeFallback !== false;

  return useCallback((): boolean => {
    if (dismissTopModal()) {
      return true;
    }

    let nav: NavLike | undefined = navigation as unknown as NavLike;
    while (nav) {
      if (nav.canGoBack()) {
        nav.goBack();
        return true;
      }
      nav = nav.getParent?.();
    }

    const fallback = backFallbackForSegments(segments);
    if (fallback) {
      router.replace(fallback);
      return true;
    }

    if (allowRoleHomeFallback) {
      router.replace(destinationForProfile(profile, user));
      return true;
    }

    return false;
  }, [
    allowRoleHomeFallback,
    navigation,
    router,
    segments,
    profile,
    user,
  ]);
}

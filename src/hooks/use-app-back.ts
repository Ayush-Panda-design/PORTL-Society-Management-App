import { useNavigation } from '@react-navigation/native';
import { useRouter, useSegments } from 'expo-router';
import { useCallback } from 'react';

import { backFallbackForSegments } from '@/lib/navigation-back';
import { destinationForProfile } from '@/lib/auth-routing';
import { useAuthStore } from '@/stores/authStore';

type UseAppBackOptions = {
  /** When false, do nothing if there is no history (lets the OS handle e.g. exit app). */
  allowRoleHomeFallback?: boolean;
};

/**
 * Back navigation that respects tab/stack history on the focused navigator.
 * Root `router.canGoBack()` is wrong inside tab aux screens — it skips tab history.
 */
export function useAppBack(options?: UseAppBackOptions) {
  const navigation = useNavigation();
  const router = useRouter();
  const segments = useSegments();
  const profile = useAuthStore((s) => s.profile);
  const user = useAuthStore((s) => s.user);
  const allowRoleHomeFallback = options?.allowRoleHomeFallback !== false;

  return useCallback((): boolean => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return true;
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

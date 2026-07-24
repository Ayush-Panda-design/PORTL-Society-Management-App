import type { Href } from 'expo-router';
import { usePathname, useRouter, useSegments } from 'expo-router';
import { type ReactNode, useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { Brand } from '@/constants/theme';
import {
  canAccessAdminRoute,
  committeeHomeHref,
  isCommitteeMember,
  isFullAdmin,
} from '@/lib/admin-access';
import { useAuthStore } from '@/stores/authStore';

type Props = { children: ReactNode };

/**
 * Blocks committee residents from admin routes they were not granted.
 * Full admins always pass.
 */
export function AdminRouteGuard({ children }: Props) {
  const router = useRouter();
  const segments = useSegments();
  const pathname = usePathname();
  const role = useAuthStore((s) => s.profile?.role);
  const permissions = useAuthStore((s) => s.permissions);
  const isInitialized = useAuthStore((s) => s.isInitialized);

  const parts = segments as readonly string[];
  // ["(admin)", "(tabs)", "notices"] or ["(admin)", "profile"]
  const routeName =
    parts[1] === '(tabs)' ? parts[2] : parts[1] === 'profile' ? 'profile' : parts[2] ?? parts[1];

  const allowed =
    isFullAdmin(role) ||
    !isCommitteeMember(role, permissions) ||
    canAccessAdminRoute(routeName, role, permissions);

  useEffect(() => {
    if (!isInitialized || !isCommitteeMember(role, permissions)) return;
    if (allowed) return;
    router.replace(committeeHomeHref(permissions ?? []) as Href);
  }, [allowed, isInitialized, permissions, role, router, pathname]);

  if (!isInitialized) {
    return (
      <View className="flex-1 items-center justify-center bg-surface">
        <ActivityIndicator size="large" color={Brand.primary} />
      </View>
    );
  }

  if (!allowed) {
    return (
      <View className="flex-1 items-center justify-center bg-surface">
        <ActivityIndicator size="large" color={Brand.primary} />
      </View>
    );
  }

  return <>{children}</>;
}

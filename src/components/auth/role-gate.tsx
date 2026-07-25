import type { Href } from 'expo-router';
import { useRouter } from 'expo-router';
import { type ReactNode, useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { Brand } from '@/constants/theme';
import { roleHome } from '@/lib/auth-routing';
import { useAuthStore } from '@/stores/authStore';
import type { UserRole } from '@/types/database';

type Props = {
  allowedRole: UserRole;
  /** When true, committee residents with permissions may stay in the admin shell. */
  allowCommittee?: boolean;
  children: ReactNode;
};

/**
 * Local role check inside each role layout (defense in depth beyond AuthGate).
 */
export function RoleGate({ allowedRole, allowCommittee = false, children }: Props) {
  const router = useRouter();
  const profile = useAuthStore((s) => s.profile);
  const permissions = useAuthStore((s) => s.permissions);
  const isInitialized = useAuthStore((s) => s.isInitialized);
  const isLoading = useAuthStore((s) => s.isLoading);

  const isCommitteeAllowed =
    allowCommittee &&
    allowedRole === 'admin' &&
    profile?.role === 'resident' &&
    (permissions?.length ?? 0) > 0;

  const allowed =
    profile?.role === allowedRole || isCommitteeAllowed;

  useEffect(() => {
    if (!isInitialized || isLoading || !profile) return;
    if (allowed) return;
    router.replace(roleHome(profile.role) as Href);
  }, [allowed, isInitialized, isLoading, profile, router]);

  if (!isInitialized || isLoading || !profile) {
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

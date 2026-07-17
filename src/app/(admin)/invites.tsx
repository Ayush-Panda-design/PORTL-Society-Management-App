import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { RefreshCw, Share2 } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Share,
  Text,
  View,
} from 'react-native';
import Toast from 'react-native-toast-message';

import { AnimatedPressable } from '@/components/ui/animated-pressable';
import { AppCard } from '@/components/ui/brand';
import { ScreenHeader } from '@/components/ui/screen-header';
import { ThemedRefreshControl } from '@/components/ui/themed-refresh-control';
import { EmptyState } from '@/components/visitors/empty-state';
import { ErrorBanner } from '@/components/visitors/error-banner';
import { Brand, FontFamily } from '@/constants/theme';
import { queryKeys } from '@/lib/query-client';
import { listSocietyInviteCodes, regenerateInviteCode } from '@/lib/society-api';
import { useAuthStore } from '@/stores/authStore';
import type { InviteCode, InviteRole } from '@/types/database';

function roleLabel(role: InviteRole) {
  return role === 'resident' ? 'Resident' : 'Guard';
}

function InviteCodeCard({
  invite,
  busyRole,
  onRegenerate,
}: {
  invite: InviteCode;
  busyRole: InviteRole | null;
  onRegenerate: (role: InviteRole) => void;
}) {
  const shareMessage = `Join our society on Portl with this ${roleLabel(invite.role).toLowerCase()} invite code: ${invite.code}`;

  const share = async () => {
    try {
      await Share.share({ message: shareMessage });
    } catch (e) {
      Toast.show({
        type: 'error',
        text1: 'Could not share',
        text2: e instanceof Error ? e.message : undefined,
      });
    }
  };

  const isResident = invite.role === 'resident';

  return (
    <View className="mb-4">
      {/* Top Half */}
      <View
        className={`rounded-t-2xl p-6 ${isResident ? 'bg-brand-700' : 'bg-status-pending'}`}
      >
        <Text className="text-white/80 font-medium uppercase tracking-wider text-xs mb-1">
          {roleLabel(invite.role)} Access
        </Text>
        <Text className="text-white text-3xl tracking-[0.2em] mb-2" style={{ fontFamily: FontFamily.display }}>
          {invite.code}
        </Text>
        <Text className="text-white/70 text-xs">
          Share only with verified {isResident ? 'residents' : 'security staff'}
        </Text>
      </View>

      {/* Perforated Divider */}
      <View className="flex-row items-center h-8 bg-surface-card overflow-hidden">
        {/* Left Cutout */}
        <View className="w-4 h-8 rounded-r-full bg-surface absolute left-0 -ml-2" />
        
        {/* Dashed Line */}
        <View className="flex-1 mx-4 h-[1px] border-b border-dashed border-surface-border" />
        
        {/* Right Cutout */}
        <View className="w-4 h-8 rounded-l-full bg-surface absolute right-0 -mr-2" />
      </View>

      {/* Bottom Half */}
      <View className="rounded-b-2xl bg-surface-card p-4 pt-1 flex-row items-center justify-between">
        <View />
        <AnimatedPressable onPress={() => void share()}>
          <View className="px-4 py-2 rounded-lg bg-brand-700 flex-row items-center">
            <Share2 color="#fff" size={16} className="mr-2" />
            <Text className="text-white font-bold">Share</Text>
          </View>
        </AnimatedPressable>
      </View>

      <Pressable
        disabled={busyRole === invite.role}
        onPress={() => onRegenerate(invite.role)}
        className={`mt-2 flex-row items-center justify-center gap-2 py-2 ${
          busyRole === invite.role ? 'opacity-60' : ''
        }`}
      >
        {busyRole === invite.role ? (
          <ActivityIndicator color={Brand.inkMuted} size="small" />
        ) : (
          <RefreshCw color={Brand.inkMuted} size={14} />
        )}
        <Text className="text-xs text-ink-muted">Regenerate code (invalidates old code)</Text>
      </Pressable>
    </View>
  );
}

export default function AdminInvitesScreen() {
  const societyId = useAuthStore((s) => s.profile?.society_id);
  const queryClient = useQueryClient();
  const invitesKey = queryKeys.inviteCodes(societyId ?? 'none');
  const [refreshing, setRefreshing] = useState(false);

  const listQuery = useQuery({
    queryKey: invitesKey,
    queryFn: listSocietyInviteCodes,
    enabled: Boolean(societyId),
  });

  const regenMutation = useMutation({
    mutationFn: (role: InviteRole) => regenerateInviteCode(role),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: invitesKey });
      Toast.show({ type: 'success', text1: 'Invite code updated' });
    },
    onError: (e: Error) => {
      Toast.show({ type: 'error', text1: 'Could not regenerate', text2: e.message });
    },
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await listQuery.refetch();
    setRefreshing(false);
  }, [listQuery]);

  if (!societyId) {
    return (
      <ScreenHeader title="Invites" subtitle="Share codes to grow your society" showBack>
        <EmptyState
          visual="disconnected"
          title="No society linked"
          subtitle="Create or join a society first."
        />
      </ScreenHeader>
    );
  }

  const byRole = {
    resident: listQuery.data?.find((c) => c.role === 'resident'),
    guard: listQuery.data?.find((c) => c.role === 'guard'),
  };

  return (
    <ScreenHeader
      title="Invite links"
      subtitle="Separate codes for residents and guards"
      showBack
    >
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
        refreshControl={
          <ThemedRefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} />
        }
      >
        {listQuery.error ? (
          <ErrorBanner
            message={listQuery.error.message}
            onRetry={() => void listQuery.refetch()}
          />
        ) : null}

        {listQuery.isLoading ? (
          <View className="mt-10 items-center">
            <ActivityIndicator color={Brand.primary} />
          </View>
        ) : (
          <>
            {byRole.resident ? (
              <InviteCodeCard
                invite={byRole.resident}
                busyRole={regenMutation.isPending ? regenMutation.variables ?? null : null}
                onRegenerate={(role) => regenMutation.mutate(role)}
              />
            ) : null}
            {byRole.guard ? (
              <InviteCodeCard
                invite={byRole.guard}
                busyRole={regenMutation.isPending ? regenMutation.variables ?? null : null}
                onRegenerate={(role) => regenMutation.mutate(role)}
              />
            ) : null}
            {!byRole.resident && !byRole.guard ? (
              <EmptyState
                visual="default"
                title="No invite codes yet"
                subtitle="Codes are created when the society is set up."
              />
            ) : null}
          </>
        )}

        <Text className="mt-2 text-center text-xs text-ink-faint">
          Admin access is not joinable via code. Promote co-admins from the residents panel later.
        </Text>
      </ScrollView>
    </ScreenHeader>
  );
}

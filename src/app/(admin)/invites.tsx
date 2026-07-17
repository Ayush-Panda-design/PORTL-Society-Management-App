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

  return (
    <AppCard className="mb-3">
      <Text className="text-xs uppercase text-ink-faint">{roleLabel(invite.role)} invite</Text>
      <Text
        className="mt-2 text-center text-3xl tracking-widest text-ink"
        style={{ fontFamily: FontFamily.display }}
        selectable
      >
        {invite.code}
      </Text>
      <Text className="mt-2 text-center text-xs text-ink-muted">
        Long-press the code to copy · share with{' '}
        {invite.role === 'resident' ? 'residents' : 'guards'} only
      </Text>

      <Pressable
        onPress={() => void share()}
        className="mt-4 flex-row items-center justify-center gap-2 rounded-xl bg-brand-700 py-3"
      >
        <Share2 color="#fff" size={16} />
        <Text className="text-sm text-white" style={{ fontFamily: FontFamily.medium }}>
          Share invite
        </Text>
      </Pressable>

      <Pressable
        disabled={busyRole === invite.role}
        onPress={() => onRegenerate(invite.role)}
        className={`mt-3 flex-row items-center justify-center gap-2 py-2 ${
          busyRole === invite.role ? 'opacity-60' : ''
        }`}
      >
        {busyRole === invite.role ? (
          <ActivityIndicator color={Brand.inkMuted} size="small" />
        ) : (
          <RefreshCw color={Brand.inkMuted} size={14} />
        )}
        <Text className="text-xs text-ink-muted">Regenerate code</Text>
      </Pressable>
    </AppCard>
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

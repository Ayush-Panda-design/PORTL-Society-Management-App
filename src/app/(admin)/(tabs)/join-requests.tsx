import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';

import { MemberSwipeDeck } from '@/components/members/member-swipe-deck';
import { AppCard, InitialsAvatar } from '@/components/ui/brand';
import { ScreenHeader } from '@/components/ui/screen-header';
import { ThemedRefreshControl } from '@/components/ui/themed-refresh-control';
import { EmptyState } from '@/components/visitors/empty-state';
import { ErrorBanner } from '@/components/visitors/error-banner';
import type { SwipeDecision } from '@/components/visitors/swipeable-visitor-card';
import { Brand, FontFamily } from '@/constants/theme';
import { fetchResidents } from '@/lib/community-api';
import { queryKeys } from '@/lib/query-client';
import { fetchPendingMembers, reviewJoinRequest } from '@/lib/society-api';
import { flatTowerName } from '@/lib/visitors';
import { useAuthStore } from '@/stores/authStore';
import type { ProfileWithFlat } from '@/types/database';

function flatLabel(profile: ProfileWithFlat): string {
  if (!profile.flats) return 'No flat assigned';
  const tower = flatTowerName(profile.flats.towers);
  return tower ? `${tower} · Flat ${profile.flats.number}` : `Flat ${profile.flats.number}`;
}

export default function AdminJoinRequestsScreen() {
  const societyId = useAuthStore((s) => s.profile?.society_id);
  const queryClient = useQueryClient();
  const pendingKey = queryKeys.pendingMembers(societyId ?? 'none');
  const residentsKey = queryKeys.residents(societyId ?? 'none');
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState(false);

  const pendingQuery = useQuery({
    queryKey: pendingKey,
    queryFn: () => fetchPendingMembers(societyId!),
    enabled: Boolean(societyId),
  });

  const activeQuery = useQuery({
    queryKey: residentsKey,
    queryFn: () => fetchResidents(societyId!),
    enabled: Boolean(societyId),
  });

  const reviewMutation = useMutation({
    mutationFn: async ({
      member,
      decision,
    }: {
      member: ProfileWithFlat;
      decision: SwipeDecision;
    }) => {
      await reviewJoinRequest({
        userId: member.id,
        approve: decision === 'approved',
      });
    },
    onMutate: async ({ member }) => {
      setBusy(true);
      await queryClient.cancelQueries({ queryKey: pendingKey });
      const previous = queryClient.getQueryData<ProfileWithFlat[]>(pendingKey);
      queryClient.setQueryData<ProfileWithFlat[]>(pendingKey, (old = []) =>
        old.filter((m) => m.id !== member.id),
      );
      return { previous };
    },
    onError: (_e, _vars, ctx) => {
      if (ctx?.previous) {
        queryClient.setQueryData(pendingKey, ctx.previous);
      }
    },
    onSettled: async () => {
      setBusy(false);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: pendingKey }),
        queryClient.invalidateQueries({ queryKey: residentsKey }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.adminDashboard(societyId ?? 'none'),
        }),
      ]);
    },
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([pendingQuery.refetch(), activeQuery.refetch()]);
    setRefreshing(false);
  }, [activeQuery, pendingQuery]);

  if (!societyId) {
    return (
      <ScreenHeader title="Members" subtitle="Approve join requests" showBack>
        <EmptyState
          visual="disconnected"
          title="No society linked"
          subtitle="Create or join a society first."
        />
      </ScreenHeader>
    );
  }

  const pending = pendingQuery.data ?? [];
  const active = activeQuery.data ?? [];

  return (
    <ScreenHeader
      title="Members"
      subtitle="Approve joiners, then manage active residents"
      showBack
    >
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 36 }}
        refreshControl={
          <ThemedRefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} />
        }
      >
        {pendingQuery.error ? (
          <ErrorBanner
            message={pendingQuery.error.message}
            onRetry={() => void pendingQuery.refetch()}
          />
        ) : null}

        {pendingQuery.isLoading ? (
          <View className="mb-6 h-40 items-center justify-center">
            <ActivityIndicator color={Brand.primary} />
          </View>
        ) : pending.length > 0 ? (
          <View className="mb-8">
            <MemberSwipeDeck
              members={pending}
              busy={busy}
              onDecision={async (member, decision) => {
                await reviewMutation.mutateAsync({ member, decision });
              }}
            />
          </View>
        ) : (
          <View className="mb-8">
            <EmptyState
              visual="invites"
              title="No pending requests"
              subtitle="When someone searches for your society or uses an invite code, they appear here for approval."
            />
          </View>
        )}

        <Text className="mb-3 text-base text-ink" style={{ fontFamily: FontFamily.heading }}>
          Active residents
        </Text>

        {activeQuery.isLoading ? (
          <ActivityIndicator color={Brand.primary} />
        ) : active.length === 0 ? (
          <Text className="text-sm text-ink-muted">
            Approved residents will show here. Assign flats from the Residents tab if needed.
          </Text>
        ) : (
          active.map((member) => (
            <AppCard key={member.id} className="mb-2 flex-row items-center gap-3">
              <InitialsAvatar
                name={member.full_name ?? 'R'}
                size={44}
                seed={member.id}
                imageUrl={member.avatar_url}
              />
              <View className="min-w-0 flex-1">
                <Text className="text-base text-ink" style={{ fontFamily: FontFamily.heading }}>
                  {member.full_name ?? 'Unnamed'}
                </Text>
                <Text className="text-sm text-ink-muted">{flatLabel(member)}</Text>
              </View>
            </AppCard>
          ))
        )}
      </ScrollView>
    </ScreenHeader>
  );
}

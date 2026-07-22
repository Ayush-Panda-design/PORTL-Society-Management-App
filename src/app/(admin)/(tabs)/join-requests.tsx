import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { MemberSwipeDeck } from '@/components/members/member-swipe-deck';
import { InitialsAvatar } from '@/components/ui/brand';
import { ListRow } from '@/components/ui/list-row';
import { ScreenHeader } from '@/components/ui/screen-header';
import { StaggeredListItem } from '@/components/ui/staggered-list-item';
import { ThemedRefreshControl } from '@/components/ui/themed-refresh-control';
import { EmptyState } from '@/components/visitors/empty-state';
import { ErrorBanner } from '@/components/visitors/error-banner';
import { SkeletonList } from '@/components/visitors/loading-state';
import type { SwipeDecision } from '@/components/visitors/swipeable-visitor-card';
import { Brand, FontFamily, Pastels } from '@/constants/theme';
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
          <View className="mb-6">
            <SkeletonList count={2} />
          </View>
        ) : pending.length > 0 ? (
          <View className="mb-8">
            <View
              className="mb-3 flex-row items-center justify-between rounded-[16px] px-3.5 py-2.5"
              style={{ backgroundColor: Pastels.rose }}
            >
              <Text
                className="text-[13px] text-ink"
                style={{ fontFamily: FontFamily.heading }}
              >
                Pending approval
              </Text>
              <View
                className="min-w-[24px] items-center rounded-pill px-2 py-0.5"
                style={{ backgroundColor: Brand.primary }}
              >
                <Text className="text-[11px] text-white" style={{ fontFamily: FontFamily.heading }}>
                  {pending.length}
                </Text>
              </View>
            </View>
            <MemberSwipeDeck
              members={pending}
              busy={busy}
              onDecision={async (member, decision) => {
                await reviewMutation.mutateAsync({ member, decision });
              }}
            />
          </View>
        ) : (
          <View
            className="mb-8 overflow-hidden rounded-[24px] bg-surface-card px-2 pt-2"
            style={{
              shadowColor: '#0F172A',
              shadowOpacity: 0.06,
              shadowRadius: 16,
              shadowOffset: { width: 0, height: 6 },
              elevation: 3,
            }}
          >
            <EmptyState
              visual="invites"
              title="No pending requests"
              subtitle="When someone searches for your society or uses an invite code, they appear here for approval."
            />
          </View>
        )}

        <View className="mb-3 flex-row items-center justify-between">
          <Text className="text-[17px] text-ink" style={{ fontFamily: FontFamily.display }}>
            Active residents
          </Text>
          {active.length > 0 ? (
            <View
              className="rounded-pill px-2.5 py-1"
              style={{ backgroundColor: Brand.primary }}
            >
              <Text
                className="text-[11px] text-white"
                style={{ fontFamily: FontFamily.heading }}
              >
                {active.length}
              </Text>
            </View>
          ) : null}
        </View>

        {activeQuery.isLoading ? (
          <SkeletonList count={3} />
        ) : active.length === 0 ? (
          <EmptyState
            visual="residents"
            title="No active residents yet"
            subtitle="Approved residents will show here. Assign flats from the Residents tab if needed."
          />
        ) : (
          <View
            className="overflow-hidden rounded-[20px] bg-surface-card"
            style={{
              shadowColor: '#0F172A',
              shadowOpacity: 0.06,
              shadowRadius: 14,
              shadowOffset: { width: 0, height: 4 },
              elevation: 2,
            }}
          >
            {active.map((member, index) => (
              <StaggeredListItem key={member.id} index={index}>
                <ListRow
                  title={member.full_name ?? 'Unnamed'}
                  subtitle={flatLabel(member)}
                  last={index === active.length - 1}
                  leading={
                    <InitialsAvatar
                      name={member.full_name ?? 'R'}
                      size={44}
                      seed={member.id}
                      imageUrl={member.avatar_url}
                    />
                  }
                />
              </StaggeredListItem>
            ))}
          </View>
        )}
      </ScrollView>
    </ScreenHeader>
  );
}

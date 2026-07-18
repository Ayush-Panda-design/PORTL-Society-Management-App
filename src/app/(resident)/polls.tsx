import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BarChart3, CheckCircle2, Vote } from 'lucide-react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Animated, FlatList, Pressable, Text, View } from 'react-native';

import { EmptyState } from '@/components/visitors/empty-state';
import { ErrorBanner } from '@/components/visitors/error-banner';
import { SkeletonList } from '@/components/visitors/loading-state';
import { ScreenHeader } from '@/components/ui/screen-header';
import { ThemedRefreshControl } from '@/components/ui/themed-refresh-control';
import { SuccessOverlay } from '@/components/ui/success-overlay';
import { InitialsAvatar } from '@/components/ui/brand';
import { Brand, FontFamily, Pastels } from '@/constants/theme';
import { isPollExpired, pollStats } from '@/lib/community';
import { castVote, fetchPolls, fetchVotesForPolls } from '@/lib/community-api';
import { queryKeys } from '@/lib/query-client';
import { useAuthStore } from '@/stores/authStore';
import type { Poll } from '@/types/database';

/** Animated progress bar that fills on mount. */
function AnimatedBar({
  pct,
  color,
  selected,
}: {
  pct: number;
  color: string;
  selected: boolean;
}) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: pct,
      duration: 650,
      useNativeDriver: false,
    }).start();
  }, [anim, pct]);

  const width = anim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  return (
    <View
      className="mt-2 h-2 overflow-hidden rounded-pill"
      style={{ backgroundColor: selected ? `${color}22` : Pastels.sage }}
    >
      <Animated.View
        style={{
          height: '100%',
          width,
          backgroundColor: selected ? color : `${color}66`,
          borderRadius: 999,
        }}
      />
    </View>
  );
}

/** Small overlapping voter avatar stack. */
function VoterAvatarStack({ count, votes }: { count: number; votes: { user_id: string }[] }) {
  const shown = votes.slice(0, 4);
  const extra = count - shown.length;

  return (
    <View className="flex-row items-center" style={{ gap: -8 }}>
      {shown.map((v, i) => (
        <View key={v.user_id} style={{ marginLeft: i === 0 ? 0 : -8, zIndex: shown.length - i }}>
          <InitialsAvatar name={v.user_id} seed={v.user_id} size={22} />
        </View>
      ))}
      {extra > 0 ? (
        <View
          className="h-6 w-6 items-center justify-center rounded-pill"
          style={{ backgroundColor: Brand.primarySoft, marginLeft: -8, zIndex: 0 }}
        >
          <Text className="text-[10px] font-bold" style={{ color: Brand.primary, fontFamily: FontFamily.heading }}>
            +{extra}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

/** Participation ring chart (simple arc using borders). */
function ParticipationRing({ totalVoters, totalOptions }: { totalVoters: number; totalOptions: number }) {
  const ratio = totalOptions > 0 ? Math.min(totalVoters / Math.max(totalOptions * 5, 1), 1) : 0;
  const pct = Math.round(ratio * 100);

  return (
    <View className="mb-4 flex-row items-center gap-4 rounded-panel bg-surface-muted p-4">
      <View className="h-14 w-14 items-center justify-center rounded-pill" style={{ borderWidth: 5, borderColor: Brand.primarySoft }}>
        <View
          className="absolute h-14 w-14 rounded-pill"
          style={{
            borderWidth: 5,
            borderColor: Brand.primary,
            borderRightColor: 'transparent',
            borderBottomColor: ratio < 0.5 ? 'transparent' : Brand.primary,
            transform: [{ rotate: `${ratio * 360}deg` }],
          }}
        />
        <Text className="text-sm font-bold text-ink" style={{ fontFamily: FontFamily.display }}>
          {pct}%
        </Text>
      </View>
      <View>
        <Text className="text-base font-semibold text-ink" style={{ fontFamily: FontFamily.heading }}>
          {totalVoters} votes cast
        </Text>
        <Text className="text-xs text-ink-muted">Participation rate</Text>
      </View>
    </View>
  );
}

export default function ResidentPollsScreen() {
  const profile = useAuthStore((s) => s.profile);
  const societyId = profile?.society_id;
  const userId = profile?.id;
  const queryClient = useQueryClient();
  const [votingPollId, setVotingPollId] = useState<string | null>(null);
  const [successVisible, setSuccessVisible] = useState(false);

  const pollsQuery = useQuery({
    queryKey: queryKeys.polls(societyId ?? 'none'),
    queryFn: () => fetchPolls(societyId!),
    enabled: Boolean(societyId),
  });

  const pollIds = useMemo(() => (pollsQuery.data ?? []).map((p) => p.id), [pollsQuery.data]);

  const votesQuery = useQuery({
    queryKey: queryKeys.pollVotes(societyId ?? 'none', pollIds),
    queryFn: () => fetchVotesForPolls(pollIds),
    enabled: Boolean(societyId) && pollIds.length > 0,
  });

  const voteMutation = useMutation({
    mutationFn: (input: { pollId: string; option: string }) => {
      setVotingPollId(input.pollId);
      return castVote({ pollId: input.pollId, option: input.option });
    },
    onSuccess: async () => {
      if (!societyId) return;
      await queryClient.invalidateQueries({ queryKey: queryKeys.polls(societyId) });
      await queryClient.refetchQueries({ queryKey: queryKeys.pollVotes(societyId, pollIds) });
      setSuccessVisible(true);
    },
    onSettled: () => setVotingPollId(null),
  });

  const votes = votesQuery.data ?? [];
  const myVotes = useMemo(() => {
    const map = new Map<string, string>();
    for (const v of votes) {
      if (v.user_id === userId) map.set(v.poll_id, v.option);
    }
    return map;
  }, [votes, userId]);

  const { active, expired } = useMemo(() => {
    const list = pollsQuery.data ?? [];
    return {
      active: list.filter((p) => !isPollExpired(p.expires_at)),
      expired: list.filter((p) => isPollExpired(p.expires_at)),
    };
  }, [pollsQuery.data]);

  if (!societyId) {
    return (
      <ScreenHeader title="Polls" subtitle="Community voting">
        <EmptyState visual="disconnected" title="No society linked" subtitle="Ask an admin to link your profile." />
      </ScreenHeader>
    );
  }

  const renderPoll = (poll: Poll, readOnly: boolean) => {
    const { total, counts } = pollStats(poll, votes);
    const myVote = myVotes.get(poll.id);
    const isVotingThisPoll = votingPollId === poll.id && voteMutation.isPending;
    const locked = readOnly || Boolean(myVote) || isVotingThisPoll;
    const pollVotes = votes.filter((v) => v.poll_id === poll.id);

    return (
      <View
        className="rounded-panel bg-surface-card"
        style={{
          shadowColor: Brand.primary,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.06,
          shadowRadius: 8,
          elevation: 2,
        }}
      >
        <View className="p-4">
          <Text className="mb-0.5 text-base font-bold text-ink" style={{ fontFamily: FontFamily.display }}>
            {poll.question}
          </Text>
          <Text className="mb-3 text-xs text-ink-faint">
            {readOnly
              ? 'Poll closed'
              : poll.expires_at
                ? `Closes ${new Date(poll.expires_at).toLocaleDateString()}`
                : 'No expiry'}
            {myVote ? ` · You voted: ${myVote}` : ''}
          </Text>

          {/* Participation ring */}
          <ParticipationRing totalVoters={total} totalOptions={poll.options.length} />

          {poll.options.map((option) => {
            const count = counts[option] ?? 0;
            const pct = total === 0 ? 0 : Math.round((count / total) * 100);
            const selected = myVote === option;
            const optionVotes = pollVotes.filter((v) => v.option === option);

            return (
              <Pressable
                key={option}
                disabled={locked}
                onPress={() => voteMutation.mutate({ pollId: poll.id, option })}
                className={`mb-3 rounded-card px-3 py-3 ${selected ? '' : ''}`}
                style={{
                  backgroundColor: selected ? `${Brand.primary}10` : 'transparent',
                  borderWidth: 1.5,
                  borderColor: selected ? Brand.primary : '#E5E8E4',
                }}
              >
                <View className="flex-row items-center justify-between">
                  <Text
                    className="font-medium text-ink"
                    style={{ fontFamily: selected ? FontFamily.heading : FontFamily.body }}
                  >
                    {option}
                  </Text>
                  <View className="flex-row items-center gap-2">
                    {/* Voter avatar stack */}
                    {optionVotes.length > 0 && (
                      <VoterAvatarStack count={count} votes={optionVotes} />
                    )}
                    <Text className="text-sm font-semibold text-ink-muted">
                      {pct}%
                    </Text>
                  </View>
                </View>
                {/* Animated progress bar */}
                <AnimatedBar pct={pct} color={Brand.primary} selected={selected} />
              </Pressable>
            );
          })}
        </View>
      </View>
    );
  };

  return (
    <ScreenHeader title="Polls" subtitle="Vote on society questions">
      {pollsQuery.error ? (
        <ErrorBanner
          message={pollsQuery.error.message}
          onRetry={() => {
            void pollsQuery.refetch();
            void votesQuery.refetch();
          }}
        />
      ) : null}
      {votesQuery.error ? (
        <ErrorBanner message={votesQuery.error.message} onRetry={() => void votesQuery.refetch()} />
      ) : null}
      {voteMutation.error ? (
        <ErrorBanner message={(voteMutation.error as Error).message} />
      ) : null}

      {pollsQuery.isLoading && !pollsQuery.data ? (
        <SkeletonList count={3} />
      ) : (
        <FlatList
          data={[
            ...active.map((p) => ({ poll: p, readOnly: false as const })),
            ...expired.map((p) => ({ poll: p, readOnly: true as const })),
          ]}
          keyExtractor={(item) => item.poll.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24, flexGrow: 1 }}
          ItemSeparatorComponent={() => <View className="h-4" />}
          refreshControl={
            <ThemedRefreshControl
              refreshing={pollsQuery.isRefetching || votesQuery.isRefetching}
              onRefresh={() => {
                void pollsQuery.refetch();
                void votesQuery.refetch();
              }}
            />
          }
          ListEmptyComponent={
            <EmptyState
              visual="polls"
              title="No polls"
              subtitle="When admins publish a poll, it will show up here."
              tips={[
                {
                  Icon: Vote,
                  title: 'Cast your vote',
                  body: 'Tap an option once — your choice is saved instantly.',
                  tint: '#7C3AED',
                  wash: Pastels.lilac,
                },
                {
                  Icon: BarChart3,
                  title: 'See live results',
                  body: 'Bars and percentages update as neighbours vote.',
                  tint: Brand.primary,
                  wash: Pastels.mint,
                },
                {
                  Icon: CheckCircle2,
                  title: 'One vote per poll',
                  body: 'After you vote, the poll locks so results stay fair.',
                  tint: Brand.accent,
                  wash: Pastels.peach,
                },
              ]}
            />
          }
          ListHeaderComponent={
            voteMutation.isPending ? (
              <View className="mb-3 items-center">
                <ActivityIndicator color={Brand.primary} />
              </View>
            ) : null
          }
          renderItem={({ item }) => renderPoll(item.poll, item.readOnly)}
        />
      )}
      <SuccessOverlay
        visible={successVisible}
        message="Vote cast"
        onDone={() => setSuccessVisible(false)}
      />
    </ScreenHeader>
  );
}

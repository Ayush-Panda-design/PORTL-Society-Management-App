import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, Text, View } from 'react-native';

import { EmptyState } from '@/components/visitors/empty-state';
import { ErrorBanner } from '@/components/visitors/error-banner';
import { SkeletonList } from '@/components/visitors/loading-state';
import { ScreenHeader } from '@/components/ui/screen-header';
import { ThemedRefreshControl } from '@/components/ui/themed-refresh-control';
import { Brand } from '@/constants/theme';
import { isPollExpired, pollStats } from '@/lib/community';
import { castVote, fetchPolls, fetchVotesForPolls } from '@/lib/community-api';
import { queryKeys } from '@/lib/query-client';
import { useAuthStore } from '@/stores/authStore';
import type { Poll } from '@/types/database';

export default function ResidentPollsScreen() {
  const profile = useAuthStore((s) => s.profile);
  const societyId = profile?.society_id;
  const userId = profile?.id;
  const queryClient = useQueryClient();
  const [votingPollId, setVotingPollId] = useState<string | null>(null);

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

    return (
      <View className="rounded-2xl border border-surface-border bg-surface-card p-4">
        <Text className="mb-1 text-base font-semibold text-ink">{poll.question}</Text>
        <Text className="mb-3 text-xs text-ink-faint">
          {readOnly
            ? 'Closed'
            : poll.expires_at
              ? `Expires ${new Date(poll.expires_at).toLocaleString()}`
              : 'No expiry'}
          {myVote ? ` · You voted: ${myVote}` : ''}
        </Text>

        {poll.options.map((option) => {
          const count = counts[option] ?? 0;
          const pct = total === 0 ? 0 : Math.round((count / total) * 100);
          const selected = myVote === option;

          return (
            <Pressable
              key={option}
              disabled={locked}
              onPress={() => voteMutation.mutate({ pollId: poll.id, option })}
              className={`mb-2 overflow-hidden rounded-xl border ${
                selected ? 'border-teal-700' : 'border-surface-border'
              }`}
            >
              <View
                pointerEvents="none"
                className={`absolute bottom-0 left-0 top-0 ${
                  selected ? 'bg-brand-100' : 'bg-surface-muted'
                }`}
                style={{ width: `${pct}%` }}
              />
              <View className="flex-row items-center justify-between px-3 py-3">
                <Text className="font-medium text-slate-800">{option}</Text>
                <Text className="text-sm text-ink-muted">
                  {pct}% ({count})
                </Text>
              </View>
            </Pressable>
          );
        })}
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
          ItemSeparatorComponent={() => <View className="h-3" />}
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
            <EmptyState visual="polls" title="No polls" subtitle="When admins publish a poll, it will show up here." />
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
    </ScreenHeader>
  );
}

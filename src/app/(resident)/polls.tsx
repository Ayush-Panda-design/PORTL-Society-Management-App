import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, Text, View } from 'react-native';

import { EmptyState } from '@/components/visitors/empty-state';
import { ErrorBanner } from '@/components/visitors/error-banner';
import { SkeletonList } from '@/components/visitors/loading-state';
import { ScreenHeader } from '@/components/ui/screen-header';
import { isPollExpired } from '@/lib/community';
import { castVote, fetchPolls, fetchVotesForPolls } from '@/lib/community-api';
import { queryKeys } from '@/lib/query-client';
import { useAuthStore } from '@/stores/authStore';
import type { Poll, PollVote } from '@/types/database';

function pollStats(poll: Poll, votes: PollVote[]) {
  const pollVotes = votes.filter((v) => v.poll_id === poll.id);
  const total = pollVotes.length;
  const counts: Record<string, number> = {};
  for (const opt of poll.options) counts[opt] = 0;
  for (const v of pollVotes) {
    counts[v.option] = (counts[v.option] ?? 0) + 1;
  }
  return { total, counts };
}

export default function ResidentPollsScreen() {
  const profile = useAuthStore((s) => s.profile);
  const societyId = profile?.society_id;
  const userId = profile?.id;
  const queryClient = useQueryClient();

  const pollsQuery = useQuery({
    queryKey: queryKeys.polls(societyId ?? 'none'),
    queryFn: () => fetchPolls(societyId!),
    enabled: Boolean(societyId),
  });

  const pollIds = useMemo(() => (pollsQuery.data ?? []).map((p) => p.id), [pollsQuery.data]);

  const votesQuery = useQuery({
    queryKey: [...queryKeys.polls(societyId ?? 'none'), 'votes', pollIds.join(',')],
    queryFn: () => fetchVotesForPolls(pollIds),
    enabled: Boolean(societyId) && pollIds.length > 0,
  });

  const voteMutation = useMutation({
    mutationFn: (input: { pollId: string; option: string }) =>
      castVote({ pollId: input.pollId, userId: userId!, option: input.option }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.polls(societyId!) });
    },
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
    const locked = readOnly || Boolean(myVote) || voteMutation.isPending;

    return (
      <View className="rounded-2xl border border-slate-200 bg-white p-4">
        <Text className="mb-1 text-base font-semibold text-slate-900">{poll.question}</Text>
        <Text className="mb-3 text-xs text-slate-400">
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
                selected ? 'border-teal-700' : 'border-slate-200'
              }`}
            >
              <View
                className={`absolute bottom-0 left-0 top-0 ${
                  selected ? 'bg-teal-100' : 'bg-slate-100'
                }`}
                style={{ width: `${pct}%` }}
              />
              <View className="flex-row items-center justify-between px-3 py-3">
                <Text className="font-medium text-slate-800">{option}</Text>
                <Text className="text-sm text-slate-500">
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
          onRetry={() => void pollsQuery.refetch()}
        />
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
            <RefreshControl
              refreshing={pollsQuery.isRefetching || votesQuery.isRefetching}
              onRefresh={() => {
                void pollsQuery.refetch();
                void votesQuery.refetch();
              }}
              tintColor="#0F766E"
            />
          }
          ListEmptyComponent={
            <EmptyState visual="polls" title="No polls" subtitle="When admins publish a poll, it will show up here." />
          }
          ListHeaderComponent={
            voteMutation.isPending ? (
              <View className="mb-3 items-center">
                <ActivityIndicator color="#0F766E" />
              </View>
            ) : null
          }
          renderItem={({ item }) => renderPoll(item.poll, item.readOnly)}
        />
      )}
    </ScreenHeader>
  );
}

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';

import {
  PollAdminBreakdown,
  PollDetailHeader,
  PollOptionsPanel,
  PollPublishCard,
} from '@/components/polls/poll-card';
import { ScreenHeader } from '@/components/ui/screen-header';
import { ThemedRefreshControl } from '@/components/ui/themed-refresh-control';
import { EmptyState } from '@/components/visitors/empty-state';
import { ErrorBanner } from '@/components/visitors/error-banner';
import { Brand, FontFamily } from '@/constants/theme';
import {
  canPublishPoll,
  isPollExpired,
  isPollPublished,
  pollStats,
} from '@/lib/community';
import {
  fetchPoll,
  fetchPollVotesWithProfiles,
  fetchResidents,
  publishPollResults,
} from '@/lib/community-api';
import { queryKeys } from '@/lib/query-client';
import { useAuthStore } from '@/stores/authStore';

export default function AdminPollDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const pollId = typeof id === 'string' ? id : id?.[0] ?? '';
  const societyId = useAuthStore((s) => s.profile?.society_id);
  const queryClient = useQueryClient();

  const pollQuery = useQuery({
    queryKey: queryKeys.poll(pollId),
    queryFn: () => fetchPoll(pollId),
    enabled: Boolean(pollId),
  });

  const votesQuery = useQuery({
    queryKey: queryKeys.pollVotes(societyId ?? 'none', [pollId]),
    queryFn: () => fetchPollVotesWithProfiles([pollId]),
    enabled: Boolean(societyId && pollId),
  });

  const residentsQuery = useQuery({
    queryKey: queryKeys.residents(societyId ?? 'none'),
    queryFn: () => fetchResidents(societyId!),
    enabled: Boolean(societyId),
  });

  const poll = pollQuery.data;
  const votes = useMemo(() => votesQuery.data ?? [], [votesQuery.data]);
  const published = poll ? isPollPublished(poll) : false;
  const expired = poll ? isPollExpired(poll.expires_at) : false;

  const { total, counts } = useMemo(
    () => (poll ? pollStats(poll, votes) : { total: 0, counts: {} as Record<string, number> }),
    [poll, votes],
  );

  const optionVotes = useMemo(() => {
    const map: Record<string, typeof votes> = {};
    for (const opt of poll?.options ?? []) map[opt] = [];
    for (const v of votes) {
      if (!map[v.option]) map[v.option] = [];
      map[v.option].push(v);
    }
    return map;
  }, [poll?.options, votes]);

  const publishMutation = useMutation({
    mutationFn: () => publishPollResults(pollId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.poll(pollId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.polls(societyId ?? 'none') }),
        queryClient.invalidateQueries({ queryKey: queryKeys.pollOptionCounts(pollId) }),
      ]);
    },
  });

  const meta = poll
    ? expired
      ? poll.expires_at
        ? `Ended ${new Date(poll.expires_at).toLocaleString()}`
        : 'Ended'
      : poll.expires_at
        ? `Ends ${new Date(poll.expires_at).toLocaleString()}`
        : 'No expiry set'
    : undefined;

  if (!pollId) {
    return (
      <ScreenHeader title="Poll" showBack>
        <EmptyState visual="polls" title="Poll not found" subtitle="Go back to the polls list." />
      </ScreenHeader>
    );
  }

  return (
    <ScreenHeader title="Poll detail" showBack>
      {pollQuery.error ? (
        <ErrorBanner
          message={pollQuery.error.message}
          onRetry={() => void pollQuery.refetch()}
        />
      ) : null}
      {votesQuery.error ? (
        <ErrorBanner
          message={votesQuery.error.message}
          onRetry={() => void votesQuery.refetch()}
        />
      ) : null}
      {publishMutation.error ? (
        <ErrorBanner message={(publishMutation.error as Error).message} />
      ) : null}

      {pollQuery.isLoading && !poll ? (
        <View className="flex-1 items-center justify-center py-20">
          <ActivityIndicator color={Brand.primary} />
        </View>
      ) : !poll ? (
        <EmptyState visual="polls" title="Poll not found" subtitle="It may have been removed." />
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 120 }}
          refreshControl={
            <ThemedRefreshControl
              refreshing={
                pollQuery.isRefetching ||
                votesQuery.isRefetching ||
                residentsQuery.isRefetching
              }
              onRefresh={() => {
                void pollQuery.refetch();
                void votesQuery.refetch();
                void residentsQuery.refetch();
              }}
            />
          }
        >
          <PollDetailHeader poll={poll} meta={meta} />

          <Text
            className="mb-2 text-xs font-bold uppercase tracking-widest text-ink-muted"
            style={{ fontFamily: FontFamily.heading }}
          >
            Options
          </Text>

          <PollOptionsPanel
            options={poll.options}
            counts={counts}
            total={total}
            locked
            showTallies
            showVoters
            optionVotes={optionVotes}
          />

          <PollAdminBreakdown
            total={total}
            totalResidents={residentsQuery.data?.length}
            votes={votes}
            loading={votesQuery.isLoading && !votesQuery.data}
          />

          <PollPublishCard
            canPublish={canPublishPoll(poll)}
            published={published}
            publishing={publishMutation.isPending}
            onPublish={() => publishMutation.mutate()}
          />
        </ScrollView>
      )}
    </ScreenHeader>
  );
}

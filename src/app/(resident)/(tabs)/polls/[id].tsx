import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';

import {
  PollAwaitingResultsNote,
  PollDetailHeader,
  PollOptionsPanel,
} from '@/components/polls/poll-card';
import { ScreenHeader } from '@/components/ui/screen-header';
import { SuccessOverlay } from '@/components/ui/success-overlay';
import { ThemedRefreshControl } from '@/components/ui/themed-refresh-control';
import { EmptyState } from '@/components/visitors/empty-state';
import { ErrorBanner } from '@/components/visitors/error-banner';
import { Brand, FontFamily } from '@/constants/theme';
import { isPollExpired, isPollPublished } from '@/lib/community';
import {
  castVote,
  fetchMyVotesForPolls,
  fetchPoll,
  fetchPollOptionCounts,
} from '@/lib/community-api';
import { queryKeys } from '@/lib/query-client';
import { useAuthStore } from '@/stores/authStore';

export default function ResidentPollDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const pollId = typeof id === 'string' ? id : id?.[0] ?? '';
  const societyId = useAuthStore((s) => s.profile?.society_id);
  const queryClient = useQueryClient();
  const [successVisible, setSuccessVisible] = useState(false);

  const pollQuery = useQuery({
    queryKey: queryKeys.poll(pollId),
    queryFn: () => fetchPoll(pollId),
    enabled: Boolean(pollId),
  });

  const myVoteQuery = useQuery({
    queryKey: queryKeys.myPollVotes(societyId ?? 'none', [pollId]),
    queryFn: () => fetchMyVotesForPolls([pollId]),
    enabled: Boolean(societyId && pollId),
  });

  const poll = pollQuery.data;
  const published = poll ? isPollPublished(poll) : false;
  const expired = poll ? isPollExpired(poll.expires_at) : false;

  const countsQuery = useQuery({
    queryKey: queryKeys.pollOptionCounts(pollId),
    queryFn: () => fetchPollOptionCounts(pollId),
    enabled: Boolean(pollId && published),
  });

  const myVote = myVoteQuery.data?.[0]?.option ?? null;

  const { counts, total } = useMemo(() => {
    const map: Record<string, number> = {};
    for (const opt of poll?.options ?? []) map[opt] = 0;
    let sum = 0;
    for (const row of countsQuery.data ?? []) {
      map[row.option] = row.count;
      sum += row.count;
    }
    return { counts: map, total: sum };
  }, [countsQuery.data, poll?.options]);

  const voteMutation = useMutation({
    mutationFn: (option: string) => castVote({ pollId, option }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.myPollVotes(societyId ?? 'none', [pollId]) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.polls(societyId ?? 'none') }),
      ]);
      setSuccessVisible(true);
    },
  });

  const locked = expired || Boolean(myVote) || voteMutation.isPending;
  const showTallies = published;
  const meta = poll
    ? expired
      ? poll.expires_at
        ? `Ended ${new Date(poll.expires_at).toLocaleString()}`
        : 'Ended'
      : poll.expires_at
        ? `Ends ${new Date(poll.expires_at).toLocaleString()}`
        : 'No expiry'
    : undefined;

  if (!pollId) {
    return (
      <ScreenHeader title="Poll" showBack>
        <EmptyState visual="polls" title="Poll not found" subtitle="Go back to the polls list." />
      </ScreenHeader>
    );
  }

  return (
    <ScreenHeader title="Poll" showBack>
      {pollQuery.error ? (
        <ErrorBanner
          message={pollQuery.error.message}
          onRetry={() => void pollQuery.refetch()}
        />
      ) : null}
      {voteMutation.error ? (
        <ErrorBanner message={(voteMutation.error as Error).message} />
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
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 36 }}
          refreshControl={
            <ThemedRefreshControl
              refreshing={
                pollQuery.isRefetching ||
                myVoteQuery.isRefetching ||
                countsQuery.isRefetching
              }
              onRefresh={() => {
                void pollQuery.refetch();
                void myVoteQuery.refetch();
                if (published) void countsQuery.refetch();
              }}
            />
          }
        >
          <PollDetailHeader
            poll={poll}
            meta={[meta, myVote ? `You voted · ${myVote}` : null].filter(Boolean).join(' · ')}
          />

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
            myVote={myVote}
            locked={locked}
            showTallies={showTallies}
            voting={voteMutation.isPending}
            onVote={locked ? undefined : (option) => voteMutation.mutate(option)}
          />

          {expired && !published ? <PollAwaitingResultsNote /> : null}

          {published && total > 0 ? (
            <Text className="mt-3 text-center text-xs text-ink-faint">
              {total} total vote{total === 1 ? '' : 's'} · individual choices stay private
            </Text>
          ) : null}

          {!expired && !myVote ? (
            <Text className="mt-4 text-center text-xs text-ink-muted">
              Tap an option to cast your vote. Results stay private until published.
            </Text>
          ) : null}
        </ScrollView>
      )}

      <SuccessOverlay
        visible={successVisible}
        message="Vote cast"
        onDone={() => setSuccessVisible(false)}
      />
    </ScreenHeader>
  );
}

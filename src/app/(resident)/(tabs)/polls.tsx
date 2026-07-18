import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BarChart3, CheckCircle2, Vote } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Text, View } from 'react-native';

import {
  PollOptionRow,
  PollRespondentsList,
  PollShell,
} from '@/components/polls/poll-card';
import { EmptyState } from '@/components/visitors/empty-state';
import { ErrorBanner } from '@/components/visitors/error-banner';
import { SkeletonList } from '@/components/visitors/loading-state';
import { ScreenHeader } from '@/components/ui/screen-header';
import { ThemedRefreshControl } from '@/components/ui/themed-refresh-control';
import { SuccessOverlay } from '@/components/ui/success-overlay';
import { Brand, FontFamily, Pastels } from '@/constants/theme';
import { isPollExpired, pollStats } from '@/lib/community';
import { castVote, fetchPolls, fetchPollVotesWithProfiles } from '@/lib/community-api';
import { queryKeys } from '@/lib/query-client';
import { useAuthStore } from '@/stores/authStore';
import type { Poll } from '@/types/database';

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
    queryFn: () => fetchPollVotesWithProfiles(pollIds),
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
      await queryClient.refetchQueries({
        queryKey: [...queryKeys.polls(societyId), 'votes'],
      });
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
        <EmptyState
          visual="disconnected"
          title="No society linked"
          subtitle="Ask an admin to link your profile."
        />
      </ScreenHeader>
    );
  }

  const renderPoll = (poll: Poll, readOnly: boolean) => {
    const { total, counts } = pollStats(poll, votes);
    const myVote = myVotes.get(poll.id);
    const isVotingThisPoll = votingPollId === poll.id && voteMutation.isPending;
    const locked = readOnly || Boolean(myVote) || isVotingThisPoll;
    const pollVotes = votes.filter((v) => v.poll_id === poll.id);
    const showResults = Boolean(myVote) || readOnly;

    return (
      <PollShell accent={readOnly ? Pastels.peach : Pastels.mint}>
        <View className="mb-2 flex-row items-start justify-between gap-3">
          <Text
            className="min-w-0 flex-1 text-lg text-ink"
            style={{ fontFamily: FontFamily.display }}
          >
            {poll.question}
          </Text>
          <View
            className="rounded-pill px-2.5 py-1"
            style={{ backgroundColor: readOnly ? Pastels.peach : Brand.primarySoft }}
          >
            <Text
              className="text-[11px]"
              style={{
                color: readOnly ? Brand.accentDark : Brand.primaryDark,
                fontFamily: FontFamily.heading,
              }}
            >
              {readOnly ? 'Closed' : 'Open'}
            </Text>
          </View>
        </View>

        <Text className="mb-4 text-xs text-ink-faint">
          {readOnly
            ? 'Poll closed'
            : poll.expires_at
              ? `Closes ${new Date(poll.expires_at).toLocaleDateString()}`
              : 'No expiry'}
          {myVote ? ` · You voted ${myVote}` : ''}
          {showResults ? ` · ${total} vote${total === 1 ? '' : 's'}` : ''}
        </Text>

        {poll.options.map((option) => {
          const count = counts[option] ?? 0;
          const pct = total === 0 ? 0 : Math.round((count / total) * 100);
          const selected = myVote === option;
          const optionVotes = pollVotes.filter((v) => v.option === option);

          return (
            <PollOptionRow
              key={option}
              label={option}
              count={showResults ? count : 0}
              pct={showResults ? pct : 0}
              selected={selected}
              disabled={locked}
              votes={showResults ? optionVotes : []}
              showVoters={showResults}
              onPress={
                locked
                  ? undefined
                  : () => voteMutation.mutate({ pollId: poll.id, option })
              }
            />
          );
        })}

        {showResults ? (
          <PollRespondentsList
            votes={pollVotes}
            loading={votesQuery.isLoading && !votesQuery.data}
          />
        ) : (
          <Text className="mt-1 text-center text-xs text-ink-muted">
            Vote to see live results and who responded
          </Text>
        )}
      </PollShell>
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
          ItemSeparatorComponent={() => <View className="h-3.5" />}
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
                  tint: Brand.primary,
                  wash: Pastels.mint,
                },
                {
                  Icon: BarChart3,
                  title: 'See live results',
                  body: 'Bars and percentages update as neighbours vote.',
                  tint: Brand.accent,
                  wash: Pastels.peach,
                },
                {
                  Icon: CheckCircle2,
                  title: 'One vote per poll',
                  body: 'After you vote, the poll locks so results stay fair.',
                  tint: '#1F3A6B',
                  wash: Pastels.sky,
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

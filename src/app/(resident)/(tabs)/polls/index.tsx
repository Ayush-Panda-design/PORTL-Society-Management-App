import { useQuery } from '@tanstack/react-query';
import { useRouter, type Href } from 'expo-router';
import { Vote } from 'lucide-react-native';
import { useMemo } from 'react';
import { FlatList, Text, View } from 'react-native';

import { PollListRow } from '@/components/polls/poll-card';
import { ScreenHeader } from '@/components/ui/screen-header';
import { ThemedRefreshControl } from '@/components/ui/themed-refresh-control';
import { EmptyState } from '@/components/visitors/empty-state';
import { ErrorBanner } from '@/components/visitors/error-banner';
import { SkeletonList } from '@/components/visitors/loading-state';
import { Brand, FontFamily, Pastels } from '@/constants/theme';
import { isPollExpired } from '@/lib/community';
import { fetchMyVotesForPolls, fetchPolls } from '@/lib/community-api';
import { queryKeys } from '@/lib/query-client';
import { useAuthStore } from '@/stores/authStore';
import type { Poll } from '@/types/database';

function SectionLabel({ title }: { title: string }) {
  return (
    <Text
      className="mb-2 mt-1 text-xs font-bold uppercase tracking-widest text-ink-muted"
      style={{ fontFamily: FontFamily.heading }}
    >
      {title}
    </Text>
  );
}

function pollMeta(poll: Poll): string {
  if (poll.results_published_at) return 'Results available';
  if (isPollExpired(poll.expires_at)) return 'Awaiting publish';
  if (poll.expires_at) {
    return `Ends ${new Date(poll.expires_at).toLocaleDateString(undefined, {
      day: 'numeric',
      month: 'short',
    })}`;
  }
  return 'Open';
}

export default function ResidentPollsScreen() {
  const router = useRouter();
  const societyId = useAuthStore((s) => s.profile?.society_id);
  const userId = useAuthStore((s) => s.user?.id);

  const pollsQuery = useQuery({
    queryKey: queryKeys.polls(societyId ?? 'none'),
    queryFn: () => fetchPolls(societyId!),
    enabled: Boolean(societyId),
  });

  const pollIds = useMemo(
    () => (pollsQuery.data ?? []).map((p) => p.id).sort(),
    [pollsQuery.data],
  );

  const myVotesQuery = useQuery({
    queryKey: queryKeys.myPollVotes(societyId ?? 'none', userId ?? 'none', pollIds),
    queryFn: () => fetchMyVotesForPolls(pollIds),
    enabled: Boolean(societyId && userId && pollIds.length > 0),
  });

  const votedPollIds = useMemo(() => {
    const set = new Set<string>();
    for (const vote of myVotesQuery.data ?? []) set.add(vote.poll_id);
    return set;
  }, [myVotesQuery.data]);

  const { active, ended } = useMemo(() => {
    const list = pollsQuery.data ?? [];
    return {
      active: list.filter((p) => !isPollExpired(p.expires_at)),
      ended: list.filter((p) => isPollExpired(p.expires_at)),
    };
  }, [pollsQuery.data]);

  const rows = useMemo(() => {
    const items: { type: 'header' | 'poll'; title?: string; poll?: Poll }[] = [];
    if (active.length > 0) {
      items.push({ type: 'header', title: 'Open now' });
      for (const poll of active) items.push({ type: 'poll', poll });
    }
    if (ended.length > 0) {
      items.push({ type: 'header', title: 'Ended' });
      for (const poll of ended) items.push({ type: 'poll', poll });
    }
    return items;
  }, [active, ended]);

  if (!societyId) {
    return (
      <ScreenHeader title="Polls" subtitle="Community voting" showBack>
        <EmptyState
          visual="disconnected"
          title="No society linked"
          subtitle="Ask an admin to link your profile."
        />
      </ScreenHeader>
    );
  }

  return (
    <ScreenHeader title="Polls" subtitle="Tap a question to vote" showBack>
      {pollsQuery.error ? (
        <ErrorBanner
          message={pollsQuery.error.message}
          onRetry={() => void pollsQuery.refetch()}
        />
      ) : null}

      {pollsQuery.isLoading && !pollsQuery.data ? (
        <SkeletonList count={4} />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(item, index) =>
            item.type === 'header' ? `h-${item.title}-${index}` : item.poll!.id
          }
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 28, flexGrow: 1 }}
          ItemSeparatorComponent={() => <View className="h-2.5" />}
          refreshControl={
            <ThemedRefreshControl
              refreshing={pollsQuery.isRefetching || myVotesQuery.isRefetching}
              onRefresh={() => {
                void pollsQuery.refetch();
                void myVotesQuery.refetch();
              }}
            />
          }
          ListEmptyComponent={
            <EmptyState
              visual="polls"
              title="No polls yet"
              subtitle="When your society posts a poll, it will show up here."
              tips={[
                {
                  Icon: Vote,
                  title: 'Private by default',
                  body: 'Others never see how you voted — only published tallies.',
                  tint: Brand.primary,
                  wash: Pastels.mint,
                },
              ]}
            />
          }
          renderItem={({ item }) => {
            if (item.type === 'header') {
              return <SectionLabel title={item.title!} />;
            }
            const poll = item.poll!;
            return (
              <PollListRow
                poll={poll}
                subtitle={pollMeta(poll)}
                voted={votedPollIds.has(poll.id)}
                onPress={() =>
                  router.push(`/(resident)/polls/${poll.id}` as Href)
                }
              />
            );
          }}
        />
      )}
    </ScreenHeader>
  );
}

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, Text, View } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';

import { PollCreateForm } from '@/components/polls/poll-create-form';
import { ThemedRefreshControl } from '@/components/ui/themed-refresh-control';
import { EmptyState } from '@/components/visitors/empty-state';
import { ErrorBanner } from '@/components/visitors/error-banner';
import { SkeletonList } from '@/components/visitors/loading-state';
import { ScreenHeader } from '@/components/ui/screen-header';
import { isPollExpired, pollRespondentLabel, pollStats } from '@/lib/community';
import {
  createPoll,
  fetchPolls,
  fetchPollVotesWithProfiles,
  fetchResidents,
} from '@/lib/community-api';
import { queryKeys } from '@/lib/query-client';
import { useAuthStore } from '@/stores/authStore';
import type { Poll, PollVoteWithProfile } from '@/types/database';

export default function AdminPollsScreen() {
  const profile = useAuthStore((s) => s.profile);
  const societyId = profile?.society_id;
  const userId = profile?.id;
  const queryClient = useQueryClient();

  const [modalOpen, setModalOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

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

  const residentsQuery = useQuery({
    queryKey: queryKeys.residents(societyId ?? 'none'),
    queryFn: () => fetchResidents(societyId!),
    enabled: Boolean(societyId),
  });

  const createMutation = useMutation({
    mutationFn: async (input: { question: string; options: string[]; expiresAt: string | null }) => {
      if (!societyId || !userId) throw new Error('Admin profile missing society.');
      await createPoll({
        societyId,
        question: input.question,
        options: input.options,
        expiresAt: input.expiresAt,
        createdBy: userId,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.polls(societyId!) });
      setModalOpen(false);
      setFormError(null);
    },
    onError: (e: Error) => setFormError(e.message),
  });

  if (!societyId) {
    return (
      <ScreenHeader title="Polls" showBack>
        <EmptyState visual="disconnected" title="No society linked" subtitle="Assign a society to your admin profile." />
      </ScreenHeader>
    );
  }

  const votes = votesQuery.data ?? [];
  const totalResidents = residentsQuery.data?.length ?? 0;

  const renderRespondents = (poll: Poll, pollVotes: PollVoteWithProfile[]) => {
    if (pollVotes.length === 0) {
      return (
        <Text className="text-sm text-slate-400">No responses yet.</Text>
      );
    }

    return pollVotes.map((vote) => (
      <View
        key={vote.id}
        className="flex-row items-start justify-between border-t border-slate-100 py-2"
      >
        <Text className="mr-3 flex-1 text-sm text-slate-700">{pollRespondentLabel(vote)}</Text>
        <Text className="text-sm font-medium text-teal-800">{vote.option}</Text>
      </View>
    ));
  };

  return (
    <ScreenHeader
      title="Polls"
      subtitle="Create polls and view results"
      showBack
      right={
        <Pressable
          onPress={() => {
            setFormError(null);
            setModalOpen(true);
          }}
          className="h-10 w-10 items-center justify-center rounded-full bg-teal-700"
        >
          <Plus color="#fff" size={20} />
        </Pressable>
      }
    >
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
        <ErrorBanner
          message={votesQuery.error.message}
          onRetry={() => void votesQuery.refetch()}
        />
      ) : null}

      {pollsQuery.isLoading && !pollsQuery.data ? (
        <SkeletonList count={3} />
      ) : (
        <FlatList
          data={pollsQuery.data ?? []}
          keyExtractor={(item) => item.id}
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
            <EmptyState visual="polls" title="No polls yet" subtitle="Tap + to create a poll for residents." />
          }
          renderItem={({ item }) => {
            const { total, counts } = pollStats(item, votes);
            const pollRespondents = votes.filter((v) => v.poll_id === item.id);
            const expired = isPollExpired(item.expires_at);
            const participation =
              totalResidents > 0
                ? `${total} of ${totalResidents} resident${totalResidents === 1 ? '' : 's'} responded`
                : `${total} response${total === 1 ? '' : 's'}`;

            return (
              <View className="rounded-2xl border border-slate-200 bg-surface-card p-4">
                <Text className="mb-1 text-base font-semibold text-slate-900">{item.question}</Text>
                <Text className="mb-1 text-xs text-slate-400">
                  {expired ? 'Expired' : 'Active'}
                  {item.expires_at
                    ? ` · ends ${new Date(item.expires_at).toLocaleString()}`
                    : ''}
                </Text>
                <Text className="mb-3 text-sm font-medium text-slate-600">{participation}</Text>
                {item.options.map((option) => {
                  const count = counts[option] ?? 0;
                  const pct = total === 0 ? 0 : Math.round((count / total) * 100);
                  return (
                    <View key={option} className="mb-2 overflow-hidden rounded-xl border border-slate-200">
                      <View
                        pointerEvents="none"
                        className="absolute bottom-0 left-0 top-0 bg-teal-100"
                        style={{ width: `${pct}%` }}
                      />
                      <View className="flex-row justify-between px-3 py-2.5">
                        <Text className="text-slate-800">{option}</Text>
                        <Text className="text-slate-500">
                          {pct}% ({count})
                        </Text>
                      </View>
                    </View>
                  );
                })}
                <View className="mt-3 rounded-xl bg-slate-50 px-3 py-2">
                  <Text className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Who responded
                  </Text>
                  {renderRespondents(item, pollRespondents)}
                </View>
              </View>
            );
          }}
        />
      )}

      <Modal visible={modalOpen} animationType="slide" transparent onRequestClose={() => setModalOpen(false)}>
        {modalOpen ? (
          <KeyboardAvoidingView behavior="padding" className="flex-1 justify-end bg-black/40">
            <PollCreateForm
              error={formError}
              isSubmitting={createMutation.isPending}
              onCancel={() => setModalOpen(false)}
              onSubmit={(input) => createMutation.mutate(input)}
            />
          </KeyboardAvoidingView>
        ) : null}
      </Modal>
    </ScreenHeader>
  );
}

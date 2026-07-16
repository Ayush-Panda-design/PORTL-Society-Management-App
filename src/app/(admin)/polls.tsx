import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, Text, View } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';

import { PollCreateForm } from '@/components/polls/poll-create-form';
import { EmptyState } from '@/components/visitors/empty-state';
import { ErrorBanner } from '@/components/visitors/error-banner';
import { SkeletonList } from '@/components/visitors/loading-state';
import { ScreenHeader } from '@/components/ui/screen-header';
import { isPollExpired } from '@/lib/community';
import { createPoll, fetchPolls, fetchVotesForPolls } from '@/lib/community-api';
import { queryKeys } from '@/lib/query-client';
import { useAuthStore } from '@/stores/authStore';
import type { Poll, PollVote } from '@/types/database';

function pollStats(poll: Poll, votes: PollVote[]) {
  const pollVotes = votes.filter((v) => v.poll_id === poll.id);
  const total = pollVotes.length;
  const counts: Record<string, number> = {};
  for (const opt of poll.options) counts[opt] = 0;
  for (const v of pollVotes) counts[v.option] = (counts[v.option] ?? 0) + 1;
  return { total, counts };
}

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
    queryKey: [...queryKeys.polls(societyId ?? 'none'), 'votes', pollIds.join(',')],
    queryFn: () => fetchVotesForPolls(pollIds),
    enabled: pollIds.length > 0,
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
          onRetry={() => void pollsQuery.refetch()}
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
          refreshing={pollsQuery.isRefetching}
          onRefresh={() => void pollsQuery.refetch()}
          ListEmptyComponent={
            <EmptyState visual="polls" title="No polls yet" subtitle="Tap + to create a poll for residents." />
          }
          renderItem={({ item }) => {
            const { total, counts } = pollStats(item, votes);
            const expired = isPollExpired(item.expires_at);
            return (
              <View className="rounded-2xl border border-slate-200 bg-white p-4">
                <Text className="mb-1 text-base font-semibold text-slate-900">{item.question}</Text>
                <Text className="mb-3 text-xs text-slate-400">
                  {expired ? 'Expired' : 'Active'} · {total} vote{total === 1 ? '' : 's'}
                  {item.expires_at
                    ? ` · ends ${new Date(item.expires_at).toLocaleString()}`
                    : ''}
                </Text>
                {item.options.map((option) => {
                  const count = counts[option] ?? 0;
                  const pct = total === 0 ? 0 : Math.round((count / total) * 100);
                  return (
                    <View key={option} className="mb-2 overflow-hidden rounded-xl border border-slate-200">
                      <View className="absolute bottom-0 left-0 top-0 bg-teal-100" style={{ width: `${pct}%` }} />
                      <View className="flex-row justify-between px-3 py-2.5">
                        <Text className="text-slate-800">{option}</Text>
                        <Text className="text-slate-500">
                          {pct}% ({count})
                        </Text>
                      </View>
                    </View>
                  );
                })}
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

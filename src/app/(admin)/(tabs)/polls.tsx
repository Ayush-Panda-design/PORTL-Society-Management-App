import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, Text, View } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';

import {
  PollOptionRow,
  PollRespondentsList,
  PollShell,
} from '@/components/polls/poll-card';
import { PollCreateForm } from '@/components/polls/poll-create-form';
import { ThemedRefreshControl } from '@/components/ui/themed-refresh-control';
import { EmptyState } from '@/components/visitors/empty-state';
import { ErrorBanner } from '@/components/visitors/error-banner';
import { SkeletonList } from '@/components/visitors/loading-state';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Brand, FontFamily, Pastels } from '@/constants/theme';
import { isPollExpired, pollStats } from '@/lib/community';
import {
  createPoll,
  fetchPolls,
  fetchPollVotesWithProfiles,
  fetchResidents,
} from '@/lib/community-api';
import { queryKeys } from '@/lib/query-client';
import { useAuthStore } from '@/stores/authStore';

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
        <EmptyState
          visual="disconnected"
          title="No society linked"
          subtitle="Assign a society to your admin profile."
        />
      </ScreenHeader>
    );
  }

  const votes = votesQuery.data ?? [];
  const totalResidents = residentsQuery.data?.length ?? 0;

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
          className="h-10 w-10 items-center justify-center rounded-full bg-brand-700"
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
              title="No polls yet"
              subtitle="Create a poll to collect community opinion."
              actionLabel="+ Create poll"
              onAction={() => {
                setFormError(null);
                setModalOpen(true);
              }}
            />
          }
          renderItem={({ item }) => {
            const { total, counts } = pollStats(item, votes);
            const pollRespondents = votes.filter((v) => v.poll_id === item.id);
            const expired = isPollExpired(item.expires_at);
            const participationPct =
              totalResidents > 0 ? Math.round((total / totalResidents) * 100) : null;

            return (
              <PollShell accent={expired ? Pastels.peach : Pastels.mint}>
                <View className="mb-3 flex-row items-start justify-between gap-3">
                  <Text
                    className="min-w-0 flex-1 text-lg text-ink"
                    style={{ fontFamily: FontFamily.display }}
                  >
                    {item.question}
                  </Text>
                  <View
                    className="rounded-pill px-2.5 py-1"
                    style={{ backgroundColor: expired ? Pastels.peach : Brand.primarySoft }}
                  >
                    <Text
                      className="text-[11px]"
                      style={{
                        color: expired ? Brand.accentDark : Brand.primaryDark,
                        fontFamily: FontFamily.heading,
                      }}
                    >
                      {expired ? 'Closed' : 'Live'}
                    </Text>
                  </View>
                </View>

                <Text className="mb-1 text-xs text-ink-faint">
                  {item.expires_at
                    ? `${expired ? 'Ended' : 'Ends'} ${new Date(item.expires_at).toLocaleString()}`
                    : 'No expiry set'}
                </Text>

                <View className="mb-4 flex-row items-end gap-2">
                  <Text
                    className="text-2xl text-ink"
                    style={{ fontFamily: FontFamily.display }}
                  >
                    {total}
                  </Text>
                  <Text className="mb-1 text-sm text-ink-muted">
                    {totalResidents > 0
                      ? `of ${totalResidents} residents${
                          participationPct != null ? ` · ${participationPct}%` : ''
                        }`
                      : `response${total === 1 ? '' : 's'}`}
                  </Text>
                </View>

                {item.options.map((option) => {
                  const count = counts[option] ?? 0;
                  const pct = total === 0 ? 0 : Math.round((count / total) * 100);
                  const optionVotes = pollRespondents.filter((v) => v.option === option);
                  return (
                    <PollOptionRow
                      key={option}
                      label={option}
                      count={count}
                      pct={pct}
                      votes={optionVotes}
                      showVoters
                    />
                  );
                })}

                <PollRespondentsList
                  votes={pollRespondents}
                  loading={votesQuery.isLoading && !votesQuery.data}
                />
              </PollShell>
            );
          }}
        />
      )}

      <Modal
        visible={modalOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setModalOpen(false)}
      >
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

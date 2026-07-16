import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2 } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';

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
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState<string[]>(['', '']);
  const [expiresLocal, setExpiresLocal] = useState('');
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
    mutationFn: async () => {
      if (!societyId || !userId) throw new Error('Admin profile missing society.');
      const cleaned = options.map((o) => o.trim()).filter(Boolean);
      if (!question.trim()) throw new Error('Question is required.');
      if (cleaned.length < 2) throw new Error('Add at least two options.');

      let expiresAt: string | null = null;
      if (expiresLocal.trim()) {
        const parsed = new Date(expiresLocal.trim());
        if (Number.isNaN(parsed.getTime())) {
          throw new Error('Expiry must be a valid date, e.g. 2026-12-31 or 2026-12-31T18:00');
        }
        expiresAt = parsed.toISOString();
      }

      await createPoll({
        societyId,
        question: question.trim(),
        options: cleaned,
        expiresAt,
        createdBy: userId,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.polls(societyId!) });
      setModalOpen(false);
      setQuestion('');
      setOptions(['', '']);
      setExpiresLocal('');
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

      <Modal visible={modalOpen} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior="padding"
          className="flex-1 justify-end bg-black/40"
        >
          <View className="max-h-[90%] rounded-t-3xl bg-white px-5 pb-10 pt-5">
            <Text className="mb-4 text-xl font-bold text-slate-900">New poll</Text>
            {formError ? <Text className="mb-2 text-sm text-red-600">{formError}</Text> : null}

            <TextInput
              className="mb-3 rounded-xl border border-slate-200 px-4 py-3 text-base text-slate-900"
              placeholder="Question"
              placeholderTextColor="#94A3B8"
              value={question}
              onChangeText={setQuestion}
            />

            <Text className="mb-2 text-sm font-medium text-slate-700">Options</Text>
            {options.map((opt, index) => (
              <View key={index} className="mb-2 flex-row items-center gap-2">
                <TextInput
                  className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-base text-slate-900"
                  placeholder={`Option ${index + 1}`}
                  placeholderTextColor="#94A3B8"
                  value={opt}
                  onChangeText={(text) => {
                    const next = [...options];
                    next[index] = text;
                    setOptions(next);
                  }}
                />
                {options.length > 2 ? (
                  <Pressable
                    onPress={() => setOptions(options.filter((_, i) => i !== index))}
                    className="h-10 w-10 items-center justify-center rounded-full bg-slate-100"
                  >
                    <Trash2 color="#64748B" size={16} />
                  </Pressable>
                ) : null}
              </View>
            ))}

            <Pressable
              onPress={() => setOptions((prev) => [...prev, ''])}
              className="mb-3 items-center rounded-xl border border-dashed border-slate-300 py-2.5"
            >
              <Text className="font-semibold text-teal-700">Add option</Text>
            </Pressable>

            <Text className="mb-2 text-sm font-medium text-slate-700">
              Expiry (optional, e.g. 2026-12-31T20:00)
            </Text>
            <TextInput
              className="mb-4 rounded-xl border border-slate-200 px-4 py-3 text-base text-slate-900"
              placeholder="Leave blank for no expiry"
              placeholderTextColor="#94A3B8"
              autoCapitalize="none"
              value={expiresLocal}
              onChangeText={setExpiresLocal}
            />

            <View className="flex-row gap-2">
              <Pressable
                onPress={() => setModalOpen(false)}
                className="flex-1 items-center rounded-xl border border-slate-200 py-3"
              >
                <Text className="font-semibold text-slate-700">Cancel</Text>
              </Pressable>
              <Pressable
                onPress={() => createMutation.mutate()}
                disabled={createMutation.isPending}
                className="flex-1 items-center rounded-xl bg-teal-700 py-3"
              >
                {createMutation.isPending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text className="font-semibold text-white">Create</Text>
                )}
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </ScreenHeader>
  );
}

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter, type Href } from 'expo-router';
import { Plus } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, Text, View } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';

import { PollCreateForm } from '@/components/polls/poll-create-form';
import { PollListRow } from '@/components/polls/poll-card';
import { ScreenHeader } from '@/components/ui/screen-header';
import { ThemedRefreshControl } from '@/components/ui/themed-refresh-control';
import { EmptyState } from '@/components/visitors/empty-state';
import { ErrorBanner } from '@/components/visitors/error-banner';
import { SkeletonList } from '@/components/visitors/loading-state';
import { FontFamily } from '@/constants/theme';
import { isPollExpired } from '@/lib/community';
import { createPoll, fetchPolls } from '@/lib/community-api';
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
  if (poll.results_published_at) return 'Results published';
  if (isPollExpired(poll.expires_at)) return 'Ready to publish';
  if (poll.expires_at) {
    return `Ends ${new Date(poll.expires_at).toLocaleDateString(undefined, {
      day: 'numeric',
      month: 'short',
    })}`;
  }
  return 'Open · set an end date to publish later';
}

export default function AdminPollsScreen() {
  const router = useRouter();
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
      items.push({ type: 'header', title: 'Live' });
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
      <ScreenHeader title="Polls" showBack>
        <EmptyState
          visual="disconnected"
          title="No society linked"
          subtitle="Assign a society to your admin profile."
        />
      </ScreenHeader>
    );
  }

  return (
    <ScreenHeader
      title="Polls"
      subtitle="Create polls · review privately · publish tallies"
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
              refreshing={pollsQuery.isRefetching}
              onRefresh={() => void pollsQuery.refetch()}
            />
          }
          ListEmptyComponent={
            <EmptyState
              visual="polls"
              title="No polls yet"
              subtitle="Create a poll to collect community opinion privately."
              actionLabel="+ Create poll"
              onAction={() => {
                setFormError(null);
                setModalOpen(true);
              }}
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
                onPress={() => router.push(`/(admin)/polls/${poll.id}` as Href)}
              />
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

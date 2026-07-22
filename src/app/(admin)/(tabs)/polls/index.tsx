import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter, type Href } from 'expo-router';
import { Plus } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Modal, SectionList, Text, View } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FloatingActionBtn } from '@/components/ui/brand';
import { PollCreateForm } from '@/components/polls/poll-create-form';
import { PollListRow } from '@/components/polls/poll-card';
import { ScreenHeader } from '@/components/ui/screen-header';
import { ThemedRefreshControl } from '@/components/ui/themed-refresh-control';
import { EmptyState } from '@/components/visitors/empty-state';
import { ErrorBanner } from '@/components/visitors/error-banner';
import { SkeletonList } from '@/components/visitors/loading-state';
import { FontFamily, TypeScale } from '@/constants/theme';
import { useModalBack } from '@/hooks/use-modal-back';
import { useThemePalette } from '@/hooks/use-theme';
import { canPublishPoll, isPollExpired } from '@/lib/community';
import { createPoll, fetchPolls } from '@/lib/community-api';
import { queryKeys } from '@/lib/query-client';
import { useAuthStore } from '@/stores/authStore';
import type { Poll } from '@/types/database';

type PollSection = {
  title: string;
  data: Poll[];
};

function pollMeta(poll: Poll): string {
  if (poll.results_published_at) return 'Results published';
  if (canPublishPoll(poll)) return 'Ready to publish';
  if (isPollExpired(poll.expires_at)) return 'Ended';
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
  const insets = useSafeAreaInsets();
  const profile = useAuthStore((s) => s.profile);
  const societyId = profile?.society_id;
  const userId = profile?.id;
  const queryClient = useQueryClient();
  const palette = useThemePalette();

  const [modalOpen, setModalOpen] = useState(false);
  useModalBack(modalOpen, () => setModalOpen(false));
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

  const sections = useMemo((): PollSection[] => {
    const list = pollsQuery.data ?? [];
    const needsPublish = list.filter((p) => canPublishPoll(p));
    const active = list.filter((p) => !isPollExpired(p.expires_at));
    const ended = list.filter(
      (p) => isPollExpired(p.expires_at) && !canPublishPoll(p),
    );

    const out: PollSection[] = [];
    if (needsPublish.length > 0) {
      out.push({ title: 'Needs action', data: needsPublish });
    }
    if (active.length > 0) {
      out.push({ title: 'Live', data: active });
    }
    if (ended.length > 0) {
      out.push({ title: 'Ended', data: ended });
    }
    return out;
  }, [pollsQuery.data]);

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
    <ScreenHeader title="Polls" subtitle="Create polls · review privately · publish tallies" showBack>
      {pollsQuery.error ? (
        <ErrorBanner
          message={pollsQuery.error.message}
          onRetry={() => void pollsQuery.refetch()}
        />
      ) : null}

      {pollsQuery.isLoading && !pollsQuery.data ? (
        <SkeletonList count={4} />
      ) : (
        <View className="flex-1">
          <SectionList
            sections={sections}
            keyExtractor={(item) => item.id}
            stickySectionHeadersEnabled
            contentContainerStyle={{
              paddingHorizontal: 16,
              paddingBottom: 96 + Math.max(insets.bottom, 8),
              flexGrow: 1,
            }}
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
            renderSectionHeader={({ section }) => (
              <View className="mb-2 mt-1 bg-surface px-1 py-1.5">
                <Text
                  className="uppercase tracking-widest"
                  style={{
                    fontFamily: FontFamily.heading,
                    fontSize: TypeScale.label,
                    color:
                      section.title === 'Needs action'
                        ? palette.primaryAccent
                        : palette.inkSoft,
                  }}
                >
                  {section.title}
                </Text>
              </View>
            )}
            renderItem={({ item }) => (
              <PollListRow
                poll={item}
                subtitle={pollMeta(item)}
                needsAction={canPublishPoll(item)}
                onPress={() => router.push(`/(admin)/polls/${item.id}` as Href)}
              />
            )}
          />

          <FloatingActionBtn
            onPress={() => {
              setFormError(null);
              setModalOpen(true);
            }}
            icon={<Plus color="#fff" size={22} strokeWidth={2} />}
            label="New poll"
            tone="primary"
          />
        </View>
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

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Plus } from 'lucide-react-native';

import { EmptyState } from '@/components/visitors/empty-state';
import { ErrorBanner } from '@/components/visitors/error-banner';
import { SkeletonList } from '@/components/visitors/loading-state';
import { ScreenHeader } from '@/components/ui/screen-header';
import { deleteNotice, fetchNotices, upsertNotice } from '@/lib/community-api';
import { formatNoticeDate } from '@/lib/community';
import { queryKeys } from '@/lib/query-client';
import { useAuthStore } from '@/stores/authStore';
import { useCommunityUiStore } from '@/stores/communityUiStore';
import type { Notice } from '@/types/database';

export default function AdminNoticesScreen() {
  const profile = useAuthStore((s) => s.profile);
  const societyId = profile?.society_id;
  const userId = profile?.id;
  const queryClient = useQueryClient();
  const editingNoticeId = useCommunityUiStore((s) => s.editingNoticeId);
  const setEditingNoticeId = useCommunityUiStore((s) => s.setEditingNoticeId);

  const [modalOpen, setModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: queryKeys.notices(societyId ?? 'none'),
    queryFn: () => fetchNotices(societyId!),
    enabled: Boolean(societyId),
  });

  const editing = useMemo(
    () => data?.find((n) => n.id === editingNoticeId) ?? null,
    [data, editingNoticeId],
  );

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!societyId || !userId) throw new Error('Admin profile missing society.');
      if (!title.trim() || !body.trim()) throw new Error('Title and body are required.');
      await upsertNotice({
        id: editingNoticeId ?? undefined,
        societyId,
        title: title.trim(),
        body: body.trim(),
        postedBy: userId,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.notices(societyId!) });
      closeModal();
    },
    onError: (e: Error) => setFormError(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteNotice(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.notices(societyId!) });
    },
  });

  const openCreate = () => {
    setEditingNoticeId(null);
    setTitle('');
    setBody('');
    setFormError(null);
    setModalOpen(true);
  };

  const openEdit = (notice: Notice) => {
    setEditingNoticeId(notice.id);
    setTitle(notice.title);
    setBody(notice.body);
    setFormError(null);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingNoticeId(null);
    setFormError(null);
  };

  if (!societyId) {
    return (
      <ScreenHeader title="Notices" subtitle="Manage announcements">
        <EmptyState title="No society linked" subtitle="Assign a society to your admin profile." />
      </ScreenHeader>
    );
  }

  return (
    <ScreenHeader
      title="Notices"
      subtitle="Create and manage announcements"
      right={
        <Pressable
          onPress={openCreate}
          className="h-10 w-10 items-center justify-center rounded-full bg-teal-700"
        >
          <Plus color="#fff" size={20} />
        </Pressable>
      }
    >
      {error ? <ErrorBanner message={error.message} onRetry={() => void refetch()} /> : null}
      {deleteMutation.error ? (
        <ErrorBanner message={(deleteMutation.error as Error).message} />
      ) : null}

      {isLoading && !data ? (
        <SkeletonList count={3} />
      ) : (
        <FlatList
          data={data ?? []}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24, flexGrow: 1 }}
          ItemSeparatorComponent={() => <View className="h-3" />}
          refreshing={isRefetching}
          onRefresh={() => void refetch()}
          ListEmptyComponent={
            <EmptyState title="No notices" subtitle="Tap + to post the first society notice." />
          }
          renderItem={({ item }) => (
            <View className="rounded-2xl border border-slate-200 bg-white p-4">
              <Text className="mb-1 text-base font-semibold text-slate-900">{item.title}</Text>
              <Text className="mb-3 text-sm text-slate-600">{item.body}</Text>
              <Text className="mb-3 text-xs text-slate-400">
                {formatNoticeDate(item.created_at)}
              </Text>
              <View className="flex-row gap-2">
                <Pressable
                  onPress={() => openEdit(item)}
                  className="flex-1 items-center rounded-xl border border-slate-200 py-2.5"
                >
                  <Text className="text-sm font-semibold text-slate-700">Edit</Text>
                </Pressable>
                <Pressable
                  onPress={() => deleteMutation.mutate(item.id)}
                  className="flex-1 items-center rounded-xl bg-red-50 py-2.5"
                >
                  <Text className="text-sm font-semibold text-red-700">Delete</Text>
                </Pressable>
              </View>
            </View>
          )}
        />
      )}

      <Modal visible={modalOpen} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          className="flex-1 justify-end bg-black/40"
        >
          <View className="rounded-t-3xl bg-white px-5 pb-10 pt-5">
            <Text className="mb-4 text-xl font-bold text-slate-900">
              {editing ? 'Edit notice' : 'New notice'}
            </Text>
            {formError ? <Text className="mb-2 text-sm text-red-600">{formError}</Text> : null}
            <TextInput
              className="mb-3 rounded-xl border border-slate-200 px-4 py-3 text-base text-slate-900"
              placeholder="Title"
              placeholderTextColor="#94A3B8"
              value={title}
              onChangeText={setTitle}
            />
            <TextInput
              className="mb-4 min-h-[120px] rounded-xl border border-slate-200 px-4 py-3 text-base text-slate-900"
              placeholder="Body"
              placeholderTextColor="#94A3B8"
              multiline
              textAlignVertical="top"
              value={body}
              onChangeText={setBody}
            />
            <View className="flex-row gap-2">
              <Pressable
                onPress={closeModal}
                className="flex-1 items-center rounded-xl border border-slate-200 py-3"
              >
                <Text className="font-semibold text-slate-700">Cancel</Text>
              </Pressable>
              <Pressable
                onPress={() => saveMutation.mutate()}
                disabled={saveMutation.isPending}
                className="flex-1 items-center rounded-xl bg-teal-700 py-3"
              >
                {saveMutation.isPending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text className="font-semibold text-white">Save</Text>
                )}
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </ScreenHeader>
  );
}

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { ImagePlus, Plus, X } from 'lucide-react-native';
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

import { AppCard } from '@/components/ui/brand';
import { ScreenHeader } from '@/components/ui/screen-header';
import { EmptyState } from '@/components/visitors/empty-state';
import { ErrorBanner } from '@/components/visitors/error-banner';
import { SkeletonList } from '@/components/visitors/loading-state';
import { Brand } from '@/constants/theme';
import { formatNoticeDate } from '@/lib/community';
import { deleteNotice, fetchNotices, uploadNoticeCover, upsertNotice } from '@/lib/community-api';
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
  const [coverUri, setCoverUri] = useState<string | null>(null);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
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

      let nextCover = coverUrl;
      if (coverUri && !coverUri.startsWith('http')) {
        nextCover = (await uploadNoticeCover(societyId, coverUri)) ?? coverUrl;
      }

      await upsertNotice({
        id: editingNoticeId ?? undefined,
        societyId,
        title: title.trim(),
        body: body.trim(),
        postedBy: userId,
        coverUrl: nextCover,
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
    setCoverUri(null);
    setCoverUrl(null);
    setFormError(null);
    setModalOpen(true);
  };

  const openEdit = (notice: Notice) => {
    setEditingNoticeId(notice.id);
    setTitle(notice.title);
    setBody(notice.body);
    setCoverUri(notice.cover_url ?? null);
    setCoverUrl(notice.cover_url ?? null);
    setFormError(null);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingNoticeId(null);
    setFormError(null);
  };

  const pickCover = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setFormError('Photo library permission is required.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.75,
      allowsEditing: true,
      aspect: [16, 9],
    });
    if (!result.canceled && result.assets[0]) {
      setCoverUri(result.assets[0].uri);
    }
  };

  if (!societyId) {
    return (
      <ScreenHeader title="Notices" subtitle="Manage announcements">
        <EmptyState visual="disconnected" title="No society linked" subtitle="Assign a society to your admin profile." />
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
          className="h-10 w-10 items-center justify-center rounded-full bg-brand-700"
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
            <EmptyState
              visual="notices"
              title="No notices"
              subtitle="Tap + to post the first society notice."
            />
          }
          renderItem={({ item }) => (
            <AppCard className="overflow-hidden p-0">
              {item.cover_url ? (
                <Image
                  source={{ uri: item.cover_url }}
                  style={{ width: '100%', height: 120 }}
                  contentFit="cover"
                />
              ) : null}
              <View className="p-4">
                <Text className="mb-1 text-base font-semibold text-ink">{item.title}</Text>
                <Text className="mb-3 text-sm text-ink-soft">{item.body}</Text>
                <Text className="mb-3 text-xs text-ink-faint">
                  {formatNoticeDate(item.created_at)}
                </Text>
                <View className="flex-row gap-2">
                  <Pressable
                    onPress={() => openEdit(item)}
                    className="flex-1 items-center rounded-xl border border-surface-border py-2.5"
                  >
                    <Text className="text-sm font-semibold text-ink-soft">Edit</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => deleteMutation.mutate(item.id)}
                    className="flex-1 items-center rounded-xl bg-status-rejectedSoft py-2.5"
                  >
                    <Text className="text-sm font-semibold text-status-rejected">Delete</Text>
                  </Pressable>
                </View>
              </View>
            </AppCard>
          )}
        />
      )}

      <Modal visible={modalOpen} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior="padding"
          className="flex-1 justify-end bg-black/40"
        >
          <View className="rounded-t-3xl bg-white px-5 pb-10 pt-5">
            <Text className="mb-4 text-xl font-bold text-ink">
              {editing ? 'Edit notice' : 'New notice'}
            </Text>
            {formError ? <Text className="mb-2 text-sm text-status-rejected">{formError}</Text> : null}

            <View className="mb-3 overflow-hidden rounded-2xl border border-surface-border bg-surface-muted">
              {coverUri ? (
                <View>
                  <Image
                    source={{ uri: coverUri }}
                    style={{ width: '100%', height: 120 }}
                    contentFit="cover"
                  />
                  <Pressable
                    onPress={() => {
                      setCoverUri(null);
                      setCoverUrl(null);
                    }}
                    className="absolute right-2 top-2 h-8 w-8 items-center justify-center rounded-full bg-black/50"
                  >
                    <X color="#fff" size={14} />
                  </Pressable>
                </View>
              ) : (
                <Pressable onPress={pickCover} className="h-24 items-center justify-center gap-1">
                  <ImagePlus color={Brand.primary} size={22} />
                  <Text className="text-sm font-medium text-brand-700">Add cover image</Text>
                </Pressable>
              )}
            </View>
            {coverUri ? (
              <Pressable onPress={pickCover} className="mb-3">
                <Text className="text-sm font-semibold text-brand-700">Change cover</Text>
              </Pressable>
            ) : null}

            <TextInput
              className="mb-3 rounded-xl border border-surface-border px-4 py-3 text-base text-ink"
              placeholder="Title"
              placeholderTextColor="#94A3B8"
              value={title}
              onChangeText={setTitle}
            />
            <TextInput
              className="mb-4 min-h-[120px] rounded-xl border border-surface-border px-4 py-3 text-base text-ink"
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
                className="flex-1 items-center rounded-xl border border-surface-border py-3"
              >
                <Text className="font-semibold text-ink-soft">Cancel</Text>
              </Pressable>
              <Pressable
                onPress={() => saveMutation.mutate()}
                disabled={saveMutation.isPending}
                className="flex-1 items-center rounded-xl bg-accent-600 py-3"
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

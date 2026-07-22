import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import {
  AlertCircle,
  CalendarDays,
  ChevronRight,
  ImagePlus,
  Megaphone,
  Plus,
  Trash2,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react-native';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  Switch,
  View,
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import Toast from 'react-native-toast-message';

import { FloatingActionBtn } from '@/components/ui/brand';
import { ChipSelector } from '@/components/ui/chip-selector';
import { ListRow } from '@/components/ui/list-row';
import { ScreenHeader } from '@/components/ui/screen-header';
import { SearchField } from '@/components/ui/search-field';
import { StaggeredListItem } from '@/components/ui/staggered-list-item';
import { SuccessOverlay } from '@/components/ui/success-overlay';
import { SwipeActionRow } from '@/components/ui/swipe-action-row';
import { ThemedRefreshControl } from '@/components/ui/themed-refresh-control';
import { EmptyState } from '@/components/visitors/empty-state';
import { ErrorBanner } from '@/components/visitors/error-banner';
import { SkeletonList } from '@/components/visitors/loading-state';
import { Brand, FontFamily, Pastels, getPastels, type PastelTone } from '@/constants/theme';
import { useModalBack } from '@/hooks/use-modal-back';
import { useThemePalette } from '@/hooks/use-theme';
import { formatNoticeDate } from '@/lib/community';
import { deleteNotice, fetchNotices, fetchTowers, uploadNoticeCover, upsertNotice } from '@/lib/community-api';
import { hapticConfirm } from '@/lib/haptics';
import { queryKeys } from '@/lib/query-client';
import { useAuthStore } from '@/stores/authStore';
import { useCommunityUiStore } from '@/stores/communityUiStore';
import { useReadStateStore } from '@/stores/readStateStore';
import type { Notice, NoticeCategory } from '@/types/database';
import { NOTICE_CATEGORIES } from '@/types/database';

const NOTICE_CATEGORY_META: Record<
  NoticeCategory,
  { label: string; accent: string; bg: PastelTone; Icon: LucideIcon }
> = {
  urgent: { label: 'Urgent', accent: '#E11D48', bg: 'rose', Icon: AlertCircle },
  event: { label: 'Event', accent: '#2563EB', bg: 'sky', Icon: CalendarDays },
  general: { label: 'General', accent: Brand.primaryMid, bg: 'mint', Icon: Megaphone },
};

function noticeCategoryMeta(category: Notice['category']) {
  const base = NOTICE_CATEGORY_META[category ?? 'general'] ?? NOTICE_CATEGORY_META.general;
  const pastels = getPastels();
  return { ...base, bg: pastels[base.bg] };
}

function matchesNotice(notice: Notice, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return [notice.title, notice.body].join(' ').toLowerCase().includes(q);
}

export default function AdminNoticesScreen() {
  const profile = useAuthStore((s) => s.profile);
  const societyId = profile?.society_id;
  const userId = profile?.id;
  const queryClient = useQueryClient();
  const palette = useThemePalette();
  const editingNoticeId = useCommunityUiStore((s) => s.editingNoticeId);
  const setEditingNoticeId = useCommunityUiStore((s) => s.setEditingNoticeId);
  const isNoticeUnread = useReadStateStore((s) => s.isNoticeUnread);
  const markNoticeSeen = useReadStateStore((s) => s.markNoticeSeen);

  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  useModalBack(modalOpen, () => setModalOpen(false));
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [coverUri, setCoverUri] = useState<string | null>(null);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [targetAudience, setTargetAudience] = useState<'all' | 'tower'>('all');
  const [targetTowerId, setTargetTowerId] = useState<string>('');
  const [isPinned, setIsPinned] = useState(false);
  const [category, setCategory] = useState<'urgent' | 'general' | 'event'>('general');
  const [requiresAck, setRequiresAck] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successVisible, setSuccessVisible] = useState(false);

  const noticesKey = queryKeys.notices(societyId ?? 'none');

  const towersQuery = useQuery({
    queryKey: queryKeys.towers(societyId ?? 'none'),
    queryFn: () => fetchTowers(societyId!),
    enabled: Boolean(societyId),
  });

  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: noticesKey,
    queryFn: () => fetchNotices(societyId!),
    enabled: Boolean(societyId),
  });

  const notices = useMemo(
    () => (data ?? []).filter((n) => matchesNotice(n, search)),
    [data, search],
  );

  const selected =
    data?.find((n) => n.id === selectedId) ?? null;

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
        targetAudience,
        targetTowerId: targetAudience === 'tower' ? targetTowerId : null,
        isPinned,
        category,
        requiresAck: category === 'urgent' ? true : requiresAck,
      });
    },
    onMutate: async () => {
      if (!editingNoticeId) return { previous: undefined };
      await queryClient.cancelQueries({ queryKey: noticesKey });
      const previous = queryClient.getQueryData<Notice[]>(noticesKey);
      queryClient.setQueryData<Notice[]>(noticesKey, (old = []) =>
        old.map((n) =>
          n.id === editingNoticeId
            ? {
                ...n,
                title: title.trim(),
                body: body.trim(),
                cover_url: coverUri ?? n.cover_url,
                target_audience: targetAudience,
                target_tower_id: targetAudience === 'tower' ? targetTowerId : null,
                is_pinned: isPinned,
                category,
                requires_ack: category === 'urgent' ? true : requiresAck,
              }
            : n,
        ),
      );
      return { previous };
    },
    onError: (e: Error, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(noticesKey, context.previous);
      setFormError(e.message);
    },
    onSuccess: async () => {
      const wasCreate = !editingNoticeId;
      await queryClient.invalidateQueries({ queryKey: noticesKey });
      closeModal();
      hapticConfirm();
      Toast.show({ type: 'success', text1: wasCreate ? 'Notice posted' : 'Notice updated' });
      if (wasCreate) setSuccessVisible(true);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteNotice(id),
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: noticesKey });
      const previous = queryClient.getQueryData<Notice[]>(noticesKey);
      queryClient.setQueryData<Notice[]>(noticesKey, (old = []) =>
        old.filter((n) => n.id !== id),
      );
      return { previous };
    },
    onError: (_e: Error, _id, context) => {
      if (context?.previous) queryClient.setQueryData(noticesKey, context.previous);
    },
    onSuccess: (_d, id) => {
      if (selectedId === id) setSelectedId(null);
      hapticConfirm();
      Toast.show({ type: 'success', text1: 'Notice deleted' });
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: noticesKey });
    },
  });

  const openCreate = () => {
    setEditingNoticeId(null);
    setTitle('');
    setBody('');
    setCoverUri(null);
    setCoverUrl(null);
    setTargetAudience('all');
    setTargetTowerId('');
    setIsPinned(false);
    setCategory('general');
    setRequiresAck(false);
    setFormError(null);
    setModalOpen(true);
  };

  const openEdit = (notice: Notice) => {
    markNoticeSeen(notice.id);
    setEditingNoticeId(notice.id);
    setTitle(notice.title);
    setBody(notice.body);
    setCoverUri(notice.cover_url ?? null);
    setCoverUrl(notice.cover_url ?? null);
    setTargetAudience((notice.target_audience as any) ?? 'all');
    setTargetTowerId(notice.target_tower_id ?? '');
    setIsPinned(notice.is_pinned ?? false);
    setCategory(notice.category ?? 'general');
    setRequiresAck(notice.requires_ack ?? false);
    setFormError(null);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingNoticeId(null);
    setFormError(null);
  };

  const confirmDelete = (item: Notice) => {
    Alert.alert('Delete notice?', `“${item.title}” will be permanently removed.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          markNoticeSeen(item.id);
          deleteMutation.mutate(item.id);
        },
      },
    ]);
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
        <EmptyState
          visual="disconnected"
          title="No society linked"
          subtitle="Assign a society to your admin profile."
        />
      </ScreenHeader>
    );
  }

  const noticeFormModal = (
    <Modal
      visible={modalOpen}
      animationType="slide"
      transparent
      onRequestClose={() => setModalOpen(false)}
    >
      <KeyboardAvoidingView behavior="padding" className="flex-1 justify-end bg-black/40">
        <View className="max-h-[90%] rounded-t-3xl bg-surface-card px-5 pb-10 pt-5">
          <ScrollView keyboardShouldPersistTaps="handled">
            <Text
              className="mb-4 text-xl text-ink"
              style={{ fontFamily: FontFamily.display }}
            >
              {editing ? 'Edit notice' : 'New notice'}
            </Text>
            {formError ? (
              <Text className="mb-2 text-sm text-red-500">{formError}</Text>
            ) : null}

            <View className="mb-3 overflow-hidden rounded-2xl border border-surface-border bg-surface-muted">
              {coverUri ? (
                <View>
                  <Image
                    source={{ uri: coverUri }}
                    style={{ width: '100%', height: 120 }}
                    contentFit="cover"
                  />
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Remove cover image"
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
                <Pressable
                  onPress={() => {
                    void pickCover();
                  }}
                  className="h-24 items-center justify-center gap-1"
                >
                  <ImagePlus color={Brand.primary} size={22} />
                  <Text className="text-sm font-medium text-brand-700">Add cover image</Text>
                </Pressable>
              )}
            </View>
            {coverUri ? (
              <Pressable
                onPress={() => {
                  void pickCover();
                }}
                className="mb-3"
              >
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

            <Text className="mb-2 text-xs font-semibold uppercase text-ink-muted">Category</Text>
            <ChipSelector
              className="mb-3"
              presentation="tiles"
              options={NOTICE_CATEGORIES.map((c) => ({ value: c.value, label: c.label }))}
              value={category}
              onChange={(v) => {
                const next = v as 'urgent' | 'general' | 'event';
                setCategory(next);
                if (next === 'urgent') setRequiresAck(true);
              }}
            />

            <View className="mb-4 flex-row items-center justify-between">
              <Text className="text-base text-ink font-medium">Pin Notice</Text>
              <Switch value={isPinned} onValueChange={setIsPinned} />
            </View>

            <View className="mb-4 flex-row items-center justify-between">
              <View className="flex-1 pr-3">
                <Text className="text-base text-ink font-medium">Require acknowledgment</Text>
                <Text className="text-xs text-ink-muted">
                  Residents must confirm they read this (auto-on for urgent)
                </Text>
              </View>
              <Switch
                value={requiresAck || category === 'urgent'}
                onValueChange={setRequiresAck}
                disabled={category === 'urgent'}
              />
            </View>

            <Text className="mb-2 text-xs font-semibold uppercase text-ink-muted">Audience</Text>
            <ChipSelector
              className="mb-4"
              presentation="tiles"
              options={[
                { value: 'all', label: 'All Residents' },
                { value: 'tower', label: 'Specific Tower' }
              ]}
              value={targetAudience}
              onChange={(v) => setTargetAudience(v as any)}
            />

            {targetAudience === 'tower' && (
              <View className="mb-4">
                <ChipSelector
                  title="Select Tower"
                  presentation="sheet"
                  options={(towersQuery.data || []).map(t => ({ value: t.id, label: t.name }))}
                  value={targetTowerId}
                  onChange={setTargetTowerId}
                />
              </View>
            )}

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
                className="flex-1 items-center rounded-bubbly py-3.5"
                style={{ backgroundColor: Brand.primary }}
              >
                {saveMutation.isPending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text className="font-semibold text-white">Save</Text>
                )}
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );

  if (selected) {
    return (
      <ScreenHeader title="Notice" subtitle={formatNoticeDate(selected.created_at)}>
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
        >
          <Pressable onPress={() => setSelectedId(null)} className="mb-4 self-start">
            <Text
              className="font-semibold"
              style={{ color: palette.isDark ? Brand.primaryOnDark : Brand.primaryDark }}
            >
              ← All notices
            </Text>
          </Pressable>

          {selected.cover_url ? (
            <View className="mb-4 overflow-hidden rounded-panel">
              <Image
                source={{ uri: selected.cover_url }}
                style={{ width: '100%', height: 180 }}
                contentFit="cover"
              />
            </View>
          ) : null}

          <Text
            className="mb-2 text-[26px] text-ink"
            style={{ fontFamily: FontFamily.display }}
          >
            {selected.title}
          </Text>
          <Text className="mb-5 text-xs text-ink-muted">
            {formatNoticeDate(selected.created_at)}
          </Text>
          <Text className="mb-6 text-[15px] leading-6 text-ink">{selected.body}</Text>

          <View className="flex-row gap-2">
            <Pressable
              onPress={() => openEdit(selected)}
              className="flex-1 items-center rounded-card py-3.5"
              style={{ backgroundColor: Brand.primary }}
            >
              <Text className="font-semibold text-white">Edit</Text>
            </Pressable>
            <Pressable
              onPress={() => confirmDelete(selected)}
              className="flex-1 items-center rounded-card border border-surface-border py-3.5"
              style={{ backgroundColor: palette.card }}
            >
              <View className="flex-row items-center gap-2">
                <Trash2
                  color={palette.isDark ? Brand.primaryOnDark : Brand.primary}
                  size={16}
                  strokeWidth={1.5}
                />
                <Text
                  className="font-semibold"
                  style={{ color: palette.isDark ? Brand.primaryOnDark : Brand.primary }}
                >
                  Delete
                </Text>
              </View>
            </Pressable>
          </View>
        </ScrollView>
        {noticeFormModal}
      </ScreenHeader>
    );
  }

  return (
    <ScreenHeader title="Notices" subtitle="Create and manage announcements" showMenu>
      <View className="px-4 pb-2">
        <SearchField
          value={search}
          onChangeText={setSearch}
          placeholder="Search notices…"
          accessibilityLabel="Search notices"
        />
      </View>

      {error ? <ErrorBanner message={error.message} onRetry={() => void refetch()} /> : null}
      {deleteMutation.error ? (
        <ErrorBanner message={(deleteMutation.error as Error).message} />
      ) : null}

      {isLoading && !data ? (
        <SkeletonList count={6} />
      ) : (
        <FlatList
          data={notices}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 100, flexGrow: 1 }}
          refreshControl={
            <ThemedRefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} />
          }
          initialNumToRender={15}
          windowSize={8}
          removeClippedSubviews
          ListEmptyComponent={
            <EmptyState
              visual="notices"
              title={search.trim() ? 'No matches' : 'No notices'}
              subtitle={
                search.trim()
                  ? 'Try a different title or keyword.'
                  : 'Post your first notice to reach all residents.'
              }
              actionLabel={search.trim() ? undefined : '+ Post notice'}
              onAction={search.trim() ? undefined : openCreate}
              tips={
                search.trim()
                  ? undefined
                  : [
                      {
                        Icon: Megaphone,
                        title: 'Reach every flat',
                        body: 'Notices push to residents’ feeds and unread badges.',
                        tint: Brand.primary,
                        washKey: 'mint',
                      },
                      {
                        Icon: ImagePlus,
                        title: 'Add a cover photo',
                        body: 'Visual posts get more attention for events and alerts.',
                        tint: Brand.primary,
                        washKey: 'peach',
                      },
                      {
                        Icon: Users,
                        title: 'Open to manage',
                        body: 'Tap a notice to read it fully, then edit or delete.',
                        tint: '#FB7185',
                        washKey: 'sky',
                      },
                    ]
              }
            />
          }
          renderItem={({ item, index }) => {
            const unread = isNoticeUnread(item.id);
            const meta = noticeCategoryMeta(item.category);
            const CatIcon = meta.Icon;
            return (
              <StaggeredListItem index={index} disabled={isRefetching}>
                <SwipeActionRow
                  actions={[
                    { key: 'edit', label: 'Edit', color: Brand.primary, onPress: () => openEdit(item) },
                    { key: 'delete', label: 'Delete', color: '#E11D48', onPress: () => confirmDelete(item) },
                  ]}
                >
                  <ListRow
                    title={item.title}
                    subtitle={`${meta.label} · ${formatNoticeDate(item.created_at)}${item.cover_url ? ' · Cover' : ''}`}
                    accentColor={meta.accent}
                    last={index === notices.length - 1}
                    accessibilityLabel={`${item.title}${unread ? ', unread' : ''}`}
                    onPress={() => {
                      markNoticeSeen(item.id);
                      setSelectedId(item.id);
                    }}
                    leading={
                      item.cover_url ? (
                        <View className="h-14 w-14 overflow-hidden rounded-card">
                          <Image
                            source={{ uri: item.cover_url }}
                            style={{ width: 56, height: 56 }}
                            contentFit="cover"
                          />
                        </View>
                      ) : (
                        <View
                          className="h-10 w-10 items-center justify-center rounded-full"
                          style={{ backgroundColor: meta.bg }}
                        >
                          <CatIcon color={meta.accent} size={18} strokeWidth={1.5} />
                        </View>
                      )
                    }
                    trailing={
                      <View className="items-end gap-1">
                        {item.is_pinned ? (
                          <View className="rounded bg-brand-50 px-1 py-0.5">
                            <Text className="text-[10px] font-bold text-brand-800">PINNED</Text>
                          </View>
                        ) : null}
                        <View className="flex-row items-center gap-1.5">
                          {unread ? (
                            <View
                              className="h-2 w-2 rounded-pill"
                              style={{ backgroundColor: Brand.accent }}
                            />
                          ) : null}
                          <ChevronRight color={Brand.inkMuted} size={16} strokeWidth={1.5} />
                        </View>
                      </View>
                    }
                  />
                </SwipeActionRow>
              </StaggeredListItem>
            );
          }}
        />
      )}

      {noticeFormModal}
      <FloatingActionBtn
        onPress={openCreate}
        icon={<Plus color="#fff" size={24} />}
        label="Post"
      />
      <SuccessOverlay
        visible={successVisible}
        message="Notice posted"
        onDone={() => setSuccessVisible(false)}
      />
    </ScreenHeader>
  );
}

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import {
  Car,
  CheckCircle,
  ChevronRight,
  Clock,
  Droplets,
  Leaf,
  MessageSquarePlus,
  Plus,
  ShieldAlert,
  Wrench,
  Zap,
  Image as ImageIcon,
  Send,
} from 'lucide-react-native';
import { Image } from 'expo-image';

import { AppCard, FloatingActionBtn } from '@/components/ui/brand';
import { ScreenHeader } from '@/components/ui/screen-header';
import { SearchField } from '@/components/ui/search-field';
import { ThemedRefreshControl } from '@/components/ui/themed-refresh-control';
import { ChipSelector } from '@/components/ui/chip-selector';
import { SuccessOverlay } from '@/components/ui/success-overlay';
import { EmptyState } from '@/components/visitors/empty-state';
import { ErrorBanner } from '@/components/visitors/error-banner';
import { SkeletonList } from '@/components/visitors/loading-state';
import { Brand, FontFamily, Pastels } from '@/constants/theme';
import { complaintStatusTone } from '@/lib/community';
import { uploadLocalImage } from '@/lib/storage-upload';
import { createComplaint, fetchComplaintsForFlat, fetchComplaintComments, addComplaintComment } from '@/lib/community-api';
import { rateComplaint, reopenComplaint } from '@/lib/ops-api';
import { queryKeys } from '@/lib/query-client';
import { useAuthStore } from '@/stores/authStore';
import { COMPLAINT_CATEGORIES, type Complaint, type ComplaintPriority } from '@/types/database';

const CATEGORY_ICONS: Record<string, { Icon: typeof Wrench; color: string; bg: string }> = {
  Parking: { Icon: Car, color: '#6B5CC4', bg: Pastels.lilac },
  Plumbing: { Icon: Droplets, color: '#2563EB', bg: Pastels.sky },
  Electrical: { Icon: Zap, color: '#C4861A', bg: Pastels.butter },
  Housekeeping: { Icon: Leaf, color: Brand.primary, bg: Pastels.mint },
  Security: { Icon: ShieldAlert, color: '#C0392B', bg: Pastels.rose },
  Noise: { Icon: Wrench, color: '#B06020', bg: Pastels.peach },
  Other: { Icon: Wrench, color: Brand.inkMuted, bg: Pastels.sage },
};

function getCategory(cat: string) {
  return CATEGORY_ICONS[cat] ?? { Icon: Wrench, color: Brand.inkMuted, bg: Pastels.sage };
}

function StatusBadge({ status }: { status: string }) {
  const tone = complaintStatusTone(status as Complaint['status']);
  const isResolved = status === 'resolved';
  const isPending = status === 'open';
  const BadgeIcon = isResolved ? CheckCircle : isPending ? Clock : Wrench;

  return (
    <View className={`flex-row items-center gap-1 rounded-pill border px-2.5 py-1 ${tone.bg} ${tone.border}`}>
      <BadgeIcon
        color={isResolved ? Brand.primary : isPending ? '#B45309' : '#1D4ED8'}
        size={12}
        strokeWidth={1.5}
      />
      <Text className={`text-[11px] font-semibold ${tone.text}`} style={{ fontFamily: FontFamily.heading }}>
        {tone.label}
      </Text>
    </View>
  );
}

function ageLabel(iso: string): string {
  const ageDays = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (ageDays === 0) return 'Today';
  if (ageDays === 1) return 'Yesterday';
  return `${ageDays}d ago`;
}

function matchesComplaint(item: Complaint, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return [item.category, item.description, item.status].join(' ').toLowerCase().includes(q);
}

export default function ResidentHelpdeskScreen() {
  const profile = useAuthStore((s) => s.profile);
  const flatId = profile?.flat_id;
  const userId = profile?.id;
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [composeOpen, setComposeOpen] = useState(false);
  const [category, setCategory] = useState<string>(COMPLAINT_CATEGORIES[0]);
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<ComplaintPriority>('medium');
  const [photos, setPhotos] = useState<string[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [successVisible, setSuccessVisible] = useState(false);
  const [commentText, setCommentText] = useState('');

  const listQuery = useQuery({
    queryKey: queryKeys.complaints(`flat:${flatId ?? 'none'}`),
    queryFn: () => fetchComplaintsForFlat(flatId!),
    enabled: Boolean(flatId),
  });

  const filtered = useMemo(
    () => (listQuery.data ?? []).filter((c) => matchesComplaint(c, search)),
    [listQuery.data, search],
  );

  const selected =
    listQuery.data?.find((c) => c.id === selectedId) ?? null;

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!flatId) throw new Error('No flat linked to your profile.');
      if (!userId) throw new Error('Not signed in.');
      if (!description.trim()) throw new Error('Please describe the issue.');
      
      const photoUrls: string[] = [];
      if (photos.length > 0) {
        for (const uri of photos) {
          const { publicUrl } = await uploadLocalImage({
            bucket: 'complaint-photos',
            societyId: profile?.society_id || 'unknown',
            uri,
          });
          if (publicUrl) photoUrls.push(publicUrl);
        }
      }

      await createComplaint({
        flatId,
        category,
        description: description.trim(),
        createdBy: userId,
        priority,
        photoUrls: photoUrls.length > 0 ? photoUrls : undefined,
      });
    },
    onSuccess: async () => {
      setDescription('');
      setPhotos([]);
      setPriority('medium');
      setComposeOpen(false);
      setSuccessVisible(true);
      setFormError(null);
      await queryClient.invalidateQueries({
        queryKey: queryKeys.complaints(`flat:${flatId}`),
      });
    },
    onError: (e: Error) => {
      setSuccessVisible(false);
      setFormError(e.message);
    },
  });

  if (!flatId) {
    return (
      <ScreenHeader title="Helpdesk" showBack>
        <EmptyState
          visual="disconnected"
          title="No flat linked"
          subtitle="Ask an admin to link your flat before filing complaints."
        />
      </ScreenHeader>
    );
  }

  const commentsQuery = useQuery({
    queryKey: queryKeys.complaintComments(selectedId || ''),
    queryFn: () => fetchComplaintComments(selectedId!),
    enabled: Boolean(selectedId),
  });

  const commentMutation = useMutation({
    mutationFn: async () => {
      if (!selectedId || !commentText.trim()) return;
      await addComplaintComment(selectedId, commentText.trim());
    },
    onSuccess: () => {
      setCommentText('');
      queryClient.invalidateQueries({ queryKey: queryKeys.complaintComments(selectedId!) });
    },
  });

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0].uri) {
      setPhotos([...photos, result.assets[0].uri]);
    }
  };

  if (selected) {
    const { Icon: CatIcon, color: catColor, bg: catBg } = getCategory(selected.category);
    return (
      <ScreenHeader title="Complaint" subtitle={selected.category}>
        <KeyboardAvoidingView behavior="padding" className="flex-1">
          <ScrollView
            className="flex-1"
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 }}
          >
            <Pressable onPress={() => setSelectedId(null)} className="mb-4 self-start">
              <Text className="font-semibold text-brand-700">← All complaints</Text>
            </Pressable>

            <View className="mb-4 flex-row items-center gap-3">
              <View
                className="h-12 w-12 items-center justify-center rounded-panel"
                style={{ backgroundColor: catBg }}
              >
                <CatIcon color={catColor} size={20} strokeWidth={1.5} />
              </View>
              <View className="flex-1">
                <Text className="text-xl text-ink" style={{ fontFamily: FontFamily.display }}>
                  {selected.category}
                </Text>
                <Text className="mt-0.5 text-xs text-ink-muted">
                  {ageLabel(selected.created_at)} ·{' '}
                  {new Date(selected.created_at).toLocaleString()}
                </Text>
              </View>
              <StatusBadge status={selected.status} />
            </View>

            <Text
              className="mb-2 text-xs font-bold uppercase tracking-widest text-ink-muted"
              style={{ fontFamily: FontFamily.heading }}
            >
              Description
            </Text>
            <Text className="mb-5 text-[15px] leading-6 text-ink">{selected.description}</Text>

            <View className="rounded-card px-4 py-3" style={{ backgroundColor: Pastels.sage }}>
              <Text className="text-xs text-ink-muted">Status</Text>
              <Text className="mt-1 text-base text-ink" style={{ fontFamily: FontFamily.heading }}>
                {complaintStatusTone(selected.status).label}
              </Text>
              {selected.priority && (
                <Text className="mt-1 text-sm text-ink-soft">
                  Priority: <Text className="font-semibold capitalize">{selected.priority}</Text>
                </Text>
              )}
              {selected.sla_due_at ? (
                <Text className="mt-1 text-xs text-ink-muted">
                  SLA due {new Date(selected.sla_due_at).toLocaleString()}
                </Text>
              ) : null}
              <Text className="mt-1 text-xs text-ink-muted">
                Admins update this as they work on your ticket.
              </Text>
            </View>

            {selected.status === 'resolved' ? (
              <View className="mt-4 gap-2">
                {selected.satisfaction_rating == null ? (
                  <View className="rounded-card border border-surface-border p-4">
                    <Text className="mb-2 text-sm font-semibold text-ink">How was the resolution?</Text>
                    <View className="mb-3 flex-row gap-2">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <Pressable
                          key={n}
                          onPress={() => {
                            void rateComplaint(selected.id, n).then(() =>
                              queryClient.invalidateQueries({
                                queryKey: queryKeys.complaints(`flat:${flatId}`),
                              }),
                            );
                          }}
                          className="h-10 w-10 items-center justify-center rounded-full"
                          style={{ backgroundColor: Pastels.butter }}
                        >
                          <Text className="font-semibold text-ink">{n}</Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                ) : (
                  <Text className="text-sm text-ink-soft">
                    You rated this {selected.satisfaction_rating}/5
                  </Text>
                )}
                <Pressable
                  onPress={() => {
                    void reopenComplaint(selected.id, 'Resident reopened').then(() =>
                      queryClient.invalidateQueries({
                        queryKey: queryKeys.complaints(`flat:${flatId}`),
                      }),
                    );
                  }}
                  className="items-center rounded-card border border-surface-border py-3"
                >
                  <Text className="font-semibold text-ink">Reopen complaint</Text>
                </Pressable>
              </View>
            ) : null}

            {selected.photo_urls && selected.photo_urls.length > 0 && (
              <View className="mt-4">
                <Text className="mb-2 text-xs font-bold uppercase tracking-widest text-ink-muted">Photos</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {selected.photo_urls.map((url, i) => (
                    <Image key={i} source={{ uri: url }} style={{ width: 100, height: 100, borderRadius: 8, marginRight: 8 }} />
                  ))}
                </ScrollView>
              </View>
            )}

            <View className="mt-6">
              <Text className="mb-2 text-xs font-bold uppercase tracking-widest text-ink-muted">Comments</Text>
              {commentsQuery.isLoading ? <ActivityIndicator /> : null}
              {commentsQuery.data?.map((comment) => (
                <View key={comment.id} className="mb-3 rounded-xl bg-surface-muted p-3">
                  <Text className="text-sm font-semibold text-ink">{comment.author?.full_name}</Text>
                  <Text className="text-sm text-ink-soft">{comment.content}</Text>
                  <Text className="mt-1 text-xs text-ink-faint">
                    {new Date(comment.created_at).toLocaleString()}
                  </Text>
                </View>
              ))}
            </View>
          </ScrollView>

          <View className="border-t border-surface-border bg-surface px-4 pb-3 pt-2">
            <View className="flex-row items-center gap-2">
              <TextInput
                className="flex-1 rounded-full border border-surface-border bg-surface-card px-4 py-2.5 text-sm text-ink"
                placeholder="Add a comment..."
                placeholderTextColor="#94A3B8"
                value={commentText}
                onChangeText={setCommentText}
              />
              <Pressable
                className="h-10 w-10 items-center justify-center rounded-full"
                onPress={() => commentMutation.mutate()}
                disabled={commentMutation.isPending || !commentText.trim()}
                style={{ backgroundColor: Brand.primary }}
              >
                {commentMutation.isPending ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Send size={16} color="#fff" />
                )}
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </ScreenHeader>
    );
  }

  return (
    <ScreenHeader title="Helpdesk" subtitle="Your complaints" showBack>
      <View className="px-4 pb-2">
        <SearchField
          value={search}
          onChangeText={setSearch}
          placeholder="Search by category, status, or text…"
          accessibilityLabel="Search complaints"
        />
      </View>

      {listQuery.error ? (
        <ErrorBanner
          message={listQuery.error.message}
          onRetry={() => void listQuery.refetch()}
        />
      ) : null}

      {listQuery.isLoading && !listQuery.data ? (
        <SkeletonList count={5} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100, flexGrow: 1 }}
          ItemSeparatorComponent={() => <View className="h-2" />}
          refreshControl={
            <ThemedRefreshControl
              refreshing={listQuery.isRefetching}
              onRefresh={() => void listQuery.refetch()}
            />
          }
          ListEmptyComponent={
            <EmptyState
              visual="helpdesk"
              title={search.trim() ? 'No matches' : 'No complaints yet'}
              subtitle={
                search.trim()
                  ? 'Try a different keyword or status.'
                  : 'Tap + to raise a new complaint.'
              }
              tips={
                search.trim()
                  ? undefined
                  : [
                      {
                        Icon: MessageSquarePlus,
                        title: 'Raise an issue',
                        body: 'Pick a category, describe the problem, and submit.',
                        tint: '#C0392B',
                        wash: Pastels.rose,
                      },
                      {
                        Icon: Clock,
                        title: 'Track status',
                        body: 'Open a ticket anytime to see Open → In progress → Resolved.',
                        tint: Brand.accent,
                        wash: Pastels.peach,
                      },
                      {
                        Icon: CheckCircle,
                        title: 'Find faster',
                        body: 'Search by category or words from your description.',
                        tint: Brand.primary,
                        wash: Pastels.mint,
                      },
                    ]
              }
            />
          }
          renderItem={({ item }) => {
            const { Icon: CatIcon, color: catColor, bg: catBg } = getCategory(item.category);
            return (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${item.category} complaint`}
                onPress={() => setSelectedId(item.id)}
              >
                <AppCard className="flex-row items-center gap-3 p-3.5">
                  <View
                    className="h-10 w-10 items-center justify-center rounded-card"
                    style={{ backgroundColor: catBg }}
                  >
                    <CatIcon color={catColor} size={16} strokeWidth={1.5} />
                  </View>
                  <View className="min-w-0 flex-1">
                    <View className="flex-row items-center justify-between gap-2">
                      <Text
                        className="flex-1 text-[15px] text-ink"
                        numberOfLines={1}
                        style={{ fontFamily: FontFamily.heading }}
                      >
                        {item.category}
                      </Text>
                      <StatusBadge status={item.status} />
                    </View>
                    <Text className="mt-0.5 text-xs text-ink-muted" numberOfLines={1}>
                      {ageLabel(item.created_at)} · {item.description}
                    </Text>
                  </View>
                  <ChevronRight color={Brand.inkMuted} size={16} strokeWidth={1.5} />
                </AppCard>
              </Pressable>
            );
          }}
        />
      )}

      <FloatingActionBtn
        onPress={() => {
          setFormError(null);
          setComposeOpen(true);
        }}
        icon={<Plus color="#fff" size={24} />}
        label="New"
      />

      <Modal visible={composeOpen} animationType="slide" transparent>
        <KeyboardAvoidingView behavior="padding" className="flex-1 justify-end bg-black/40">
          <View className="max-h-[90%] rounded-t-3xl bg-surface-card px-5 pb-10 pt-5">
            <ScrollView keyboardShouldPersistTaps="handled">
              <Text className="mb-4 text-xl text-ink" style={{ fontFamily: FontFamily.display }}>
                Raise a complaint
              </Text>
              {formError ? (
                <Text className="mb-3 text-sm text-red-500">{formError}</Text>
              ) : null}

              <Text
                className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-muted"
                style={{ fontFamily: FontFamily.heading }}
              >
                Category
              </Text>
              <View className="mb-4 flex-row flex-wrap gap-2">
                {COMPLAINT_CATEGORIES.map((cat) => {
                  const { Icon, color, bg } = getCategory(cat);
                  const selectedCat = valueIs(category, cat);
                  return (
                    <Pressable
                      key={cat}
                      onPress={() => setCategory(cat)}
                      className="flex-row items-center gap-1.5 rounded-pill px-3 py-2"
                      style={{ backgroundColor: selectedCat ? color : bg }}
                    >
                      <Icon color={selectedCat ? '#fff' : color} size={14} strokeWidth={1.5} />
                      <Text
                        className="text-xs font-semibold"
                        style={{
                          color: selectedCat ? '#fff' : color,
                          fontFamily: FontFamily.heading,
                        }}
                      >
                        {cat}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              
              <Text
                className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-muted mt-2"
                style={{ fontFamily: FontFamily.heading }}
              >
                Priority
              </Text>
              <ChipSelector
                className="mb-4"
                presentation="tiles"
                options={[
                  { value: 'low', label: 'Low' },
                  { value: 'medium', label: 'Medium' },
                  { value: 'high', label: 'High' },
                  { value: 'critical', label: 'Critical' }
                ]}
                value={priority}
                onChange={(v) => setPriority(v as any)}
              />

              <TextInput
                className="mb-4 min-h-[100px] rounded-card bg-surface-muted px-4 py-3 text-base text-ink"
                placeholder="Describe the issue in detail…"
                placeholderTextColor={Brand.inkMuted}
                multiline
                textAlignVertical="top"
                value={description}
                onChangeText={setDescription}
              />
              
              <View className="mb-4">
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                   {photos.map((uri, i) => (
                     <View key={i} className="mr-2">
                       <Image source={{ uri }} style={{ width: 80, height: 80, borderRadius: 8 }} />
                       <Pressable 
                         className="absolute right-1 top-1 rounded-full bg-black/50 p-1"
                         onPress={() => setPhotos(photos.filter(p => p !== uri))}
                       >
                         <Text className="text-white text-xs">X</Text>
                       </Pressable>
                     </View>
                   ))}
                   <Pressable 
                     className="h-20 w-20 items-center justify-center rounded-xl border border-dashed border-brand-200 bg-brand-50"
                     onPress={pickImage}
                   >
                     <ImageIcon size={24} color={Brand.primary} />
                   </Pressable>
                </ScrollView>
              </View>

              <View className="flex-row gap-2">
                <Pressable
                  onPress={() => setComposeOpen(false)}
                  className="flex-1 items-center rounded-xl border border-surface-border py-3"
                >
                  <Text className="font-semibold text-ink-soft">Cancel</Text>
                </Pressable>
                <Pressable
                  onPress={() => createMutation.mutate()}
                  disabled={createMutation.isPending}
                  className="flex-1 items-center rounded-card py-3.5"
                  style={{ backgroundColor: Brand.accent }}
                >
                  {createMutation.isPending ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text className="font-semibold text-white">Submit</Text>
                  )}
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <SuccessOverlay
        visible={successVisible}
        message="Complaint submitted"
        onDone={() => setSuccessVisible(false)}
      />
    </ScreenHeader>
  );
}

function valueIs(a: string, b: string) {
  return a === b;
}

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, ChevronLeft, ChevronRight, Plus, Send, UserRound } from 'lucide-react-native';
import { useMemo, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  SectionList,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppCard, InitialsAvatar } from '@/components/ui/brand';
import { ChipSelector } from '@/components/ui/chip-selector';
import { ScreenHeader } from '@/components/ui/screen-header';
import { SearchField } from '@/components/ui/search-field';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { EmptyState } from '@/components/visitors/empty-state';
import { ErrorBanner } from '@/components/visitors/error-banner';
import { SkeletonList } from '@/components/visitors/loading-state';
import { Brand, Elevation, FontFamily, Pastels } from '@/constants/theme';
import { complaintStatusTone } from '@/lib/community';
import {
  addComplaintComment,
  fetchComplaintComments,
  fetchComplaintsForSociety,
  fetchSocietyProfiles,
  updateComplaint,
} from '@/lib/community-api';
import { queryKeys } from '@/lib/query-client';
import { flatTowerName } from '@/lib/visitors';
import { useAuthStore } from '@/stores/authStore';
import { useCommunityUiStore } from '@/stores/communityUiStore';
import { useReadStateStore } from '@/stores/readStateStore';
import {
  COMPLAINT_CATEGORIES,
  COMPLAINT_STATUSES,
  type ComplaintPriority,
  type ComplaintStatus,
  type ComplaintWithFlat,
} from '@/types/database';

type ComplaintSection = {
  title: string;
  data: ComplaintWithFlat[];
};

const STATUS_FLOW: ComplaintStatus[] = ['open', 'in_progress', 'resolved'];

const STATUS_DOT: Record<ComplaintStatus, string> = {
  open: '#D97706',
  in_progress: '#2563EB',
  resolved: Brand.primary,
  reopened: '#EA580C',
};

const PRIORITY_MARK: Record<ComplaintPriority, { color: string; label: string }> = {
  low: { color: Brand.inkMuted, label: 'Low priority' },
  medium: { color: '#CA8A04', label: 'Medium priority' },
  high: { color: Brand.accent, label: 'High priority' },
  critical: { color: '#DC2626', label: 'Critical priority' },
};

function flatLabel(item: ComplaintWithFlat): string {
  if (!item.flats) return 'Unknown flat';
  const tower = flatTowerName(item.flats.towers);
  return tower ? `${tower} · Flat ${item.flats.number}` : `Flat ${item.flats.number}`;
}

function reporterName(item: ComplaintWithFlat): string {
  return item.reporter?.full_name?.trim() || 'Unknown resident';
}

function matchesComplaint(item: ComplaintWithFlat, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return [
    item.category,
    item.description,
    item.status,
    flatLabel(item),
    reporterName(item),
    item.reporter?.phone ?? '',
  ]
    .join(' ')
    .toLowerCase()
    .includes(q);
}

function SectionCard({
  title,
  right,
  children,
}: {
  title: string;
  right?: ReactNode;
  children: ReactNode;
}) {
  return (
    <View
      className="rounded-panel bg-surface-card p-4"
      style={{
        shadowColor: '#0F172A',
        shadowOffset: Elevation.sm.shadowOffset,
        shadowOpacity: Elevation.sm.shadowOpacity,
        shadowRadius: Elevation.sm.shadowRadius,
        elevation: Elevation.sm.elevation,
      }}
    >
      <View className="mb-3 flex-row items-center justify-between">
        <Text
          className="text-[13px] font-semibold text-ink"
          style={{ fontFamily: FontFamily.heading }}
        >
          {title}
        </Text>
        {right}
      </View>
      {children}
    </View>
  );
}

function StatusStepper({
  value,
  onChange,
  disabled,
}: {
  value: ComplaintStatus;
  onChange: (status: ComplaintStatus) => void;
  disabled?: boolean;
}) {
  const activeIndex =
    value === 'reopened' ? 0 : Math.max(0, STATUS_FLOW.indexOf(value));

  return (
    <View>
      <View className="flex-row items-center">
        {STATUS_FLOW.map((step, index) => {
          const done = index < activeIndex || value === 'resolved';
          const current =
            value === 'resolved'
              ? index === STATUS_FLOW.length - 1
              : index === activeIndex;
          const connectorDone = index < activeIndex || value === 'resolved';

          return (
            <View key={step} className="flex-1 flex-row items-center">
              <Pressable
                disabled={disabled}
                accessibilityRole="button"
                accessibilityLabel={`Set status to ${complaintStatusTone(step).label}`}
                onPress={() => onChange(step)}
                className="items-center"
                style={{ width: 76 }}
              >
                <View
                  className="h-7 w-7 items-center justify-center rounded-full"
                  style={{
                    backgroundColor: done || current ? Brand.primary : '#F3F4F6',
                  }}
                >
                  {done && !current ? (
                    <Check color="#fff" size={14} strokeWidth={2.5} />
                  ) : (
                    <Text
                      className="text-[11px] font-bold"
                      style={{ color: done || current ? '#fff' : Brand.inkMuted }}
                    >
                      {index + 1}
                    </Text>
                  )}
                </View>
                <Text
                  className="mt-1.5 text-center text-[11px]"
                  numberOfLines={1}
                  style={{
                    fontFamily: FontFamily.heading,
                    color: current || done ? Brand.ink : Brand.inkMuted,
                  }}
                >
                  {complaintStatusTone(step).label}
                </Text>
              </Pressable>
              {index < STATUS_FLOW.length - 1 ? (
                <View
                  className="mb-5 h-0.5 flex-1"
                  style={{ backgroundColor: connectorDone ? Brand.primary : '#E5E7EB' }}
                />
              ) : null}
            </View>
          );
        })}
      </View>

      <Pressable
        disabled={disabled}
        onPress={() =>
          onChange(value === 'reopened' ? 'in_progress' : 'reopened')
        }
        className="mt-3 self-start"
      >
        <Text
          className="text-sm font-semibold"
          style={{ color: value === 'reopened' ? Brand.primary : Brand.inkSoft }}
        >
          {value === 'reopened' ? 'Move to In progress' : 'Mark as reopened'}
        </Text>
      </Pressable>
    </View>
  );
}

export default function AdminComplaintsScreen() {
  const societyId = useAuthStore((s) => s.profile?.society_id);
  const queryClient = useQueryClient();
  const statusFilter = useCommunityUiStore((s) => s.complaintStatusFilter);
  const categoryFilter = useCommunityUiStore((s) => s.complaintCategoryFilter);
  const setStatusFilter = useCommunityUiStore((s) => s.setComplaintStatusFilter);
  const setCategoryFilter = useCommunityUiStore((s) => s.setComplaintCategoryFilter);
  const isComplaintUnread = useReadStateStore((s) => s.isComplaintUnread);
  const markComplaintSeen = useReadStateStore((s) => s.markComplaintSeen);

  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');

  const complaintsKey = queryKeys.complaints(`society:${societyId ?? 'none'}`);

  const listQuery = useQuery({
    queryKey: complaintsKey,
    queryFn: () => fetchComplaintsForSociety(),
    enabled: Boolean(societyId),
  });

  const profilesQuery = useQuery({
    queryKey: queryKeys.societyProfiles(societyId ?? 'none'),
    queryFn: () => fetchSocietyProfiles(societyId!),
    enabled: Boolean(societyId),
  });

  const updateMutation = useMutation({
    mutationFn: updateComplaint,
    onMutate: async (input) => {
      const key = queryKeys.complaints(`society:${societyId}`);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<ComplaintWithFlat[]>(key);
      queryClient.setQueryData<ComplaintWithFlat[]>(key, (old = []) =>
        old.map((c) =>
          c.id === input.id
            ? { ...c, status: input.status, assigned_to: input.assignedTo }
            : c,
        ),
      );
      return { previous, key };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.previous && ctx.key) queryClient.setQueryData(ctx.key, ctx.previous);
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.complaints(`society:${societyId}`),
      });
    },
  });

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

  const filtered = useMemo(() => {
    return (listQuery.data ?? []).filter((item) => {
      if (statusFilter !== 'all' && item.status !== statusFilter) return false;
      if (categoryFilter !== 'all' && item.category !== categoryFilter) return false;
      return matchesComplaint(item, search);
    });
  }, [listQuery.data, statusFilter, categoryFilter, search]);

  const sections = useMemo((): ComplaintSection[] => {
    const map = new Map<string, ComplaintWithFlat[]>();
    for (const item of filtered) {
      const list = map.get(item.category) ?? [];
      list.push(item);
      map.set(item.category, list);
    }

    const preferred = COMPLAINT_CATEGORIES.filter((c) => map.has(c));
    const known = new Set<string>(COMPLAINT_CATEGORIES);
    const extras = [...map.keys()].filter((c) => !known.has(c)).sort();
    const order = [...preferred, ...extras];

    return order.map((title) => {
      const data = (map.get(title) ?? []).slice().sort((a, b) => {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
      return { title, data };
    });
  }, [filtered]);

  const selected = listQuery.data?.find((c) => c.id === selectedId) ?? null;

  const assignees = (profilesQuery.data ?? []).filter(
    (p) => p.role === 'admin' || p.role === 'guard',
  );

  if (!societyId) {
    return (
      <ScreenHeader title="Complaints" showBack>
        <EmptyState
          visual="disconnected"
          title="No society linked"
          subtitle="Assign a society to your admin profile."
        />
      </ScreenHeader>
    );
  }

  if (selected) {
    const name = reporterName(selected);
    const statusLabel = complaintStatusTone(selected.status).label;
    const statusColor = STATUS_DOT[selected.status] ?? Brand.inkMuted;
    const priority = selected.priority ?? 'medium';
    const priorityMeta = PRIORITY_MARK[priority];
    const assigneeName =
      assignees.find((p) => p.id === selected.assigned_to)?.full_name ?? null;
    const commentCount = commentsQuery.data?.length ?? 0;

    return (
      <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
        <View className="flex-row items-start gap-3 px-5 pb-3 pt-4">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back to all complaints"
            onPress={() => {
              setSelectedId(null);
              setCommentText('');
            }}
            className="mt-0.5 h-11 w-11 items-center justify-center rounded-full bg-surface-card"
            style={{
              shadowColor: '#0F172A',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.06,
              shadowRadius: 10,
              elevation: 2,
            }}
          >
            <ChevronLeft color={Brand.ink} size={22} />
          </Pressable>
          <View className="min-w-0 flex-1 pt-0.5">
            <Text
              className="text-[28px] tracking-tight text-ink"
              numberOfLines={1}
              style={{ fontFamily: FontFamily.display }}
            >
              {name}
            </Text>
            <Text className="mt-0.5 text-sm text-ink-soft" numberOfLines={1}>
              {flatLabel(selected)}
            </Text>
          </View>
        </View>

        <KeyboardAvoidingView behavior="padding" className="flex-1">
          <ScrollView
            className="flex-1"
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 28, gap: 24 }}
            showsVerticalScrollIndicator={false}
          >
            <View
              className="rounded-panel bg-surface-card p-4"
              style={{
                shadowColor: '#0F172A',
                shadowOffset: Elevation.md.shadowOffset,
                shadowOpacity: Elevation.md.shadowOpacity,
                shadowRadius: Elevation.md.shadowRadius,
                elevation: Elevation.md.elevation,
              }}
            >
              <View className="flex-row items-start gap-3">
                <InitialsAvatar
                  name={name}
                  seed={selected.reporter?.id ?? selected.id}
                  size={56}
                  imageUrl={selected.reporter?.avatar_url}
                />
                <View className="min-w-0 flex-1 pt-0.5">
                  <View className="flex-row items-center gap-2">
                    <View
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: statusColor }}
                    />
                    <Text
                      className="text-sm font-semibold"
                      style={{ color: statusColor, fontFamily: FontFamily.heading }}
                    >
                      {statusLabel}
                    </Text>
                  </View>
                  {selected.reporter?.phone ? (
                    <Text className="mt-1 text-sm text-ink-soft">{selected.reporter.phone}</Text>
                  ) : null}
                  <Text className="mt-1 text-xs text-ink-muted">
                    Filed {new Date(selected.created_at).toLocaleString()}
                  </Text>
                </View>
              </View>

              <View className="mt-4 flex-row flex-wrap items-center gap-2">
                <View
                  className="rounded-pill px-3 py-1"
                  style={{ backgroundColor: Pastels.mint }}
                >
                  <Text
                    className="text-xs font-semibold"
                    style={{ color: Brand.primary, fontFamily: FontFamily.heading }}
                  >
                    {selected.category}
                  </Text>
                </View>
              </View>

              <View
                className="mt-3 flex-row items-center rounded-card bg-surface px-3 py-2.5"
                style={{ borderLeftWidth: 3, borderLeftColor: priorityMeta.color }}
              >
                <Text className="text-sm text-ink" style={{ fontFamily: FontFamily.heading }}>
                  {priorityMeta.label}
                </Text>
              </View>
            </View>

            <SectionCard title="Description">
              <Text className="text-[15px] leading-6 text-ink">{selected.description}</Text>
              {selected.photo_urls && selected.photo_urls.length > 0 ? (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  className="mt-3"
                  contentContainerStyle={{ gap: 8 }}
                >
                  {selected.photo_urls.map((url, i) => (
                    <Image
                      key={i}
                      source={{ uri: url }}
                      style={{ width: 96, height: 96, borderRadius: 12 }}
                    />
                  ))}
                </ScrollView>
              ) : null}
            </SectionCard>

            <SectionCard title="Workflow">
              <Text className="mb-3 text-xs text-ink-muted">Progress</Text>
              <StatusStepper
                value={selected.status}
                disabled={updateMutation.isPending}
                onChange={(status) => {
                  markComplaintSeen(selected.id);
                  updateMutation.mutate({
                    id: selected.id,
                    status,
                    assignedTo: selected.assigned_to,
                  });
                }}
              />

              <View className="mt-5 border-t border-surface-border pt-4">
                <Text className="mb-2 text-xs text-ink-muted">Assignee</Text>
                <View
                  className="overflow-hidden rounded-card"
                  style={{
                    backgroundColor: Pastels.sage,
                    borderWidth: 1.5,
                    borderColor: Brand.primarySoft,
                  }}
                >
                  <View className="flex-row items-center gap-3 px-3 py-1">
                    <View
                      className="h-9 w-9 items-center justify-center rounded-full"
                      style={{ backgroundColor: Brand.primarySoft }}
                    >
                      {selected.assigned_to ? (
                        <UserRound color={Brand.primary} size={16} strokeWidth={1.5} />
                      ) : (
                        <Plus color={Brand.primary} size={16} strokeWidth={1.5} />
                      )}
                    </View>
                    <View className="min-w-0 flex-1">
                      <ChipSelector
                        title="Assign to"
                        presentation="sheet"
                        options={[
                          { value: '', label: 'Unassigned' },
                          ...assignees.map((person) => ({
                            value: person.id,
                            label: person.full_name ?? person.role,
                          })),
                        ]}
                        value={selected.assigned_to ?? ''}
                        onChange={(assignedTo) => {
                          markComplaintSeen(selected.id);
                          updateMutation.mutate({
                            id: selected.id,
                            status: selected.status as ComplaintStatus,
                            assignedTo: assignedTo || null,
                          });
                        }}
                      />
                    </View>
                  </View>
                </View>
                <Text className="mt-2 text-xs text-ink-muted">
                  {assigneeName
                    ? `Currently with ${assigneeName}`
                    : 'Tap to assign someone on the team'}
                </Text>
              </View>
            </SectionCard>

            <SectionCard
              title="Comments"
              right={
                <Text className="text-xs font-semibold" style={{ color: Brand.primary }}>
                  {commentCount} {commentCount === 1 ? 'comment' : 'comments'}
                </Text>
              }
            >
              {commentsQuery.isLoading ? (
                <ActivityIndicator color={Brand.primary} />
              ) : commentCount === 0 ? (
                <Text className="text-sm text-ink-muted">
                  No comments yet — add the first update.
                </Text>
              ) : (
                <ScrollView
                  style={{ maxHeight: 220 }}
                  nestedScrollEnabled
                  showsVerticalScrollIndicator={false}
                >
                  {commentsQuery.data?.map((comment, index) => (
                    <View
                      key={comment.id}
                      className={`py-3 ${index > 0 ? 'border-t border-surface-border' : ''}`}
                    >
                      <Text className="text-sm text-ink" style={{ fontFamily: FontFamily.heading }}>
                        {comment.author?.full_name ?? 'Someone'}
                        {comment.author?.role ? (
                          <Text className="font-normal text-ink-muted">
                            {' '}
                            · {comment.author.role}
                          </Text>
                        ) : null}
                      </Text>
                      <Text className="mt-1 text-[14px] leading-5 text-ink">
                        {comment.content}
                      </Text>
                      <Text className="mt-1 text-xs text-ink-muted">
                        {new Date(comment.created_at).toLocaleString()}
                      </Text>
                    </View>
                  ))}
                </ScrollView>
              )}
            </SectionCard>
          </ScrollView>

          <View
            className="border-t border-surface-border bg-surface-card px-4 pb-3 pt-3"
            style={{
              shadowColor: '#0F172A',
              shadowOffset: { width: 0, height: -2 },
              shadowOpacity: 0.06,
              shadowRadius: 8,
              elevation: 6,
            }}
          >
            <View className="flex-row items-center gap-2">
              <TextInput
                className="flex-1 rounded-card bg-surface px-4 py-3 text-sm text-ink"
                placeholder="Write an update…"
                placeholderTextColor={Brand.inkMuted}
                value={commentText}
                onChangeText={setCommentText}
              />
              <Pressable
                className="h-11 w-11 items-center justify-center rounded-card"
                onPress={() => commentMutation.mutate()}
                disabled={commentMutation.isPending || !commentText.trim()}
                style={{
                  backgroundColor:
                    commentMutation.isPending || !commentText.trim()
                      ? '#D1D5DB'
                      : Brand.primary,
                }}
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
      </SafeAreaView>
    );
  }

  return (
    <ScreenHeader title="Complaints" subtitle="Grouped by category · who filed each" showBack>
      <View className="mb-2 gap-3 px-4">
        <SearchField
          value={search}
          onChangeText={setSearch}
          placeholder="Search name, flat, category…"
          accessibilityLabel="Search complaints"
        />
        <SegmentedControl
          options={[
            { value: 'all', label: 'All' },
            ...COMPLAINT_STATUSES.map((s) => ({ value: s.value, label: s.label })),
          ]}
          value={statusFilter}
          onChange={setStatusFilter}
        />
        <ChipSelector
          title="Category"
          presentation="sheet"
          options={[
            { value: 'all', label: 'All categories' },
            ...COMPLAINT_CATEGORIES.map((c) => ({ value: c, label: c })),
          ]}
          value={categoryFilter}
          onChange={setCategoryFilter}
        />
      </View>

      {listQuery.error ? (
        <ErrorBanner message={listQuery.error.message} onRetry={() => void listQuery.refetch()} />
      ) : null}
      {updateMutation.error ? (
        <ErrorBanner message={(updateMutation.error as Error).message} />
      ) : null}

      {listQuery.isLoading && !listQuery.data ? (
        <SkeletonList count={5} />
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24, flexGrow: 1 }}
          stickySectionHeadersEnabled
          refreshing={listQuery.isRefetching}
          onRefresh={() => void listQuery.refetch()}
          ListEmptyComponent={
            <EmptyState
              visual="helpdesk"
              title={search.trim() ? 'No matches' : 'No complaints'}
              subtitle={
                search.trim()
                  ? 'Try another name, flat, or clear filters.'
                  : 'Nothing matches these filters.'
              }
              actionLabel="Clear filters"
              onAction={() => {
                setStatusFilter('all');
                setCategoryFilter('all');
                setSearch('');
              }}
            />
          }
          renderSectionHeader={({ section }) => (
            <View
              className="mb-2 mt-3 flex-row items-center justify-between rounded-card px-3 py-2"
              style={{ backgroundColor: Pastels.sage }}
            >
              <Text
                className="text-xs font-bold uppercase tracking-widest text-ink"
                style={{ fontFamily: FontFamily.heading }}
              >
                {section.title}
              </Text>
              <Text className="text-xs text-ink-muted">
                {section.data.length} ticket{section.data.length === 1 ? '' : 's'}
              </Text>
            </View>
          )}
          renderItem={({ item }) => {
            const unread = isComplaintUnread(item.id);
            const name = reporterName(item);
            const statusColor = STATUS_DOT[item.status] ?? Brand.inkMuted;
            return (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${item.category} from ${name}`}
                onPress={() => {
                  markComplaintSeen(item.id);
                  setSelectedId(item.id);
                }}
                className="mb-2"
              >
                <AppCard className="flex-row items-center gap-3 p-3.5">
                  <InitialsAvatar
                    name={name}
                    seed={item.reporter?.id ?? item.id}
                    size={40}
                    hasUnread={unread}
                    imageUrl={item.reporter?.avatar_url}
                  />
                  <View className="min-w-0 flex-1">
                    <View className="flex-row items-center justify-between gap-2">
                      <Text
                        className="flex-1 text-[15px] text-ink"
                        numberOfLines={1}
                        style={{ fontFamily: FontFamily.heading }}
                      >
                        {name}
                      </Text>
                      <View className="flex-row items-center gap-1.5">
                        <View
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: statusColor }}
                        />
                        <Text className="text-[11px] font-medium text-ink-soft">
                          {complaintStatusTone(item.status).label}
                        </Text>
                      </View>
                    </View>
                    <Text className="mt-0.5 text-xs text-ink-muted" numberOfLines={1}>
                      {flatLabel(item)} · {new Date(item.created_at).toLocaleDateString()}
                    </Text>
                    <Text className="mt-0.5 text-xs text-ink-soft" numberOfLines={1}>
                      {item.description}
                    </Text>
                  </View>
                  <ChevronRight color={Brand.inkMuted} size={16} strokeWidth={1.5} />
                </AppCard>
              </Pressable>
            );
          }}
        />
      )}
    </ScreenHeader>
  );
}

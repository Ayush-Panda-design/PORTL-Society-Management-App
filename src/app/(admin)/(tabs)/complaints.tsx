import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, ChevronLeft, ChevronRight, Plus, Send, UserRound } from 'lucide-react-native';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
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
import { LinearGradient } from 'expo-linear-gradient';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

import { AvatarStack } from '@/components/ui/avatar-stack';
import { InitialsAvatar } from '@/components/ui/brand';
import { ChipSelector } from '@/components/ui/chip-selector';
import { GlassCard } from '@/components/ui/glass-card';
import { ScreenHeader } from '@/components/ui/screen-header';
import { SearchField } from '@/components/ui/search-field';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { StaggeredListItem } from '@/components/ui/staggered-list-item';
import { ThemedRefreshControl } from '@/components/ui/themed-refresh-control';
import { EmptyState } from '@/components/visitors/empty-state';
import { ErrorBanner } from '@/components/visitors/error-banner';
import { SkeletonList } from '@/components/visitors/loading-state';
import {
  Brand,
  Elevation,
  FontFamily,
  getActiveColorScheme,
  getPalette,
  getPastels,
  type PastelTone,
} from '@/constants/theme';
import { complaintCategoryMeta } from '@/lib/complaint-category';
import { complaintStatusTone } from '@/lib/community';
import {
  addComplaintComment,
  fetchComplaintComments,
  fetchComplaintsForSociety,
  fetchSocietyProfiles,
  updateComplaint,
} from '@/lib/community-api';
import { hapticConfirm } from '@/lib/haptics';
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

const STATUS_STYLE: Record<
  ComplaintStatus,
  { accent: string; bg: string; text: string; label: string }
> = {
  open: { accent: '#D97706', bg: '#FFFBEB', text: '#B45309', label: 'Open' },
  in_progress: { accent: '#2563EB', bg: '#EFF6FF', text: '#1D4ED8', label: 'In progress' },
  resolved: { accent: '#059669', bg: '#ECFDF5', text: '#047857', label: 'Resolved' },
  reopened: { accent: '#E11D48', bg: '#FFE4E8', text: '#BE123C', label: 'Reopened' },
};

const STEP_ACCENT = ['#D97706', '#2563EB', '#059669'] as const;

const PRIORITY_MARK_DEF: Record<
  ComplaintPriority,
  { accent: string; bgLight: string; bgDarkTone?: PastelTone; label: string }
> = {
  low: { accent: '#6B7280', bgLight: '#F3F4F6', label: 'Low priority' },
  medium: { accent: '#CA8A04', bgLight: '#FEF9C3', label: 'Medium priority' },
  high: { accent: '#E11D48', bgLight: '#FFE4E8', bgDarkTone: 'rose', label: 'High priority' },
  critical: { accent: '#DC2626', bgLight: '#FEE2E2', bgDarkTone: 'peach', label: 'Critical priority' },
};

function priorityMark(priority: ComplaintPriority, scheme?: 'light' | 'dark') {
  const def = PRIORITY_MARK_DEF[priority];
  const resolvedScheme = scheme ?? getActiveColorScheme();
  const palette = getPalette(resolvedScheme);
  const pastels = getPastels(resolvedScheme);
  let bg = def.bgLight;
  if (resolvedScheme === 'dark') {
    bg = def.bgDarkTone ? pastels[def.bgDarkTone] : palette.muted;
  }
  return { accent: def.accent, bg, label: def.label };
}

const TOWER_ACCENT_DEFS: { bgTone: PastelTone; textLight: string; textDark: string }[] = [
  { bgTone: 'sky', textLight: '#1E40AF', textDark: '#93C5FD' },
  { bgTone: 'lilac', textLight: '#5B21B6', textDark: '#C4B5FD' },
  { bgTone: 'peach', textLight: '#BE123C', textDark: '#FDA4AF' },
  { bgTone: 'rose', textLight: '#BE123C', textDark: '#FDA4AF' },
  { bgTone: 'butter', textLight: '#A16207', textDark: '#FCD34D' },
  { bgTone: 'coral', textLight: '#9A3412', textDark: '#FDBA74' },
];

function towerAccent(towerName: string | null, scheme?: 'light' | 'dark') {
  const resolvedScheme = scheme ?? getActiveColorScheme();
  const palette = getPalette(resolvedScheme);
  const pastels = getPastels(resolvedScheme);
  if (!towerName?.trim()) return { bg: palette.muted, text: palette.inkSoft };
  const index =
    towerName.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0) %
    TOWER_ACCENT_DEFS.length;
  const def = TOWER_ACCENT_DEFS[index]!;
  return {
    bg: pastels[def.bgTone],
    text: resolvedScheme === 'dark' ? def.textDark : def.textLight,
  };
}

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

type SectionVariant = 'elevated' | 'bordered' | 'plain';

function SectionCard({
  title,
  right,
  children,
  variant = 'bordered',
}: {
  title: string;
  right?: ReactNode;
  children: ReactNode;
  variant?: SectionVariant;
}) {
  const shellStyle =
    variant === 'elevated'
      ? {
          shadowColor: '#0F172A',
          shadowOffset: Elevation.md.shadowOffset,
          shadowOpacity: Elevation.md.shadowOpacity,
          shadowRadius: Elevation.md.shadowRadius,
          elevation: Elevation.md.elevation,
        }
      : variant === 'bordered'
        ? { borderWidth: 1, borderColor: Brand.border }
        : undefined;

  return (
    <View className="rounded-panel bg-surface-card p-4" style={shellStyle}>
      {title ? (
        <View className="mb-3 flex-row items-center justify-between">
          <Text
            className="text-xs font-bold uppercase tracking-wider text-ink-muted"
            style={{ fontFamily: FontFamily.heading }}
          >
            {title}
          </Text>
          {right}
        </View>
      ) : null}
      {children}
    </View>
  );
}

function StepNode({
  done,
  current,
  index,
  stepAccent,
  disabled,
  label,
  onPress,
}: {
  done: boolean;
  current: boolean;
  index: number;
  stepAccent: string;
  disabled?: boolean;
  label: string;
  onPress: () => void;
}) {
  const scale = useSharedValue(current ? 1.06 : 1);
  const fill = done || current ? stepAccent : '#E5E7EB';

  useEffect(() => {
    scale.value = withSpring(current ? 1.06 : 1, { damping: 14, stiffness: 320 });
  }, [current, scale]);

  const nodeStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Pressable
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={`Set status to ${label}`}
      onPress={onPress}
      className="items-center"
      style={{ width: 82 }}
    >
      <Animated.View
        className="h-9 w-9 items-center justify-center rounded-full"
        style={[{ backgroundColor: fill }, nodeStyle]}
      >
        {done && !current ? (
          <Check color="#fff" size={16} strokeWidth={2.5} />
        ) : (
          <Text
            className="text-[12px] font-bold"
            style={{ color: done || current ? '#fff' : Brand.inkMuted }}
          >
            {index + 1}
          </Text>
        )}
      </Animated.View>
      <Text
        className="mt-2 text-center text-[11px] font-semibold"
        numberOfLines={1}
        style={{
          fontFamily: FontFamily.heading,
          color: current ? Brand.ink : done ? Brand.inkSoft : Brand.inkMuted,
        }}
      >
        {label}
      </Text>
    </Pressable>
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

  const reopened = value === 'reopened';

  return (
    <View>
      <View
        className="rounded-card px-2 py-4"
        style={{ backgroundColor: '#F4F6F8' }}
      >
        <View className="flex-row items-center">
          {STATUS_FLOW.map((step, index) => {
            const done = index < activeIndex || value === 'resolved';
            const current =
              value === 'resolved'
                ? index === STATUS_FLOW.length - 1
                : index === activeIndex;
            const connectorDone = index < activeIndex || value === 'resolved';
            const stepAccent = STEP_ACCENT[index] ?? Brand.primary;

            return (
              <View key={step} className="flex-1 flex-row items-center">
                <StepNode
                  done={done}
                  current={current}
                  index={index}
                  stepAccent={stepAccent}
                  disabled={disabled}
                  label={complaintStatusTone(step).label}
                  onPress={() => onChange(step)}
                />
                {index < STATUS_FLOW.length - 1 ? (
                  <View className="mb-6 h-1.5 flex-1 overflow-hidden rounded-full bg-gray-200">
                    {connectorDone ? (
                      <LinearGradient
                        colors={[STEP_ACCENT[index], Brand.accent]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={{ flex: 1, borderRadius: 999 }}
                      />
                    ) : null}
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>
      </View>

      <Pressable
        disabled={disabled}
        onPress={() => onChange(reopened ? 'in_progress' : 'reopened')}
        className="mt-3 self-start rounded-pill px-2 py-1"
        style={{ backgroundColor: reopened ? STATUS_STYLE.reopened.bg : 'transparent' }}
      >
        <Text
          className="text-sm font-semibold"
          style={{
            color: reopened ? STATUS_STYLE.reopened.text : Brand.inkSoft,
            fontFamily: FontFamily.heading,
          }}
        >
          {reopened ? 'Move to In progress' : 'Mark as reopened'}
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
      hapticConfirm();
      Toast.show({ type: 'success', text1: 'Comment added' });
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
    const statusMeta = STATUS_STYLE[selected.status] ?? STATUS_STYLE.open;
    const statusLabel = complaintStatusTone(selected.status).label;
    const priority = selected.priority ?? 'medium';
    const priorityMeta = priorityMark(priority);
    const towerName = selected.flats ? flatTowerName(selected.flats.towers) : null;
    const towerTone = towerAccent(towerName ?? null);
    const assigneeName =
      assignees.find((p) => p.id === selected.assigned_to)?.full_name ?? null;
    const commentCount = commentsQuery.data?.length ?? 0;
    const filedAt = new Date(selected.created_at).toLocaleString(undefined, {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });

    return (
      <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
        <View className="flex-row items-start gap-3 px-5 pb-2 pt-4">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back to all complaints"
            onPress={() => {
              setSelectedId(null);
              setCommentText('');
            }}
            className="mt-0.5 h-11 w-11 items-center justify-center rounded-full border border-surface-border bg-surface-card"
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
            <View className="mt-1.5 flex-row flex-wrap items-center gap-2">
              {towerName ? (
                <View
                  className="rounded-pill px-2.5 py-0.5"
                  style={{ backgroundColor: towerTone.bg }}
                >
                  <Text
                    className="text-xs font-semibold"
                    style={{ color: towerTone.text, fontFamily: FontFamily.heading }}
                  >
                    {towerName}
                  </Text>
                </View>
              ) : null}
              <Text className="text-sm font-medium text-ink-soft" numberOfLines={1}>
                {selected.flats ? `Flat ${selected.flats.number}` : flatLabel(selected)}
              </Text>
            </View>
          </View>
        </View>

        <KeyboardAvoidingView behavior="padding" className="flex-1">
          <ScrollView
            className="flex-1"
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 28, gap: 14 }}
            showsVerticalScrollIndicator={false}
          >
            <GlassCard accentColor={statusMeta.accent}>
              <View className="flex-row items-start gap-3">
                <InitialsAvatar
                  name={name}
                  seed={selected.reporter?.id ?? selected.id}
                  size={52}
                  imageUrl={selected.reporter?.avatar_url}
                />
                <View className="min-w-0 flex-1">
                  <View
                    className="self-start flex-row items-center gap-1.5 rounded-pill px-2.5 py-1"
                    style={{ backgroundColor: statusMeta.bg }}
                  >
                    <View
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: statusMeta.accent }}
                    />
                    <Text
                      className="text-[13px] font-bold"
                      style={{ color: statusMeta.text, fontFamily: FontFamily.heading }}
                    >
                      {statusLabel}
                    </Text>
                  </View>
                  {selected.reporter?.phone ? (
                    <Text className="mt-2 text-sm text-ink-soft">{selected.reporter.phone}</Text>
                  ) : null}
                  <Text className="mt-1 text-xs text-ink-muted">Filed {filedAt}</Text>
                </View>
              </View>

              <View className="mt-4 flex-row flex-wrap items-center gap-2">
                {(() => {
                  const cat = complaintCategoryMeta(selected.category);
                  const CatIcon = cat.Icon;
                  return (
                    <View
                      className="flex-row items-center gap-1.5 rounded-pill px-2.5 py-1"
                      style={{ backgroundColor: cat.bg }}
                    >
                      <CatIcon color={cat.color} size={12} strokeWidth={1.5} />
                      <Text
                        className="text-xs font-semibold"
                        style={{ color: cat.color, fontFamily: FontFamily.heading }}
                      >
                        {selected.category}
                      </Text>
                    </View>
                  );
                })()}
                <View
                  className="rounded-pill px-2.5 py-1"
                  style={{
                    backgroundColor: priorityMeta.bg,
                    borderWidth: priority === 'high' || priority === 'critical' ? 1.5 : 0,
                    borderColor: priorityMeta.accent,
                  }}
                >
                  <Text
                    className="text-xs font-semibold"
                    style={{
                      color: priorityMeta.accent,
                      fontFamily: FontFamily.heading,
                      fontWeight: priority === 'high' || priority === 'critical' ? '700' : '600',
                    }}
                  >
                    {priorityMeta.label}
                  </Text>
                </View>
              </View>
            </GlassCard>

            <SectionCard title="Description" variant="plain">
              <Text
                className="text-[17px] leading-7 text-ink"
                style={{ fontFamily: FontFamily.heading }}
              >
                {selected.description}
              </Text>
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

            <SectionCard title="Workflow" variant="elevated">
              <StatusStepper
                value={selected.status}
                disabled={updateMutation.isPending}
                onChange={(status) => {
                  markComplaintSeen(selected.id);
                  hapticConfirm();
                  updateMutation.mutate({
                    id: selected.id,
                    status,
                    assignedTo: selected.assigned_to,
                  });
                }}
              />

              <View className="mt-5 border-t border-surface-border pt-4">
                <Text className="mb-2 text-xs font-bold uppercase tracking-wider text-ink-muted">
                  Assignee
                </Text>
                <View className="mb-2">
                  {assignees.length > 0 ? (
                    <AvatarStack
                      people={assignees.map((p) => ({
                        id: p.id,
                        name: p.full_name ?? p.role,
                        imageUrl: p.avatar_url,
                      }))}
                      max={4}
                      size={28}
                    />
                  ) : null}
                </View>
                <View className="overflow-hidden rounded-card border border-surface-border bg-surface">
                  <View className="flex-row items-center gap-3 px-3 py-2">
                    <View
                      className="h-9 w-9 items-center justify-center rounded-full"
                      style={{
                        backgroundColor: selected.assigned_to ? Brand.primarySoft : '#F3F4F6',
                      }}
                    >
                      {selected.assigned_to ? (
                        <UserRound color={Brand.primary} size={16} strokeWidth={1.5} />
                      ) : (
                        <Plus color={Brand.inkMuted} size={16} strokeWidth={1.5} />
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
                          hapticConfirm();
                          Toast.show({
                            type: 'success',
                            text1: assignedTo ? 'Staff assigned' : 'Unassigned',
                          });
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
              variant="bordered"
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
          contentContainerStyle={{ paddingBottom: 24, flexGrow: 1 }}
          stickySectionHeadersEnabled
          refreshControl={
            <ThemedRefreshControl
              refreshing={listQuery.isRefetching}
              onRefresh={() => void listQuery.refetch()}
            />
          }
          initialNumToRender={12}
          windowSize={8}
          maxToRenderPerBatch={10}
          removeClippedSubviews
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
          renderSectionHeader={({ section }) => {
            const cat = complaintCategoryMeta(section.title);
            const CatIcon = cat.Icon;
            return (
              <View className="mx-4 mb-2 mt-4">
                <View
                  className="flex-row items-center justify-between rounded-[18px] px-3.5 py-3"
                  style={{ backgroundColor: cat.bg }}
                >
                  <View className="flex-row items-center gap-2.5">
                    <View
                      className="h-9 w-9 items-center justify-center rounded-2xl bg-white"
                      style={{
                        shadowColor: '#0F172A',
                        shadowOpacity: 0.06,
                        shadowRadius: 8,
                        shadowOffset: { width: 0, height: 2 },
                        elevation: 1,
                      }}
                    >
                      <CatIcon color={cat.color} size={16} strokeWidth={1.5} />
                    </View>
                    <Text
                      className="text-[13px] font-bold uppercase tracking-widest text-ink"
                      style={{ fontFamily: FontFamily.heading }}
                    >
                      {section.title}
                    </Text>
                  </View>
                  <View className="rounded-pill bg-white/80 px-2.5 py-1">
                    <Text className="text-[11px] text-ink-muted" style={{ fontFamily: FontFamily.heading }}>
                      {section.data.length} ticket{section.data.length === 1 ? '' : 's'}
                    </Text>
                  </View>
                </View>
              </View>
            );
          }}
          renderItem={({ item, index, section }) => {
            const unread = isComplaintUnread(item.id);
            const name = reporterName(item);
            const statusMeta = STATUS_STYLE[item.status] ?? STATUS_STYLE.open;
            const cat = complaintCategoryMeta(item.category);
            const CatIcon = cat.Icon;
            const isLast = index === section.data.length - 1;
            return (
              <StaggeredListItem index={index} disabled={listQuery.isRefetching}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${item.category} from ${name}`}
                  onPress={() => {
                    markComplaintSeen(item.id);
                    setSelectedId(item.id);
                  }}
                  className="mx-4 mb-2 overflow-hidden rounded-[18px] bg-surface-card px-3.5 py-3.5"
                  style={{
                    shadowColor: '#0F172A',
                    shadowOpacity: 0.06,
                    shadowRadius: 12,
                    shadowOffset: { width: 0, height: 4 },
                    elevation: 2,
                    marginBottom: isLast ? 8 : 8,
                  }}
                >
                  <View className="flex-row items-start gap-3">
                    <View
                      className="h-11 w-11 items-center justify-center rounded-2xl"
                      style={{ backgroundColor: cat.bg }}
                    >
                      <CatIcon color={cat.color} size={18} strokeWidth={1.5} />
                      {unread ? (
                        <View
                          className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: Brand.primary }}
                        />
                      ) : null}
                    </View>
                    <View className="min-w-0 flex-1">
                      <View className="flex-row items-start justify-between gap-2">
                        <Text
                          className="min-w-0 flex-1 text-[15px] text-ink"
                          style={{ fontFamily: FontFamily.heading }}
                          numberOfLines={1}
                        >
                          {name}
                        </Text>
                        <View
                          className="rounded-pill px-2.5 py-1"
                          style={{ backgroundColor: statusMeta.bg }}
                        >
                          <Text
                            className="text-[11px]"
                            style={{ color: statusMeta.text, fontFamily: FontFamily.heading }}
                          >
                            {complaintStatusTone(item.status).label}
                          </Text>
                        </View>
                      </View>
                      <Text className="mt-1 text-[12px] text-ink-muted" numberOfLines={1}>
                        {flatLabel(item)} · {new Date(item.created_at).toLocaleDateString()}
                      </Text>
                      <Text className="mt-1.5 text-[13px] leading-[18px] text-ink-soft" numberOfLines={2}>
                        {item.description}
                      </Text>
                    </View>
                    <ChevronRight color={Brand.inkMuted} size={16} strokeWidth={1.5} style={{ marginTop: 2 }} />
                  </View>
                </Pressable>
              </StaggeredListItem>
            );
          }}
        />
      )}
    </ScreenHeader>
  );
}

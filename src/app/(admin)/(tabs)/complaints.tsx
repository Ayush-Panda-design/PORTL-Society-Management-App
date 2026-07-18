import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronRight } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Pressable, SectionList, ScrollView, Text, View } from 'react-native';

import { AppCard, InitialsAvatar } from '@/components/ui/brand';
import { ChipSelector } from '@/components/ui/chip-selector';
import { ScreenHeader } from '@/components/ui/screen-header';
import { SearchField } from '@/components/ui/search-field';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { EmptyState } from '@/components/visitors/empty-state';
import { ErrorBanner } from '@/components/visitors/error-banner';
import { SkeletonList } from '@/components/visitors/loading-state';
import { Brand, FontFamily, Pastels } from '@/constants/theme';
import { complaintStatusTone } from '@/lib/community';
import {
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
  type ComplaintStatus,
  type ComplaintWithFlat,
} from '@/types/database';

type ComplaintSection = {
  title: string;
  data: ComplaintWithFlat[];
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

  const filtered = useMemo(() => {
    return (listQuery.data ?? []).filter((item) => {
      if (statusFilter !== 'all' && item.status !== statusFilter) return false;
      if (categoryFilter !== 'all' && item.category !== categoryFilter) return false;
      return matchesComplaint(item, search);
    });
  }, [listQuery.data, statusFilter, categoryFilter, search]);

  /** Group by category so Plumbing tickets from many people sit together. */
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
        // Newest first within the category
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
    const tone = complaintStatusTone(selected.status);
    const name = reporterName(selected);
    return (
      <ScreenHeader title="Complaint" subtitle={selected.category}>
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
        >
          <Pressable onPress={() => setSelectedId(null)} className="mb-4 self-start">
            <Text className="font-semibold text-brand-700">← All complaints</Text>
          </Pressable>

          <View className="mb-4 flex-row items-center gap-3">
            <InitialsAvatar
              name={name}
              seed={selected.reporter?.id ?? selected.id}
              size={52}
              imageUrl={selected.reporter?.avatar_url}
            />
            <View className="min-w-0 flex-1">
              <Text className="text-lg text-ink" style={{ fontFamily: FontFamily.display }}>
                {name}
              </Text>
              <Text className="mt-0.5 text-xs text-ink-muted">{flatLabel(selected)}</Text>
              {selected.reporter?.phone ? (
                <Text className="mt-0.5 text-xs text-ink-muted">{selected.reporter.phone}</Text>
              ) : null}
            </View>
            <View className={`rounded-full border px-2.5 py-1 ${tone.bg} ${tone.border}`}>
              <Text className={`text-xs font-medium ${tone.text}`}>{tone.label}</Text>
            </View>
          </View>

          <View
            className="mb-4 self-start rounded-pill px-3 py-1"
            style={{ backgroundColor: Pastels.mint }}
          >
            <Text className="text-xs font-semibold" style={{ color: Brand.primary }}>
              {selected.category}
            </Text>
          </View>

          <Text className="mb-1 text-xs text-ink-muted">
            Filed {new Date(selected.created_at).toLocaleString()}
          </Text>

          <Text
            className="mb-2 mt-4 text-xs font-bold uppercase tracking-widest text-ink-muted"
            style={{ fontFamily: FontFamily.heading }}
          >
            Description
          </Text>
          <Text className="mb-6 text-[15px] leading-6 text-ink">{selected.description}</Text>

          <Text className="mb-2 text-xs font-semibold uppercase text-ink-muted">Status</Text>
          <SegmentedControl
            className="mb-4"
            options={COMPLAINT_STATUSES.map((s) => ({
              value: s.value,
              label: s.label,
            }))}
            value={selected.status}
            onChange={(status) => {
              markComplaintSeen(selected.id);
              updateMutation.mutate({
                id: selected.id,
                status,
                assignedTo: selected.assigned_to,
              });
            }}
          />

          <Text className="mb-2 text-xs font-semibold uppercase text-ink-muted">
            Assign (optional)
          </Text>
          <ChipSelector
            title="Assignee"
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

          {selected.assigned_to ? (
            <Text className="mt-3 text-xs text-ink-muted">
              Assigned to{' '}
              {assignees.find((p) => p.id === selected.assigned_to)?.full_name ??
                'society staff'}
            </Text>
          ) : null}
        </ScrollView>
      </ScreenHeader>
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
            const tone = complaintStatusTone(item.status);
            const unread = isComplaintUnread(item.id);
            const name = reporterName(item);
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
                      <View className={`rounded-full border px-2 py-0.5 ${tone.bg} ${tone.border}`}>
                        <Text className={`text-[10px] font-medium ${tone.text}`}>
                          {tone.label}
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

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';

import { InitialsAvatar } from '@/components/ui/brand';
import { ChipSelector } from '@/components/ui/chip-selector';
import { ScreenHeader } from '@/components/ui/screen-header';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { EmptyState } from '@/components/visitors/empty-state';
import { ErrorBanner } from '@/components/visitors/error-banner';
import { SkeletonList } from '@/components/visitors/loading-state';
import { complaintStatusTone } from '@/lib/community';
import {
  fetchComplaintsForSociety,
  fetchSocietyProfiles,
  updateComplaint,
} from '@/lib/community-api';
import { queryKeys } from '@/lib/query-client';
import { useAuthStore } from '@/stores/authStore';
import { useCommunityUiStore } from '@/stores/communityUiStore';
import { useReadStateStore } from '@/stores/readStateStore';
import {
  COMPLAINT_CATEGORIES,
  COMPLAINT_STATUSES,
  type ComplaintStatus,
  type ComplaintWithFlat,
} from '@/types/database';

export default function AdminComplaintsScreen() {
  const societyId = useAuthStore((s) => s.profile?.society_id);
  const queryClient = useQueryClient();
  const statusFilter = useCommunityUiStore((s) => s.complaintStatusFilter);
  const categoryFilter = useCommunityUiStore((s) => s.complaintCategoryFilter);
  const setStatusFilter = useCommunityUiStore((s) => s.setComplaintStatusFilter);
  const setCategoryFilter = useCommunityUiStore((s) => s.setComplaintCategoryFilter);
  const isComplaintUnread = useReadStateStore((s) => s.isComplaintUnread);
  const markComplaintSeen = useReadStateStore((s) => s.markComplaintSeen);

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
      return true;
    });
  }, [listQuery.data, statusFilter, categoryFilter]);

  if (!societyId) {
    return (
      <ScreenHeader title="Complaints" showBack>
        <EmptyState visual="disconnected" title="No society linked" subtitle="Assign a society to your admin profile." />
      </ScreenHeader>
    );
  }

  const assignees = (profilesQuery.data ?? []).filter(
    (p) => p.role === 'admin' || p.role === 'guard',
  );

  return (
    <ScreenHeader title="Complaints" subtitle="Society helpdesk queue" showBack>
      <View className="mb-3 gap-3 px-4">
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
        <SkeletonList count={4} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24, flexGrow: 1 }}
          ItemSeparatorComponent={() => <View className="h-3" />}
          refreshing={listQuery.isRefetching}
          onRefresh={() => void listQuery.refetch()}
          ListEmptyComponent={
            <EmptyState visual="helpdesk" title="No complaints" subtitle="Nothing matches these filters." />
          }
          renderItem={({ item }) => {
            const tone = complaintStatusTone(item.status);
            const unread = isComplaintUnread(item.id);
            return (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${item.category} complaint, Flat ${item.flats?.number ?? 'unknown'}, status ${tone.label}${unread ? ', unread' : ''}`}
                onPress={() => markComplaintSeen(item.id)}
                onFocus={() => markComplaintSeen(item.id)}
                className="rounded-2xl border border-slate-200 bg-surface-card p-4"
              >
                <View className="mb-1 flex-row items-center justify-between gap-2">
                  <View className="flex-1 flex-row items-center gap-2">
                    <InitialsAvatar name={item.category} seed={item.id} size={32} hasUnread={unread} />
                    <Text className="flex-1 text-base font-semibold text-slate-900">
                      {item.category}
                    </Text>
                  </View>
                  <View className={`rounded-full border px-2 py-0.5 ${tone.bg} ${tone.border}`}>
                    <Text className={`text-xs font-medium ${tone.text}`}>{tone.label}</Text>
                  </View>
                </View>
                <Text className="mb-1 text-xs text-slate-400">
                  Flat {item.flats?.number ?? '—'} · {new Date(item.created_at).toLocaleString()}
                </Text>
                <Text className="mb-3 text-sm text-slate-600">{item.description}</Text>
                {item.assigned_to ? (
                  <Text className="mb-3 text-xs text-slate-500">
                    Assigned to{' '}
                    {assignees.find((p) => p.id === item.assigned_to)?.full_name ??
                      'society staff'}
                  </Text>
                ) : null}

                <Text className="mb-2 text-xs font-semibold uppercase text-slate-500">Status</Text>
                <SegmentedControl
                  className="mb-3"
                  options={COMPLAINT_STATUSES.map((s) => ({
                    value: s.value,
                    label: s.label,
                  }))}
                  value={item.status}
                  onChange={(status) => {
                    markComplaintSeen(item.id);
                    updateMutation.mutate({
                      id: item.id,
                      status,
                      assignedTo: item.assigned_to,
                    });
                  }}
                />

                <Text className="mb-2 text-xs font-semibold uppercase text-slate-500">
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
                  value={item.assigned_to ?? ''}
                  onChange={(assignedTo) => {
                    markComplaintSeen(item.id);
                    updateMutation.mutate({
                      id: item.id,
                      status: item.status as ComplaintStatus,
                      assignedTo: assignedTo || null,
                    });
                  }}
                />
              </Pressable>
            );
          }}
        />
      )}
    </ScreenHeader>
  );
}

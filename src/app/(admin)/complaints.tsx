import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';

import { EmptyState } from '@/components/visitors/empty-state';
import { ErrorBanner } from '@/components/visitors/error-banner';
import { SkeletonList } from '@/components/visitors/loading-state';
import { ScreenHeader } from '@/components/ui/screen-header';
import { complaintStatusTone } from '@/lib/community';
import {
  fetchComplaintsForSociety,
  fetchSocietyProfiles,
  updateComplaint,
} from '@/lib/community-api';
import { queryKeys } from '@/lib/query-client';
import { useAuthStore } from '@/stores/authStore';
import { useCommunityUiStore } from '@/stores/communityUiStore';
import {
  COMPLAINT_CATEGORIES,
  COMPLAINT_STATUSES,
  type ComplaintStatus,
} from '@/types/database';

export default function AdminComplaintsScreen() {
  const societyId = useAuthStore((s) => s.profile?.society_id);
  const queryClient = useQueryClient();
  const statusFilter = useCommunityUiStore((s) => s.complaintStatusFilter);
  const categoryFilter = useCommunityUiStore((s) => s.complaintCategoryFilter);
  const setStatusFilter = useCommunityUiStore((s) => s.setComplaintStatusFilter);
  const setCategoryFilter = useCommunityUiStore((s) => s.setComplaintCategoryFilter);

  const listQuery = useQuery({
    queryKey: queryKeys.complaints(`society:${societyId ?? 'none'}`),
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
    onSuccess: async () => {
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
        <EmptyState title="No society linked" subtitle="Assign a society to your admin profile." />
      </ScreenHeader>
    );
  }

  const assignees = (profilesQuery.data ?? []).filter(
    (p) => p.role === 'admin' || p.role === 'guard',
  );

  return (
    <ScreenHeader title="Complaints" subtitle="Society helpdesk queue" showBack>
      <View className="mb-2 px-4">
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={[{ value: 'all' as const, label: 'All statuses' }, ...COMPLAINT_STATUSES]}
          keyExtractor={(item) => item.value}
          contentContainerStyle={{ gap: 8, paddingBottom: 8 }}
          renderItem={({ item }) => {
            const selected = statusFilter === item.value;
            return (
              <Pressable
                onPress={() => setStatusFilter(item.value)}
                className={`rounded-full border px-3 py-1.5 ${
                  selected ? 'border-teal-700 bg-teal-50' : 'border-slate-200 bg-white'
                }`}
              >
                <Text
                  className={`text-xs font-semibold ${
                    selected ? 'text-teal-800' : 'text-slate-600'
                  }`}
                >
                  {item.label}
                </Text>
              </Pressable>
            );
          }}
        />
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={['all', ...COMPLAINT_CATEGORIES]}
          keyExtractor={(item) => item}
          contentContainerStyle={{ gap: 8 }}
          renderItem={({ item }) => {
            const selected = categoryFilter === item;
            return (
              <Pressable
                onPress={() => setCategoryFilter(item)}
                className={`rounded-full border px-3 py-1.5 ${
                  selected ? 'border-teal-700 bg-teal-50' : 'border-slate-200 bg-white'
                }`}
              >
                <Text
                  className={`text-xs font-semibold ${
                    selected ? 'text-teal-800' : 'text-slate-600'
                  }`}
                >
                  {item === 'all' ? 'All categories' : item}
                </Text>
              </Pressable>
            );
          }}
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
            <EmptyState title="No complaints" subtitle="Nothing matches these filters." />
          }
          renderItem={({ item }) => {
            const tone = complaintStatusTone(item.status);
            return (
              <View className="rounded-2xl border border-slate-200 bg-white p-4">
                <View className="mb-1 flex-row justify-between gap-2">
                  <Text className="flex-1 text-base font-semibold text-slate-900">
                    {item.category}
                  </Text>
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
                <View className="mb-3 flex-row flex-wrap gap-2">
                  {COMPLAINT_STATUSES.map((status) => (
                    <Pressable
                      key={status.value}
                      onPress={() =>
                        updateMutation.mutate({
                          id: item.id,
                          status: status.value,
                          assignedTo: item.assigned_to,
                        })
                      }
                      className={`rounded-full border px-3 py-1.5 ${
                        item.status === status.value
                          ? 'border-teal-700 bg-teal-50'
                          : 'border-slate-200'
                      }`}
                    >
                      <Text
                        className={`text-xs font-semibold ${
                          item.status === status.value ? 'text-teal-800' : 'text-slate-600'
                        }`}
                      >
                        {status.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                <Text className="mb-2 text-xs font-semibold uppercase text-slate-500">
                  Assign (optional)
                </Text>
                <View className="flex-row flex-wrap gap-2">
                  <Pressable
                    onPress={() =>
                      updateMutation.mutate({
                        id: item.id,
                        status: item.status as ComplaintStatus,
                        assignedTo: null,
                      })
                    }
                    className={`rounded-full border px-3 py-1.5 ${
                      !item.assigned_to ? 'border-teal-700 bg-teal-50' : 'border-slate-200'
                    }`}
                  >
                    <Text className="text-xs font-semibold text-slate-700">Unassigned</Text>
                  </Pressable>
                  {assignees.map((person) => (
                    <Pressable
                      key={person.id}
                      onPress={() =>
                        updateMutation.mutate({
                          id: item.id,
                          status: item.status as ComplaintStatus,
                          assignedTo: person.id,
                        })
                      }
                      className={`rounded-full border px-3 py-1.5 ${
                        item.assigned_to === person.id
                          ? 'border-teal-700 bg-teal-50'
                          : 'border-slate-200'
                      }`}
                    >
                      <Text className="text-xs font-semibold text-slate-700">
                        {person.full_name ?? person.role}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            );
          }}
        />
      )}
    </ScreenHeader>
  );
}

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  Text,
  View,
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';

import { AppCard, InitialsAvatar } from '@/components/ui/brand';
import { ChipSelector } from '@/components/ui/chip-selector';
import { ScreenHeader } from '@/components/ui/screen-header';
import { SearchField } from '@/components/ui/search-field';
import { EmptyState } from '@/components/visitors/empty-state';
import { ErrorBanner } from '@/components/visitors/error-banner';
import { SkeletonList } from '@/components/visitors/loading-state';
import {
  assignResidentFlat,
  fetchFlats,
  fetchResidents,
} from '@/lib/community-api';
import { queryKeys } from '@/lib/query-client';
import { flatTowerName } from '@/lib/visitors';
import { useAuthStore } from '@/stores/authStore';
import type { ProfileWithFlat } from '@/types/database';

function flatLabel(profile: ProfileWithFlat): string {
  if (!profile.flats) return 'No flat assigned';
  const tower = flatTowerName(profile.flats.towers);
  return tower ? `${tower} · Flat ${profile.flats.number}` : `Flat ${profile.flats.number}`;
}

function matchesSearch(profile: ProfileWithFlat, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const haystack = [profile.full_name ?? '', profile.phone ?? '', flatLabel(profile)]
    .join(' ')
    .toLowerCase();
  return haystack.includes(q);
}

export default function AdminResidentsScreen() {
  const societyId = useAuthStore((s) => s.profile?.society_id);
  const queryClient = useQueryClient();
  const residentsKey = queryKeys.residents(societyId ?? 'none');

  const [search, setSearch] = useState('');
  const [assignOpen, setAssignOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selected, setSelected] = useState<ProfileWithFlat | null>(null);
  const [flatId, setFlatId] = useState<string>('none');
  const [formError, setFormError] = useState<string | null>(null);

  const listQuery = useQuery({
    queryKey: residentsKey,
    queryFn: () => fetchResidents(societyId!),
    enabled: Boolean(societyId),
  });

  const flatsQuery = useQuery({
    queryKey: queryKeys.flats(societyId ?? 'none'),
    queryFn: () => fetchFlats(societyId!),
    enabled: Boolean(societyId),
  });

  const flatOptions = useMemo(
    () => [
      { value: 'none', label: 'Unassigned' },
      ...(flatsQuery.data ?? []).map((f) => {
        const tower = flatTowerName(f.towers);
        return {
          value: f.id,
          label: tower ? `${tower} · ${f.number}` : `Flat ${f.number}`,
        };
      }),
    ],
    [flatsQuery.data],
  );

  const filtered = useMemo(
    () => (listQuery.data ?? []).filter((p) => matchesSearch(p, search)),
    [listQuery.data, search],
  );

  const assignMutation = useMutation({
    mutationFn: async () => {
      if (!selected) throw new Error('No resident selected.');
      await assignResidentFlat({
        profileId: selected.id,
        flatId: flatId === 'none' ? null : flatId,
      });
    },
    onMutate: async () => {
      if (!selected) return { previous: undefined };
      await queryClient.cancelQueries({ queryKey: residentsKey });
      const previous = queryClient.getQueryData<ProfileWithFlat[]>(residentsKey);
      const nextFlat =
        flatId === 'none'
          ? null
          : (flatsQuery.data ?? []).find((f) => f.id === flatId) ?? null;

      queryClient.setQueryData<ProfileWithFlat[]>(residentsKey, (old = []) =>
        old.map((p) =>
          p.id === selected.id
            ? {
                ...p,
                flat_id: nextFlat?.id ?? null,
                flats: nextFlat
                  ? {
                      id: nextFlat.id,
                      number: nextFlat.number,
                      towers: nextFlat.towers
                        ? Array.isArray(nextFlat.towers)
                          ? nextFlat.towers[0]
                            ? {
                                id: nextFlat.towers[0].id,
                                name: nextFlat.towers[0].name,
                              }
                            : null
                          : {
                              id: nextFlat.towers.id,
                              name: nextFlat.towers.name,
                            }
                        : null,
                    }
                  : null,
              }
            : p,
        ),
      );
      return { previous };
    },
    onError: (e: Error, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(residentsKey, context.previous);
      setFormError(e.message);
    },
    onSuccess: () => {
      setAssignOpen(false);
      setFormError(null);
      setSelected(null);
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: residentsKey });
      if (societyId) {
        await queryClient.invalidateQueries({
          queryKey: queryKeys.adminDashboard(societyId),
        });
        await queryClient.invalidateQueries({
          queryKey: queryKeys.societyProfiles(societyId),
        });
      }
    },
  });

  const openDetail = (item: ProfileWithFlat) => {
    setSelected(item);
    setDetailOpen(true);
  };

  const openAssign = (item: ProfileWithFlat) => {
    setSelected(item);
    setFlatId(item.flat_id ?? 'none');
    setFormError(null);
    setAssignOpen(true);
  };

  if (!societyId) {
    return (
      <ScreenHeader title="Residents">
        <EmptyState
          visual="disconnected"
          title="No society linked"
          subtitle="Assign a society to your admin profile."
        />
      </ScreenHeader>
    );
  }

  return (
    <ScreenHeader title="Residents" subtitle="Assign members to flats">
      <View className="px-4">
        <SearchField
          value={search}
          onChangeText={setSearch}
          placeholder="Search by name, phone, or flat"
          accessibilityLabel="Search residents"
        />
      </View>

      {listQuery.error ? (
        <ErrorBanner message={listQuery.error.message} onRetry={() => void listQuery.refetch()} />
      ) : null}

      {listQuery.isLoading && !listQuery.data ? (
        <SkeletonList count={5} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24, flexGrow: 1 }}
          ItemSeparatorComponent={() => <View className="h-3" />}
          refreshing={listQuery.isRefetching}
          onRefresh={() => void listQuery.refetch()}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <EmptyState
              visual="visitors"
              title={search.trim() ? 'No matches' : 'No residents yet'}
              subtitle={
                search.trim()
                  ? 'Try a different name, phone, or flat.'
                  : 'Residents appear here after they sign up with the resident role.'
              }
            />
          }
          renderItem={({ item }) => (
            <AppCard>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`View ${item.full_name ?? 'resident'} profile`}
                onPress={() => openDetail(item)}
                className="flex-row items-center gap-3"
              >
                <InitialsAvatar
                  name={item.full_name ?? 'Resident'}
                  seed={item.id}
                  size={44}
                  hasUnread={!item.flat_id}
                />
                <View className="min-w-0 flex-1">
                  <Text className="text-base font-semibold text-ink" numberOfLines={1}>
                    {item.full_name ?? 'Unnamed resident'}
                  </Text>
                  <Text className="text-sm text-ink-muted" numberOfLines={1}>
                    {flatLabel(item)}
                  </Text>
                  {item.phone ? (
                    <Text className="mt-0.5 text-xs text-ink-faint">{item.phone}</Text>
                  ) : null}
                </View>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={
                  item.flat_id
                    ? `Reassign flat for ${item.full_name ?? 'resident'}`
                    : `Assign flat for ${item.full_name ?? 'resident'}`
                }
                onPress={() => openAssign(item)}
                className="mt-3 items-center rounded-xl border border-surface-border py-2.5"
              >
                <Text className="text-sm font-semibold text-ink-soft">
                  {item.flat_id ? 'Reassign flat' : 'Assign flat'}
                </Text>
              </Pressable>
            </AppCard>
          )}
        />
      )}

      <Modal visible={detailOpen} animationType="slide" transparent>
        <View className="flex-1 justify-end bg-black/40">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close profile"
            className="absolute inset-0"
            onPress={() => setDetailOpen(false)}
          />
          <View className="rounded-t-3xl bg-surface-card px-5 pb-10 pt-5">
            <View className="mb-4 items-center">
              <View className="mb-3 h-1 w-10 rounded-full bg-slate-200" />
              <InitialsAvatar
                name={selected?.full_name ?? 'Resident'}
                seed={selected?.id}
                size={64}
              />
              <Text className="mt-3 text-xl font-bold text-slate-900">
                {selected?.full_name ?? 'Unnamed resident'}
              </Text>
              <Text className="mt-1 text-sm text-slate-500">Resident profile</Text>
            </View>

            <View className="mb-4 gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
              <DetailRow label="Phone" value={selected?.phone ?? '—'} />
              <DetailRow label="Flat" value={selected ? flatLabel(selected) : '—'} />
              <DetailRow
                label="Joined"
                value={
                  selected?.created_at
                    ? new Date(selected.created_at).toLocaleDateString()
                    : '—'
                }
              />
            </View>

            <View className="flex-row gap-2">
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close"
                onPress={() => setDetailOpen(false)}
                className="flex-1 items-center rounded-xl border border-slate-200 py-3"
              >
                <Text className="font-semibold text-slate-700">Close</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Assign flat"
                onPress={() => {
                  if (!selected) return;
                  setDetailOpen(false);
                  openAssign(selected);
                }}
                className="flex-1 items-center rounded-xl bg-brand-700 py-3"
              >
                <Text className="font-semibold text-white">
                  {selected?.flat_id ? 'Reassign' : 'Assign flat'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={assignOpen} animationType="slide" transparent>
        <KeyboardAvoidingView behavior="padding" className="flex-1 justify-end bg-black/40">
          <View className="max-h-[90%] rounded-t-3xl bg-surface-card px-5 pb-10 pt-5">
            <Text className="mb-1 text-xl font-bold text-slate-900">
              {selected?.flat_id ? 'Reassign flat' : 'Assign flat'}
            </Text>
            <Text className="mb-4 text-sm text-slate-500">
              {selected?.full_name ?? 'Resident'}
            </Text>
            {formError ? <Text className="mb-2 text-sm text-red-600">{formError}</Text> : null}

            {(flatsQuery.data?.length ?? 0) === 0 ? (
              <Text className="mb-4 text-sm text-slate-600">
                No flats exist yet. Create towers and flats first, then assign residents.
              </Text>
            ) : (
              <View className="mb-4">
                <ChipSelector
                  title="Flat"
                  presentation="sheet"
                  options={flatOptions}
                  value={flatId}
                  onChange={setFlatId}
                />
              </View>
            )}

            <View className="flex-row gap-2">
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Cancel"
                onPress={() => setAssignOpen(false)}
                className="flex-1 items-center rounded-xl border border-slate-200 py-3"
              >
                <Text className="font-semibold text-slate-700">Cancel</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Save flat assignment"
                onPress={() => assignMutation.mutate()}
                disabled={assignMutation.isPending || (flatsQuery.data?.length ?? 0) === 0}
                className="flex-1 items-center rounded-xl bg-brand-700 py-3"
              >
                {assignMutation.isPending ? (
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

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-start justify-between gap-3">
      <Text className="text-sm text-slate-500">{label}</Text>
      <Text className="flex-1 text-right text-sm font-medium text-slate-900">{value}</Text>
    </View>
  );
}

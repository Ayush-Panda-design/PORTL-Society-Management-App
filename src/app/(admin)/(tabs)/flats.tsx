import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { ChevronDown, Pencil, Plus, Trash2 } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  SectionList,
  Text,
  TextInput,
  View,
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';

import { ChipSelector } from '@/components/ui/chip-selector';
import { ScreenHeader } from '@/components/ui/screen-header';
import { SearchField } from '@/components/ui/search-field';
import { EmptyState } from '@/components/visitors/empty-state';
import { ErrorBanner } from '@/components/visitors/error-banner';
import { SkeletonList } from '@/components/visitors/loading-state';
import { Brand, FontFamily, Pastels } from '@/constants/theme';
import {
  deleteFlat,
  fetchFlats,
  fetchResidents,
  fetchTowers,
  upsertFlat,
} from '@/lib/community-api';
import { queryKeys } from '@/lib/query-client';
import { flatTowerName } from '@/lib/visitors';
import { useAuthStore } from '@/stores/authStore';
import type { FlatWithTower } from '@/types/database';

type FlatSection = {
  title: string;
  towerId: string;
  data: FlatWithTower[];
};

function RowActions({
  onEdit,
  onDelete,
  deletePending,
  editLabel,
  deleteLabel,
}: {
  onEdit: () => void;
  onDelete: () => void;
  deletePending?: boolean;
  editLabel: string;
  deleteLabel: string;
}) {
  return (
    <View className="flex-row items-center gap-1">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={editLabel}
        onPress={onEdit}
        className="h-10 w-10 items-center justify-center rounded-full"
        hitSlop={4}
      >
        <Pencil color={Brand.inkSoft} size={18} strokeWidth={1.5} />
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={deleteLabel}
        onPress={onDelete}
        disabled={deletePending}
        className="h-10 w-10 items-center justify-center rounded-full"
        hitSlop={4}
      >
        <Trash2 color={Brand.inkMuted} size={18} strokeWidth={1.5} />
      </Pressable>
    </View>
  );
}

export default function AdminFlatsScreen() {
  const societyId = useAuthStore((s) => s.profile?.society_id);
  const queryClient = useQueryClient();
  const params = useLocalSearchParams<{ towerId?: string }>();
  const flatsKey = queryKeys.flats(societyId ?? 'none');
  const towersKey = queryKeys.towers(societyId ?? 'none');

  const [towerFilter, setTowerFilter] = useState(params.towerId ?? 'all');
  const [search, setSearch] = useState('');
  const [towerSheetOpen, setTowerSheetOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<FlatWithTower | null>(null);
  const [towerId, setTowerId] = useState('');
  const [number, setNumber] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const towersQuery = useQuery({
    queryKey: towersKey,
    queryFn: () => fetchTowers(societyId!),
    enabled: Boolean(societyId),
  });

  const listQuery = useQuery({
    queryKey: flatsKey,
    queryFn: () => fetchFlats(societyId!),
    enabled: Boolean(societyId),
  });

  const residentsQuery = useQuery({
    queryKey: queryKeys.residents(societyId ?? 'none'),
    queryFn: () => fetchResidents(societyId!),
    enabled: Boolean(societyId),
  });

  const occupiedFlatIds = useMemo(() => {
    const set = new Set<string>();
    for (const resident of residentsQuery.data ?? []) {
      if (resident.flat_id) set.add(resident.flat_id);
    }
    return set;
  }, [residentsQuery.data]);

  const filtered = useMemo(() => {
    let rows = listQuery.data ?? [];
    if (towerFilter !== 'all') {
      rows = rows.filter((f) => f.tower_id === towerFilter);
    }
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((f) => {
      const tower = flatTowerName(f.towers) ?? '';
      const haystack = `${f.number} ${tower}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [listQuery.data, towerFilter, search]);

  const sections = useMemo((): FlatSection[] => {
    if (towerFilter !== 'all') {
      const tower = (towersQuery.data ?? []).find((t) => t.id === towerFilter);
      return [
        {
          title: tower?.name ?? 'Tower',
          towerId: towerFilter,
          data: [...filtered].sort((a, b) => a.number.localeCompare(b.number, undefined, { numeric: true })),
        },
      ];
    }

    const byTower = new Map<string, FlatWithTower[]>();
    for (const flat of filtered) {
      const list = byTower.get(flat.tower_id) ?? [];
      list.push(flat);
      byTower.set(flat.tower_id, list);
    }

    const towerOrder = towersQuery.data ?? [];
    const known = new Set(towerOrder.map((t) => t.id));
    const sectionsFromTowers = towerOrder
      .filter((t) => byTower.has(t.id))
      .map((t) => ({
        title: t.name,
        towerId: t.id,
        data: (byTower.get(t.id) ?? []).sort((a, b) =>
          a.number.localeCompare(b.number, undefined, { numeric: true }),
        ),
      }));

    const extras = [...byTower.keys()]
      .filter((id) => !known.has(id))
      .map((id) => ({
        title: flatTowerName(byTower.get(id)?.[0]?.towers) ?? 'Unknown tower',
        towerId: id,
        data: (byTower.get(id) ?? []).sort((a, b) =>
          a.number.localeCompare(b.number, undefined, { numeric: true }),
        ),
      }));

    return [...sectionsFromTowers, ...extras];
  }, [filtered, towerFilter, towersQuery.data]);

  const towerOptions = useMemo(
    () => [
      { value: 'all', label: 'All towers' },
      ...(towersQuery.data ?? []).map((t) => ({ value: t.id, label: t.name })),
    ],
    [towersQuery.data],
  );

  const formTowerOptions = useMemo(
    () => (towersQuery.data ?? []).map((t) => ({ value: t.id, label: t.name })),
    [towersQuery.data],
  );

  const towerFilterLabel =
    towerOptions.find((o) => o.value === towerFilter)?.label ?? 'All towers';

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!societyId) throw new Error('No society linked.');
      if (!towerId) throw new Error('Select a tower.');
      if (!number.trim()) throw new Error('Flat number is required.');
      return upsertFlat({
        id: editing?.id,
        towerId,
        number: number.trim(),
      });
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: flatsKey });
      const previous = queryClient.getQueryData<FlatWithTower[]>(flatsKey);
      const trimmed = number.trim();
      const tower = (towersQuery.data ?? []).find((t) => t.id === towerId);
      if (!trimmed || !tower) return { previous };

      if (editing) {
        queryClient.setQueryData<FlatWithTower[]>(flatsKey, (old = []) =>
          old.map((f) =>
            f.id === editing.id
              ? {
                  ...f,
                  tower_id: towerId,
                  number: trimmed,
                  towers: {
                    id: tower.id,
                    name: tower.name,
                    society_id: tower.society_id,
                  },
                }
              : f,
          ),
        );
      } else {
        const optimistic: FlatWithTower = {
          id: `temp-${Date.now()}`,
          tower_id: towerId,
          number: trimmed,
          towers: {
            id: tower.id,
            name: tower.name,
            society_id: tower.society_id,
          },
        };
        queryClient.setQueryData<FlatWithTower[]>(flatsKey, (old = []) =>
          [...old, optimistic].sort((a, b) => a.number.localeCompare(b.number)),
        );
      }
      return { previous };
    },
    onError: (e: Error, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(flatsKey, context.previous);
      setFormError(e.message);
    },
    onSuccess: () => {
      setModalOpen(false);
      setEditing(null);
      setFormError(null);
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: flatsKey });
      if (societyId) {
        await queryClient.invalidateQueries({ queryKey: queryKeys.residents(societyId) });
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteFlat,
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: flatsKey });
      const previous = queryClient.getQueryData<FlatWithTower[]>(flatsKey);
      queryClient.setQueryData<FlatWithTower[]>(flatsKey, (old = []) =>
        old.filter((f) => f.id !== id),
      );
      return { previous };
    },
    onError: (e: Error, _id, context) => {
      if (context?.previous) queryClient.setQueryData(flatsKey, context.previous);
      Alert.alert('Could not delete flat', e.message);
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: flatsKey });
      if (societyId) {
        await queryClient.invalidateQueries({ queryKey: queryKeys.residents(societyId) });
      }
    },
  });

  const openCreate = () => {
    const defaultTower =
      towerFilter !== 'all' ? towerFilter : (towersQuery.data?.[0]?.id ?? '');
    setEditing(null);
    setTowerId(defaultTower);
    setNumber('');
    setFormError(null);
    setModalOpen(true);
  };

  const openEdit = (item: FlatWithTower) => {
    setEditing(item);
    setTowerId(item.tower_id);
    setNumber(item.number);
    setFormError(null);
    setModalOpen(true);
  };

  const confirmDelete = (item: FlatWithTower) => {
    const tower = flatTowerName(item.towers);
    Alert.alert(
      'Delete flat?',
      `Flat ${item.number}${tower ? ` in ${tower}` : ''} will be removed. Residents linked to it will be unassigned.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteMutation.mutate(item.id),
        },
      ],
    );
  };

  if (!societyId) {
    return (
      <ScreenHeader title="Flats" showBack>
        <EmptyState
          visual="disconnected"
          title="No society linked"
          subtitle="Assign a society to your admin profile."
        />
      </ScreenHeader>
    );
  }

  const noTowers = (towersQuery.data?.length ?? 0) === 0 && !towersQuery.isLoading;
  const showAddLabel = (listQuery.data?.length ?? 0) === 0;
  const showTowerInline = towerFilter === 'all';
  const searchQuery = search.trim();

  return (
    <ScreenHeader
      title="Flats"
      subtitle="Units within towers"
      showBack
      right={
        <Pressable
          onPress={openCreate}
          disabled={noTowers}
          accessibilityRole="button"
          accessibilityLabel="Add flat"
          className={`flex-row items-center justify-center rounded-pill ${
            showAddLabel && !noTowers ? 'gap-1.5 px-3.5 py-2.5' : 'h-11 w-11'
          }`}
          style={{
            backgroundColor: noTowers ? '#D1D5DB' : Brand.charcoal,
          }}
        >
          <Plus color="#fff" size={18} strokeWidth={2} />
          {showAddLabel && !noTowers ? (
            <Text className="text-sm font-semibold text-white" style={{ fontFamily: FontFamily.heading }}>
              Add flat
            </Text>
          ) : null}
        </Pressable>
      }
    >
      <View className="mb-2 flex-row items-center gap-2 px-4">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Filter by tower, currently ${towerFilterLabel}`}
          onPress={() => setTowerSheetOpen(true)}
          className="max-w-[42%] flex-row items-center gap-1 rounded-pill px-3 py-2.5"
          style={{ backgroundColor: Pastels.sage }}
        >
          <Text
            className="shrink text-sm font-semibold text-ink"
            numberOfLines={1}
            style={{ fontFamily: FontFamily.heading }}
          >
            {towerFilterLabel}
          </Text>
          <ChevronDown color={Brand.inkSoft} size={16} strokeWidth={1.5} />
        </Pressable>
        <View className="min-w-0 flex-1">
          <SearchField
            value={search}
            onChangeText={setSearch}
            placeholder="Search flat or tower"
            accessibilityLabel="Search flats"
          />
        </View>
      </View>

      {/* Hidden sheet selector driven by compact chip */}
      <Modal
        visible={towerSheetOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setTowerSheetOpen(false)}
      >
        <View className="flex-1 justify-end bg-black/45">
          <Pressable className="absolute inset-0" onPress={() => setTowerSheetOpen(false)} />
          <View className="max-h-[72%] rounded-t-3xl bg-surface-card pb-10 pt-2">
            <View className="mb-2 items-center px-4 pt-1">
              <View className="mb-3 h-1 w-10 rounded-full bg-surface-muted" />
              <Text
                className="mb-2 self-start text-lg text-ink"
                style={{ fontFamily: FontFamily.display }}
              >
                Tower
              </Text>
            </View>
            {towerOptions.map((option) => {
              const selected = option.value === towerFilter;
              return (
                <Pressable
                  key={option.value}
                  onPress={() => {
                    setTowerFilter(option.value);
                    setTowerSheetOpen(false);
                  }}
                  className="flex-row items-center justify-between border-b border-surface-border px-5 py-3.5"
                >
                  <Text
                    className="text-base text-ink"
                    style={{ fontFamily: selected ? FontFamily.heading : undefined }}
                  >
                    {option.label}
                  </Text>
                  {selected ? (
                    <View
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: Brand.primary }}
                    />
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        </View>
      </Modal>

      {listQuery.error ? (
        <ErrorBanner message={listQuery.error.message} onRetry={() => void listQuery.refetch()} />
      ) : null}

      {noTowers ? (
        <EmptyState
          visual="towers"
          title="Add a tower first"
          subtitle="Flats belong to a tower. Create towers before adding flat numbers."
        />
      ) : listQuery.isLoading && !listQuery.data ? (
        <SkeletonList count={4} />
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 24, flexGrow: 1 }}
          stickySectionHeadersEnabled={showTowerInline}
          refreshing={listQuery.isRefetching}
          onRefresh={() => void listQuery.refetch()}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <View className="px-4">
              <EmptyState
                visual="flats"
                title={
                  searchQuery
                    ? `No results for “${searchQuery}”`
                    : towerFilter !== 'all'
                      ? 'No flats in this tower'
                      : 'No flats yet'
                }
                subtitle={
                  searchQuery
                    ? 'Try a different flat number or tower name.'
                    : 'Tap + to add flat numbers for a tower.'
                }
                actionLabel={searchQuery ? 'Clear search' : undefined}
                onAction={searchQuery ? () => setSearch('') : undefined}
              />
            </View>
          }
          renderSectionHeader={({ section }) =>
            showTowerInline ? (
              <View
                className="border-b border-surface-border px-5 py-2"
                style={{ backgroundColor: Pastels.sage }}
              >
                <Text
                  className="text-xs font-bold uppercase tracking-widest text-ink"
                  style={{ fontFamily: FontFamily.heading }}
                >
                  {section.title}
                </Text>
              </View>
            ) : null
          }
          renderItem={({ item, index, section }) => {
            const occupied = occupiedFlatIds.has(item.id);
            const isLast = index === section.data.length - 1;
            return (
              <View>
                <View className="flex-row items-center gap-3 px-5 py-3">
                  <View className="min-w-0 flex-1">
                    <Text
                      className="text-[16px] text-ink"
                      style={{ fontFamily: FontFamily.heading }}
                    >
                      Flat {item.number}
                    </Text>
                    <View className="mt-1 flex-row items-center gap-1.5">
                      <View
                        className="h-1.5 w-1.5 rounded-full"
                        style={{
                          backgroundColor: occupied ? Brand.primary : '#D97706',
                        }}
                      />
                      <Text className="text-xs text-ink-muted">
                        {occupied ? 'Occupied' : 'Vacant'}
                      </Text>
                    </View>
                  </View>
                  <RowActions
                    editLabel={`Edit flat ${item.number}`}
                    deleteLabel={`Delete flat ${item.number}`}
                    onEdit={() => openEdit(item)}
                    onDelete={() => confirmDelete(item)}
                    deletePending={deleteMutation.isPending}
                  />
                </View>
                {!isLast ? <View className="mx-5 h-px bg-surface-border" /> : null}
              </View>
            );
          }}
        />
      )}

      <Modal visible={modalOpen} animationType="slide" transparent>
        <KeyboardAvoidingView behavior="padding" className="flex-1 justify-end bg-black/40">
          <View className="max-h-[90%] rounded-t-3xl bg-surface-card px-5 pb-10 pt-5">
            <Text
              className="mb-4 text-xl text-ink"
              style={{ fontFamily: FontFamily.display }}
            >
              {editing ? 'Edit flat' : 'New flat'}
            </Text>
            {formError ? (
              <Text className="mb-2 text-sm text-red-600">{formError}</Text>
            ) : null}

            {formTowerOptions.length > 0 ? (
              <View className="mb-3">
                <ChipSelector
                  title="Tower"
                  presentation="sheet"
                  options={formTowerOptions}
                  value={towerId || formTowerOptions[0]!.value}
                  onChange={setTowerId}
                />
              </View>
            ) : null}

            <TextInput
              className="mb-4 rounded-xl border border-surface-border bg-surface-card px-4 py-3 text-base text-ink"
              placeholder="Flat number (e.g. 101)"
              placeholderTextColor="#94A3B8"
              value={number}
              onChangeText={setNumber}
            />
            <View className="flex-row gap-2">
              <Pressable
                onPress={() => setModalOpen(false)}
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
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </ScreenHeader>
  );
}

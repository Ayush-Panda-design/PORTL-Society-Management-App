import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { Plus, Trash2 } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';

import { AppCard } from '@/components/ui/brand';
import { ChipSelector } from '@/components/ui/chip-selector';
import { ScreenHeader } from '@/components/ui/screen-header';
import { EmptyState } from '@/components/visitors/empty-state';
import { ErrorBanner } from '@/components/visitors/error-banner';
import { SkeletonList } from '@/components/visitors/loading-state';
import {
  deleteFlat,
  fetchFlats,
  fetchTowers,
  upsertFlat,
} from '@/lib/community-api';
import { queryKeys } from '@/lib/query-client';
import { flatTowerName } from '@/lib/visitors';
import { useAuthStore } from '@/stores/authStore';
import type { FlatWithTower } from '@/types/database';

export default function AdminFlatsScreen() {
  const societyId = useAuthStore((s) => s.profile?.society_id);
  const queryClient = useQueryClient();
  const params = useLocalSearchParams<{ towerId?: string }>();
  const flatsKey = queryKeys.flats(societyId ?? 'none');
  const towersKey = queryKeys.towers(societyId ?? 'none');

  const [towerFilter, setTowerFilter] = useState(params.towerId ?? 'all');
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

  const filtered = useMemo(() => {
    const rows = listQuery.data ?? [];
    if (towerFilter === 'all') return rows;
    return rows.filter((f) => f.tower_id === towerFilter);
  }, [listQuery.data, towerFilter]);

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
      towerFilter !== 'all'
        ? towerFilter
        : (towersQuery.data?.[0]?.id ?? '');
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

  return (
    <ScreenHeader
      title="Flats"
      subtitle="Units within towers"
      showBack
      right={
        <Pressable
          onPress={openCreate}
          disabled={noTowers}
          className={`h-10 w-10 items-center justify-center rounded-full ${
            noTowers ? 'bg-slate-300' : 'bg-brand-700'
          }`}
        >
          <Plus color="#fff" size={20} />
        </Pressable>
      }
    >
      <View className="mb-3 px-4">
        <ChipSelector
          title="Tower"
          presentation="sheet"
          options={towerOptions}
          value={towerFilter}
          onChange={setTowerFilter}
        />
      </View>

      {listQuery.error ? (
        <ErrorBanner message={listQuery.error.message} onRetry={() => void listQuery.refetch()} />
      ) : null}

      {noTowers ? (
        <EmptyState
          visual="amenities"
          title="Add a tower first"
          subtitle="Flats belong to a tower. Create towers before adding flat numbers."
        />
      ) : listQuery.isLoading && !listQuery.data ? (
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
            <EmptyState
              visual="amenities"
              title="No flats yet"
              subtitle="Tap + to add flat numbers for a tower."
            />
          }
          renderItem={({ item }) => (
            <AppCard>
              <Text className="mb-0.5 text-base font-semibold text-ink">
                Flat {item.number}
              </Text>
              <Text className="mb-3 text-sm text-ink-muted">
                {flatTowerName(item.towers) ?? 'Unknown tower'}
              </Text>
              <View className="flex-row gap-2">
                <Pressable
                  onPress={() => openEdit(item)}
                  className="flex-1 items-center rounded-xl border border-surface-border py-2.5"
                >
                  <Text className="text-sm font-semibold text-ink-soft">Edit</Text>
                </Pressable>
                <Pressable
                  onPress={() => confirmDelete(item)}
                  disabled={deleteMutation.isPending}
                  className="flex-1 flex-row items-center justify-center gap-1 rounded-xl bg-status-rejectedSoft py-2.5"
                >
                  <Trash2 color="#B91C1C" size={14} />
                  <Text className="text-sm font-semibold text-status-rejected">Delete</Text>
                </Pressable>
              </View>
            </AppCard>
          )}
        />
      )}

      <Modal visible={modalOpen} animationType="slide" transparent>
        <KeyboardAvoidingView behavior="padding" className="flex-1 justify-end bg-black/40">
          <View className="max-h-[90%] rounded-t-3xl bg-white px-5 pb-10 pt-5">
            <Text className="mb-4 text-xl font-bold text-slate-900">
              {editing ? 'Edit flat' : 'New flat'}
            </Text>
            {formError ? <Text className="mb-2 text-sm text-red-600">{formError}</Text> : null}

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
              className="mb-4 rounded-xl border border-slate-200 px-4 py-3 text-base text-slate-900"
              placeholder="Flat number (e.g. 101)"
              placeholderTextColor="#94A3B8"
              value={number}
              onChangeText={setNumber}
            />
            <View className="flex-row gap-2">
              <Pressable
                onPress={() => setModalOpen(false)}
                className="flex-1 items-center rounded-xl border border-slate-200 py-3"
              >
                <Text className="font-semibold text-slate-700">Cancel</Text>
              </Pressable>
              <Pressable
                onPress={() => saveMutation.mutate()}
                disabled={saveMutation.isPending}
                className="flex-1 items-center rounded-xl bg-brand-700 py-3"
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

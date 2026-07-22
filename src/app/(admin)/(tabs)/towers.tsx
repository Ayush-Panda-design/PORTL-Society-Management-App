import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, Trash2 } from 'lucide-react-native';
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

import { ScreenHeader } from '@/components/ui/screen-header';
import { EmptyState } from '@/components/visitors/empty-state';
import { ErrorBanner } from '@/components/visitors/error-banner';
import { SkeletonList } from '@/components/visitors/loading-state';
import { Brand, FontFamily } from '@/constants/theme';
import { useModalBack } from '@/hooks/use-modal-back';
import { deleteTower, fetchFlats, fetchTowers, upsertTower } from '@/lib/community-api';
import { queryKeys } from '@/lib/query-client';
import { useAuthStore } from '@/stores/authStore';
import type { Tower } from '@/types/database';

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

export default function AdminTowersScreen() {
  const societyId = useAuthStore((s) => s.profile?.society_id);
  const queryClient = useQueryClient();
  const towersKey = queryKeys.towers(societyId ?? 'none');
  const flatsKey = queryKeys.flats(societyId ?? 'none');

  const [modalOpen, setModalOpen] = useState(false);
  useModalBack(modalOpen, () => setModalOpen(false));
  const [editing, setEditing] = useState<Tower | null>(null);
  const [name, setName] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const listQuery = useQuery({
    queryKey: towersKey,
    queryFn: () => fetchTowers(societyId!),
    enabled: Boolean(societyId),
  });

  const flatsQuery = useQuery({
    queryKey: flatsKey,
    queryFn: () => fetchFlats(societyId!),
    enabled: Boolean(societyId),
  });

  const unitCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const flat of flatsQuery.data ?? []) {
      map.set(flat.tower_id, (map.get(flat.tower_id) ?? 0) + 1);
    }
    return map;
  }, [flatsQuery.data]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!societyId) throw new Error('No society linked.');
      if (!name.trim()) throw new Error('Tower name is required.');
      return upsertTower({
        id: editing?.id,
        societyId,
        name: name.trim(),
      });
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: towersKey });
      const previous = queryClient.getQueryData<Tower[]>(towersKey);
      const trimmed = name.trim();
      if (!trimmed) return { previous };

      if (editing) {
        queryClient.setQueryData<Tower[]>(towersKey, (old = []) =>
          old.map((t) => (t.id === editing.id ? { ...t, name: trimmed } : t)),
        );
      } else if (societyId) {
        const optimistic: Tower = {
          id: `temp-${Date.now()}`,
          society_id: societyId,
          name: trimmed,
        };
        queryClient.setQueryData<Tower[]>(towersKey, (old = []) =>
          [...old, optimistic].sort((a, b) => a.name.localeCompare(b.name)),
        );
      }
      return { previous };
    },
    onError: (e: Error, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(towersKey, context.previous);
      setFormError(e.message);
    },
    onSuccess: () => {
      setModalOpen(false);
      setEditing(null);
      setFormError(null);
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: towersKey });
      if (societyId) {
        await queryClient.invalidateQueries({ queryKey: queryKeys.flats(societyId) });
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteTower,
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: towersKey });
      const previous = queryClient.getQueryData<Tower[]>(towersKey);
      queryClient.setQueryData<Tower[]>(towersKey, (old = []) =>
        old.filter((t) => t.id !== id),
      );
      return { previous };
    },
    onError: (e: Error, _id, context) => {
      if (context?.previous) queryClient.setQueryData(towersKey, context.previous);
      Alert.alert('Could not delete tower', e.message);
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: towersKey });
      if (societyId) {
        await queryClient.invalidateQueries({ queryKey: queryKeys.flats(societyId) });
      }
    },
  });

  const openCreate = () => {
    setEditing(null);
    setName('');
    setFormError(null);
    setModalOpen(true);
  };

  const openEdit = (item: Tower) => {
    setEditing(item);
    setName(item.name);
    setFormError(null);
    setModalOpen(true);
  };

  const confirmDelete = (item: Tower) => {
    Alert.alert(
      'Delete tower?',
      `“${item.name}” and all of its flats will be permanently removed.`,
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
      <ScreenHeader title="Towers" showBack>
        <EmptyState
          visual="disconnected"
          title="No society linked"
          subtitle="Assign a society to your admin profile."
        />
      </ScreenHeader>
    );
  }

  const towers = listQuery.data ?? [];
  const showAddLabel = towers.length === 0;

  return (
    <ScreenHeader
      title="Towers"
      subtitle="Buildings in your society"
      showBack
      right={
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add tower"
          onPress={openCreate}
          className={`flex-row items-center justify-center rounded-pill ${
            showAddLabel ? 'gap-1.5 px-3.5 py-2.5' : 'h-11 w-11'
          }`}
          style={{ backgroundColor: Brand.charcoal }}
        >
          <Plus color="#fff" size={18} strokeWidth={2} />
          {showAddLabel ? (
            <Text className="text-sm font-semibold text-white" style={{ fontFamily: FontFamily.heading }}>
              Add tower
            </Text>
          ) : null}
        </Pressable>
      }
    >
      {listQuery.error ? (
        <ErrorBanner message={listQuery.error.message} onRetry={() => void listQuery.refetch()} />
      ) : null}

      {listQuery.isLoading && !listQuery.data ? (
        <SkeletonList count={3} />
      ) : (
        <FlatList
          data={towers}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 24, flexGrow: 1 }}
          refreshing={listQuery.isRefetching}
          onRefresh={() => void listQuery.refetch()}
          ListEmptyComponent={
            <View className="px-4">
              <EmptyState
                visual="towers"
                title="No towers yet"
                subtitle="Add Tower A, Tower B, etc. to structure your society."
                actionLabel="+ Add tower"
                onAction={openCreate}
              />
            </View>
          }
          ItemSeparatorComponent={() => (
            <View className="mx-5 h-px bg-surface-border" />
          )}
          renderItem={({ item }) => {
            const units = unitCounts.get(item.id) ?? 0;
            return (
              <View className="flex-row items-center gap-3 px-5 py-3.5">
                <View className="min-w-0 flex-1">
                  <Text
                    className="text-[16px] text-ink"
                    style={{ fontFamily: FontFamily.heading }}
                    numberOfLines={1}
                  >
                    {item.name}
                  </Text>
                  <View className="mt-1 flex-row items-center gap-1.5">
                    <View
                      className="h-1.5 w-1.5 rounded-full"
                      style={{
                        backgroundColor: units > 0 ? Brand.primary : Brand.inkMuted,
                      }}
                    />
                    <Text className="text-xs text-ink-muted">
                      {units === 0
                        ? 'No units yet'
                        : `${units} unit${units === 1 ? '' : 's'}`}
                    </Text>
                  </View>
                </View>
                <RowActions
                  editLabel={`Edit tower ${item.name}`}
                  deleteLabel={`Delete tower ${item.name}`}
                  onEdit={() => openEdit(item)}
                  onDelete={() => confirmDelete(item)}
                  deletePending={deleteMutation.isPending}
                />
              </View>
            );
          }}
        />
      )}

      <Modal
        visible={modalOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setModalOpen(false)}
      >
        <KeyboardAvoidingView behavior="padding" className="flex-1 justify-end bg-black/40">
          <View className="rounded-t-3xl bg-surface-card px-5 pb-10 pt-5">
            <Text
              className="mb-4 text-xl text-ink"
              style={{ fontFamily: FontFamily.display }}
            >
              {editing ? 'Edit tower' : 'New tower'}
            </Text>
            {formError ? (
              <Text className="mb-2 text-sm text-red-600">{formError}</Text>
            ) : null}
            <TextInput
              className="mb-4 rounded-xl border border-surface-border bg-surface-card px-4 py-3 text-base text-ink"
              placeholder="Tower name"
              placeholderTextColor="#94A3B8"
              value={name}
              onChangeText={setName}
              autoFocus
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

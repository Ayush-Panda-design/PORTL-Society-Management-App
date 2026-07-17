import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2 } from 'lucide-react-native';
import { useState } from 'react';
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
import { ScreenHeader } from '@/components/ui/screen-header';
import { EmptyState } from '@/components/visitors/empty-state';
import { ErrorBanner } from '@/components/visitors/error-banner';
import { SkeletonList } from '@/components/visitors/loading-state';
import { deleteTower, fetchTowers, upsertTower } from '@/lib/community-api';
import { queryKeys } from '@/lib/query-client';
import { useAuthStore } from '@/stores/authStore';
import type { Tower } from '@/types/database';

export default function AdminTowersScreen() {
  const societyId = useAuthStore((s) => s.profile?.society_id);
  const queryClient = useQueryClient();
  const towersKey = queryKeys.towers(societyId ?? 'none');

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Tower | null>(null);
  const [name, setName] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const listQuery = useQuery({
    queryKey: towersKey,
    queryFn: () => fetchTowers(societyId!),
    enabled: Boolean(societyId),
  });

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
          className="h-10 w-10 items-center justify-center rounded-full bg-brand-700"
        >
          <Plus color="#fff" size={20} />
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
          data={listQuery.data ?? []}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24, flexGrow: 1 }}
          ItemSeparatorComponent={() => <View className="h-3" />}
          refreshing={listQuery.isRefetching}
          onRefresh={() => void listQuery.refetch()}
          ListEmptyComponent={
            <EmptyState
              visual="amenities"
              title="No towers yet"
              subtitle="Tap + to add Tower A, Tower B, etc."
            />
          }
          renderItem={({ item }) => (
            <AppCard>
              <Text className="mb-3 text-base font-semibold text-ink">{item.name}</Text>
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
          <View className="rounded-t-3xl bg-surface-card px-5 pb-10 pt-5">
            <Text className="mb-4 text-xl font-bold text-slate-900">
              {editing ? 'Edit tower' : 'New tower'}
            </Text>
            {formError ? <Text className="mb-2 text-sm text-red-600">{formError}</Text> : null}
            <TextInput
              className="mb-4 rounded-xl border border-slate-200 px-4 py-3 text-base text-slate-900"
              placeholder="Tower name"
              placeholderTextColor="#94A3B8"
              value={name}
              onChangeText={setName}
              autoFocus
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

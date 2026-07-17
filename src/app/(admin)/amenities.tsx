import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { Plus, Trash2 } from 'lucide-react-native';
import { useState } from 'react';
import {
  ActivityIndicator,
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
import { amenityImageForName } from '@/constants/theme';
import { deleteAmenity, fetchAmenities, upsertAmenity } from '@/lib/community-api';
import { queryKeys } from '@/lib/query-client';
import { useAuthStore } from '@/stores/authStore';
import type { Amenity } from '@/types/database';
import { DEFAULT_AMENITY_SLOTS } from '@/types/database';

export default function AdminAmenitiesScreen() {
  const societyId = useAuthStore((s) => s.profile?.society_id);
  const queryClient = useQueryClient();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Amenity | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [slotsText, setSlotsText] = useState(DEFAULT_AMENITY_SLOTS.join('\n'));
  const [formError, setFormError] = useState<string | null>(null);

  const listQuery = useQuery({
    queryKey: queryKeys.amenities(societyId ?? 'none'),
    queryFn: () => fetchAmenities(societyId!),
    enabled: Boolean(societyId),
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!societyId) throw new Error('No society linked.');
      if (!name.trim()) throw new Error('Name is required.');
      const slots = slotsText
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean);
      if (slots.length === 0) throw new Error('Add at least one slot (one per line).');
      await upsertAmenity({
        id: editing?.id,
        societyId,
        name: name.trim(),
        description: description.trim(),
        slots,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.amenities(societyId!) });
      setModalOpen(false);
      setEditing(null);
      setFormError(null);
    },
    onError: (e: Error) => setFormError(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAmenity,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.amenities(societyId!) });
    },
  });

  const openCreate = () => {
    setEditing(null);
    setName('');
    setDescription('');
    setSlotsText(DEFAULT_AMENITY_SLOTS.join('\n'));
    setFormError(null);
    setModalOpen(true);
  };

  const openEdit = (item: Amenity) => {
    setEditing(item);
    setName(item.name);
    setDescription(item.description ?? '');
    setSlotsText(item.slots.join('\n'));
    setFormError(null);
    setModalOpen(true);
  };

  if (!societyId) {
    return (
      <ScreenHeader title="Amenities" showBack>
        <EmptyState visual="disconnected" title="No society linked" subtitle="Assign a society to your admin profile." />
      </ScreenHeader>
    );
  }

  return (
    <ScreenHeader
      title="Amenities"
      subtitle="Manage bookable facilities"
      showBack
      right={
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add amenity"
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
              title="No amenities"
              subtitle="Tap + to add gym, clubhouse, etc."
            />
          }
          renderItem={({ item }) => (
            <AppCard className="overflow-hidden p-0">
              <Image
                source={{ uri: amenityImageForName(item.name) }}
                style={{ width: '100%', height: 110 }}
                contentFit="cover"
                transition={200}
              />
              <View className="p-4">
                <Text className="mb-1 text-base font-semibold text-ink">{item.name}</Text>
                <Text className="mb-2 text-sm text-ink-muted">
                  {item.description || 'No description'}
                </Text>
                <Text className="mb-3 text-xs text-ink-faint">
                  {item.slots.length} slot{item.slots.length === 1 ? '' : 's'}
                </Text>
                <View className="flex-row gap-2">
                  <Pressable
                    onPress={() => openEdit(item)}
                    className="flex-1 items-center rounded-xl border border-surface-border py-2.5"
                  >
                    <Text className="text-sm font-semibold text-ink-soft">Edit</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => deleteMutation.mutate(item.id)}
                    className="flex-1 flex-row items-center justify-center gap-1 rounded-xl bg-status-rejectedSoft py-2.5"
                  >
                    <Trash2 color="#B91C1C" size={14} />
                    <Text className="text-sm font-semibold text-status-rejected">Delete</Text>
                  </Pressable>
                </View>
              </View>
            </AppCard>
          )}
        />
      )}

      <Modal visible={modalOpen} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior="padding"
          className="flex-1 justify-end bg-black/40"
        >
          <View className="max-h-[90%] rounded-t-3xl bg-surface-card px-5 pb-10 pt-5">
            <Text className="mb-4 text-xl font-bold text-ink">
              {editing ? 'Edit amenity' : 'New amenity'}
            </Text>
            {formError ? <Text className="mb-2 text-sm text-red-500">{formError}</Text> : null}
            <TextInput
              className="mb-3 rounded-xl border border-surface-border bg-surface-card px-4 py-3 text-base text-ink"
              placeholder="Name"
              placeholderTextColor="#94A3B8"
              value={name}
              onChangeText={setName}
            />
            <TextInput
              className="mb-3 rounded-xl border border-surface-border bg-surface-card px-4 py-3 text-base text-ink"
              placeholder="Description"
              placeholderTextColor="#94A3B8"
              value={description}
              onChangeText={setDescription}
            />
            <Text className="mb-2 text-sm font-medium text-ink-soft">Slots (one per line)</Text>
            <TextInput
              className="mb-4 min-h-[140px] rounded-xl border border-surface-border bg-surface-card px-4 py-3 text-base text-ink"
              placeholder={'06:00-07:00\n07:00-08:00'}
              placeholderTextColor="#94A3B8"
              multiline
              textAlignVertical="top"
              value={slotsText}
              onChangeText={setSlotsText}
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

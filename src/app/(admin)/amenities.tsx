import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
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

import { FloatingActionBtn } from '@/components/ui/brand';
import { Card } from '@/components/ui/card';
import { Tokens } from '@/theme/tokens';
import { Edit2 } from 'lucide-react-native';
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

  const confirmDelete = (item: Amenity) => {
    Alert.alert(
      'Delete amenity?',
      `“${item.name}” will be permanently removed.`,
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
              actionLabel="Add your first amenity"
              onAction={openCreate}
            />
          }
          renderItem={({ item }) => (
            <Card style={{ padding: 0, overflow: 'hidden', marginBottom: 12 }}>
              <Image
                source={{ uri: amenityImageForName(item.name) }}
                style={{ width: '100%', height: 110 }}
                contentFit="cover"
                transition={200}
              />
              <View className="p-4">
                <Text style={{ ...Tokens.typography.h3, color: Tokens.color.textPrimary, marginBottom: 4 }}>{item.name}</Text>
                <Text style={{ ...Tokens.typography.body, color: Tokens.color.textSecondary, marginBottom: 8 }}>
                  {item.description || 'No description'}
                </Text>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ ...Tokens.typography.caption, color: Tokens.color.textMuted }}>
                    {item.slots.length} slot{item.slots.length === 1 ? '' : 's'}
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <Pressable onPress={() => openEdit(item)} style={{ padding: 8 }}>
                      <Edit2 color={Tokens.color.primary} size={18} />
                    </Pressable>
                    <Pressable onPress={() => confirmDelete(item)} style={{ padding: 8 }}>
                      <Trash2 color={Tokens.color.danger} size={18} />
                    </Pressable>
                  </View>
                </View>
              </View>
            </Card>
          )}
        />
      )}

      <Modal visible={modalOpen} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior="padding"
          className="flex-1 justify-end bg-black/40"
        >
          <View className="max-h-[90%] rounded-t-3xl bg-surface-card px-5 pb-10 pt-5">
            <Text style={{ ...Tokens.typography.h2, color: Tokens.color.textPrimary, marginBottom: 16 }}>
              {editing ? 'Edit amenity' : 'New amenity'}
            </Text>
            {formError ? <Text style={{ ...Tokens.typography.caption, color: Tokens.color.danger, marginBottom: 8 }}>{formError}</Text> : null}
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
                <Text style={{ ...Tokens.typography.bodyMedium, color: Tokens.color.textSecondary }}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={() => saveMutation.mutate()}
                disabled={saveMutation.isPending}
                className="flex-1 items-center rounded-bubbly py-3.5"
                style={{ backgroundColor: Tokens.color.primary }}
              >
                {saveMutation.isPending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={{ ...Tokens.typography.bodyMedium, color: '#fff' }}>Save</Text>
                )}
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
      <FloatingActionBtn onPress={openCreate} icon={<Plus color="#fff" size={24} />} label="Add Amenity" />
    </ScreenHeader>
  );
}

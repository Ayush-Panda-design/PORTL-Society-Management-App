import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
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

import { AppCard, AvatarRing, InitialsAvatar, FloatingActionBtn } from '@/components/ui/brand';
import { ScreenHeader } from '@/components/ui/screen-header';
import { SearchField } from '@/components/ui/search-field';
import { EmptyState } from '@/components/visitors/empty-state';
import { ErrorBanner } from '@/components/visitors/error-banner';
import { SkeletonList } from '@/components/visitors/loading-state';
import {
  deleteStaff,
  fetchStaff,
  uploadStaffPhoto,
  upsertStaff,
} from '@/lib/community-api';
import { queryKeys } from '@/lib/query-client';
import { useAuthStore } from '@/stores/authStore';
import type { StaffMember } from '@/types/database';

function matchesSearch(item: StaffMember, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const haystack = [item.name, item.role, item.phone ?? ''].join(' ').toLowerCase();
  return haystack.includes(q);
}

export default function AdminStaffScreen() {
  const societyId = useAuthStore((s) => s.profile?.society_id);
  const queryClient = useQueryClient();
  const staffKey = queryKeys.staff(societyId ?? 'none');

  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<StaffMember | null>(null);
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [phone, setPhone] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const listQuery = useQuery({
    queryKey: staffKey,
    queryFn: () => fetchStaff(societyId!),
    enabled: Boolean(societyId),
  });

  const filtered = useMemo(
    () => (listQuery.data ?? []).filter((item) => matchesSearch(item, search)),
    [listQuery.data, search],
  );

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!societyId) throw new Error('No society linked.');
      if (!name.trim() || !role.trim()) throw new Error('Name and role are required.');

      let nextPhoto = photoUrl;
      if (photoUri && !photoUri.startsWith('http')) {
        nextPhoto = (await uploadStaffPhoto(societyId, photoUri)) ?? photoUrl;
      }

      await upsertStaff({
        id: editing?.id,
        societyId,
        name: name.trim(),
        role: role.trim(),
        phone: phone.trim() || null,
        photoUrl: nextPhoto,
      });
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: staffKey });
      const previous = queryClient.getQueryData<StaffMember[]>(staffKey);
      const trimmedName = name.trim();
      const trimmedRole = role.trim();
      if (!societyId || !trimmedName || !trimmedRole) return { previous };

      if (editing) {
        queryClient.setQueryData<StaffMember[]>(staffKey, (old = []) =>
          old.map((s) =>
            s.id === editing.id
              ? {
                  ...s,
                  name: trimmedName,
                  role: trimmedRole,
                  phone: phone.trim() || null,
                  photo_url: photoUrl ?? s.photo_url,
                }
              : s,
          ),
        );
      } else {
        const optimistic: StaffMember = {
          id: `temp-${Date.now()}`,
          society_id: societyId,
          name: trimmedName,
          role: trimmedRole,
          phone: phone.trim() || null,
          photo_url: photoUrl,
        };
        queryClient.setQueryData<StaffMember[]>(staffKey, (old = []) =>
          [...old, optimistic].sort(
            (a, b) => a.role.localeCompare(b.role) || a.name.localeCompare(b.name),
          ),
        );
      }
      return { previous };
    },
    onError: (e: Error, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(staffKey, context.previous);
      setFormError(e.message);
    },
    onSuccess: () => {
      setModalOpen(false);
      setEditing(null);
      setFormError(null);
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: staffKey });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteStaff,
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: staffKey });
      const previous = queryClient.getQueryData<StaffMember[]>(staffKey);
      queryClient.setQueryData<StaffMember[]>(staffKey, (old = []) =>
        old.filter((s) => s.id !== id),
      );
      return { previous };
    },
    onError: (e: Error, _id, context) => {
      if (context?.previous) queryClient.setQueryData(staffKey, context.previous);
      Alert.alert('Could not delete staff member', e.message);
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: staffKey });
    },
  });

  const openCreate = () => {
    setEditing(null);
    setName('');
    setRole('');
    setPhone('');
    setPhotoUri(null);
    setPhotoUrl(null);
    setFormError(null);
    setModalOpen(true);
  };

  const openEdit = (item: StaffMember) => {
    setEditing(item);
    setName(item.name);
    setRole(item.role);
    setPhone(item.phone ?? '');
    setPhotoUri(item.photo_url);
    setPhotoUrl(item.photo_url);
    setFormError(null);
    setModalOpen(true);
  };

  const pickPhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setFormError('Photo library permission is required.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  if (!societyId) {
    return (
      <ScreenHeader title="Staff" showBack>
        <EmptyState visual="disconnected" title="No society linked" subtitle="Assign a society to your admin profile." />
      </ScreenHeader>
    );
  }

  return (
    <ScreenHeader
      title="Staff directory"
      subtitle="People residents can contact"
      showBack
    >
      <View className="px-4">
        <SearchField
          value={search}
          onChangeText={setSearch}
          placeholder="Search by name, role, or phone"
          accessibilityLabel="Search staff"
        />
      </View>

      {listQuery.error ? (
        <ErrorBanner message={listQuery.error.message} onRetry={() => void listQuery.refetch()} />
      ) : null}

      {listQuery.isLoading && !listQuery.data ? (
        <SkeletonList count={3} />
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
              visual="helpdesk"
              title={search.trim() ? 'No matches' : 'No staff yet'}
              subtitle={
                search.trim()
                  ? 'Try a different name, role, or phone.'
                  : 'Tap + to add a contact.'
              }
            />
          }
          renderItem={({ item }) => (
            <AppCard className="flex-row items-center gap-3 p-3">
              {item.photo_url ? (
                <AvatarRing size={48}>
                  <Image
                    source={{ uri: item.photo_url }}
                    style={{ width: 48, height: 48 }}
                    contentFit="cover"
                  />
                </AvatarRing>
              ) : (
                <InitialsAvatar name={item.name} size={48} seed={item.id} />
              )}
              <View className="flex-1">
                <Text className="font-semibold text-ink">{item.name}</Text>
                <Text className="text-sm text-ink-muted">
                  {item.role}
                  {item.phone ? ` · ${item.phone}` : ''}
                </Text>
              </View>
              <Pressable
                onPress={() => openEdit(item)}
                accessibilityRole="button"
                accessibilityLabel={`Edit ${item.name}`}
                className="px-2 py-1"
              >
                <Text className="text-sm font-semibold text-brand-700">Edit</Text>
              </Pressable>
              <Pressable
                onPress={() => deleteMutation.mutate(item.id)}
                accessibilityRole="button"
                accessibilityLabel={`Delete ${item.name}`}
                className="px-2 py-1"
              >
                <Trash2 color="#B91C1C" size={16} />
              </Pressable>
            </AppCard>
          )}
        />
      )}

      <Modal visible={modalOpen} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior="padding"
          className="flex-1 justify-end bg-black/40"
        >
          <View className="rounded-t-3xl bg-surface-card px-5 pb-10 pt-5">
            <Text className="mb-4 text-xl font-bold text-ink">
              {editing ? 'Edit staff' : 'Add staff'}
            </Text>
            {formError ? <Text className="mb-2 text-sm text-red-500">{formError}</Text> : null}

            <View className="mb-4 flex-row items-center gap-3">
              {photoUri ? (
                <View className="h-16 w-16 overflow-hidden rounded-2xl bg-surface-muted">
                  <Image
                    source={{ uri: photoUri }}
                    style={{ width: 64, height: 64 }}
                    contentFit="cover"
                  />
                </View>
              ) : (
                <InitialsAvatar name={name || '?'} size={64} />
              )}
              <Pressable
                onPress={pickPhoto}
                className="rounded-xl border border-surface-border px-4 py-2.5"
              >
                <Text className="font-semibold text-ink-soft">Upload photo</Text>
              </Pressable>
            </View>

            <TextInput
              className="mb-3 rounded-xl border border-surface-border bg-surface-card px-4 py-3 text-base text-ink"
              placeholder="Name"
              placeholderTextColor="#94A3B8"
              value={name}
              onChangeText={setName}
            />
            <TextInput
              className="mb-3 rounded-xl border border-surface-border bg-surface-card px-4 py-3 text-base text-ink"
              placeholder="Role (e.g. Plumber, Security)"
              placeholderTextColor="#94A3B8"
              value={role}
              onChangeText={setRole}
            />
            <TextInput
              className="mb-4 rounded-xl border border-surface-border bg-surface-card px-4 py-3 text-base text-ink"
              placeholder="Phone"
              placeholderTextColor="#94A3B8"
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
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
                className="flex-1 items-center rounded-bubbly bg-charcoal py-3.5"
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
      <FloatingActionBtn onPress={openCreate} icon={<Plus color="#fff" size={24} />} label="Add Staff" />
    </ScreenHeader>
  );
}

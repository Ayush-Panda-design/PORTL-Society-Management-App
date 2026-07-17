import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
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

import { AppCard, InitialsAvatar } from '@/components/ui/brand';
import { ScreenHeader } from '@/components/ui/screen-header';
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

export default function AdminStaffScreen() {
  const societyId = useAuthStore((s) => s.profile?.society_id);
  const queryClient = useQueryClient();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<StaffMember | null>(null);
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [phone, setPhone] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const listQuery = useQuery({
    queryKey: queryKeys.staff(societyId ?? 'none'),
    queryFn: () => fetchStaff(societyId!),
    enabled: Boolean(societyId),
  });

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
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.staff(societyId!) });
      setModalOpen(false);
      setEditing(null);
      setFormError(null);
    },
    onError: (e: Error) => setFormError(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteStaff,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.staff(societyId!) });
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
      right={
        <Pressable
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
              visual="helpdesk"
              title="No staff yet"
              subtitle="Tap + to add a contact."
            />
          }
          renderItem={({ item }) => (
            <AppCard className="flex-row items-center gap-3 p-3">
              {item.photo_url ? (
                <View className="h-12 w-12 overflow-hidden rounded-full bg-surface-muted">
                  <Image
                    source={{ uri: item.photo_url }}
                    style={{ width: 48, height: 48 }}
                    contentFit="cover"
                  />
                </View>
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
              <Pressable onPress={() => openEdit(item)} className="px-2 py-1">
                <Text className="text-sm font-semibold text-brand-700">Edit</Text>
              </Pressable>
              <Pressable onPress={() => deleteMutation.mutate(item.id)} className="px-2 py-1">
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
            <Text className="mb-4 text-xl font-bold text-slate-900">
              {editing ? 'Edit staff' : 'Add staff'}
            </Text>
            {formError ? <Text className="mb-2 text-sm text-red-600">{formError}</Text> : null}

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
              className="mb-3 rounded-xl border border-slate-200 px-4 py-3 text-base text-slate-900"
              placeholder="Name"
              placeholderTextColor="#94A3B8"
              value={name}
              onChangeText={setName}
            />
            <TextInput
              className="mb-3 rounded-xl border border-slate-200 px-4 py-3 text-base text-slate-900"
              placeholder="Role (e.g. Plumber, Security)"
              placeholderTextColor="#94A3B8"
              value={role}
              onChangeText={setRole}
            />
            <TextInput
              className="mb-4 rounded-xl border border-slate-200 px-4 py-3 text-base text-slate-900"
              placeholder="Phone"
              placeholderTextColor="#94A3B8"
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
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

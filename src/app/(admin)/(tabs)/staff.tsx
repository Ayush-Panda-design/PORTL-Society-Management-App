import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { Plus } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import Toast from 'react-native-toast-message';

import { AvatarRing, InitialsAvatar, FloatingActionBtn } from '@/components/ui/brand';
import { ChipSelector } from '@/components/ui/chip-selector';
import { ListRow } from '@/components/ui/list-row';
import { ScreenHeader } from '@/components/ui/screen-header';
import { SearchField } from '@/components/ui/search-field';
import { StaggeredListItem } from '@/components/ui/staggered-list-item';
import { SwipeActionRow } from '@/components/ui/swipe-action-row';
import { ThemedRefreshControl } from '@/components/ui/themed-refresh-control';
import { EmptyState } from '@/components/visitors/empty-state';
import { ErrorBanner } from '@/components/visitors/error-banner';
import { SkeletonList } from '@/components/visitors/loading-state';
import { Brand } from '@/constants/theme';
import {
  deleteStaff,
  fetchStaff,
  uploadStaffPhoto,
  upsertStaff,
} from '@/lib/community-api';
import { hapticConfirm } from '@/lib/haptics';
import { queryKeys } from '@/lib/query-client';
import { useAuthStore } from '@/stores/authStore';
import { Tokens } from '@/theme/tokens';
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
  const [staffType, setStaffType] = useState<'staff' | 'service_provider'>('staff');
  const [shiftStart, setShiftStart] = useState('');
  const [shiftEnd, setShiftEnd] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [serviceCategory, setServiceCategory] = useState('');
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
        staffType,
        shiftStart: shiftStart.trim() || null,
        shiftEnd: shiftEnd.trim() || null,
        companyName: companyName.trim() || null,
        serviceCategory: serviceCategory.trim() || null,
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
                  staff_type: staffType,
                  shift_start: shiftStart.trim() || null,
                  shift_end: shiftEnd.trim() || null,
                  company_name: companyName.trim() || null,
                  service_category: serviceCategory.trim() || null,
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
          staff_type: staffType,
          shift_start: shiftStart.trim() || null,
          shift_end: shiftEnd.trim() || null,
          company_name: companyName.trim() || null,
          service_category: serviceCategory.trim() || null,
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
      const wasCreate = !editing;
      setModalOpen(false);
      setEditing(null);
      setFormError(null);
      hapticConfirm();
      Toast.show({ type: 'success', text1: wasCreate ? 'Staff added' : 'Staff updated' });
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
    onSuccess: () => {
      hapticConfirm();
      Toast.show({ type: 'success', text1: 'Staff removed' });
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: staffKey });
    },
  });

  const confirmDelete = (item: StaffMember) => {
    Alert.alert(
      'Delete staff member?',
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
    setRole('');
    setPhone('');
    setPhotoUri(null);
    setPhotoUrl(null);
    setStaffType('staff');
    setShiftStart('');
    setShiftEnd('');
    setCompanyName('');
    setServiceCategory('');
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
    setStaffType((item.staff_type as any) ?? 'staff');
    setShiftStart(item.shift_start ?? '');
    setShiftEnd(item.shift_end ?? '');
    setCompanyName(item.company_name ?? '');
    setServiceCategory(item.service_category ?? '');
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
          contentContainerStyle={{ paddingBottom: 24, flexGrow: 1 }}
          refreshControl={
            <ThemedRefreshControl
              refreshing={listQuery.isRefetching}
              onRefresh={() => void listQuery.refetch()}
            />
          }
          initialNumToRender={15}
          windowSize={8}
          removeClippedSubviews
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <EmptyState
              visual="staff"
              title={search.trim() ? 'No matches' : 'No staff yet'}
              subtitle={
                search.trim()
                  ? 'Try a different name, role, or phone.'
                  : 'Add contacts that residents can call for help.'
              }
              actionLabel={search.trim() ? undefined : '+ Add staff member'}
              onAction={search.trim() ? undefined : openCreate}
            />
          }
          renderItem={({ item, index }) => {
            const shift =
              item.shift_start && item.shift_end
                ? `Shift ${item.shift_start}–${item.shift_end}`
                : null;
            const meta =
              item.staff_type === 'service_provider' && item.company_name
                ? item.company_name
                : shift;
            return (
              <StaggeredListItem index={index} disabled={listQuery.isRefetching}>
                <SwipeActionRow
                  actions={[
                    { key: 'edit', label: 'Edit', color: Brand.primary, onPress: () => openEdit(item) },
                    { key: 'remove', label: 'Remove', color: '#C0392B', onPress: () => confirmDelete(item) },
                  ]}
                >
                  <ListRow
                    title={item.name}
                    subtitle={`${item.role}${item.phone ? ` · ${item.phone}` : ''}`}
                    meta={meta ?? undefined}
                    last={index === filtered.length - 1}
                    accessibilityLabel={`${item.name}, ${item.role}`}
                    leading={
                      item.photo_url ? (
                        <AvatarRing size={48} status="online">
                          <Image
                            source={{ uri: item.photo_url }}
                            style={{ width: 48, height: 48 }}
                            contentFit="cover"
                          />
                        </AvatarRing>
                      ) : (
                        <InitialsAvatar name={item.name} size={48} seed={item.id} status="online" />
                      )
                    }
                  />
                </SwipeActionRow>
              </StaggeredListItem>
            );
          }}
        />
      )}

      <Modal visible={modalOpen} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior="padding"
          className="flex-1 justify-end bg-black/40"
        >
          <View className="max-h-[90%] rounded-t-3xl bg-surface-card px-5 pb-10 pt-5">
            <ScrollView keyboardShouldPersistTaps="handled">
            <Text style={{ ...Tokens.typography.h2, color: Tokens.color.textPrimary, marginBottom: 16 }}>
              {editing ? 'Edit staff' : 'Add staff'}
            </Text>
            {formError ? <Text style={{ ...Tokens.typography.caption, color: Tokens.color.danger, marginBottom: 8 }}>{formError}</Text> : null}

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

            <Text style={{ fontSize: 11, fontWeight: '600', color: Tokens.color.textMuted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 }}>Staff Type</Text>
            <ChipSelector
              className="mb-4"
              presentation="tiles"
              options={[
                { value: 'staff', label: 'Staff' },
                { value: 'service_provider', label: 'Service Provider' },
              ]}
              value={staffType}
              onChange={(v) => setStaffType(v as any)}
            />

            {staffType === 'service_provider' && (
              <>
                <TextInput
                  className="mb-3 rounded-xl border border-surface-border bg-surface-card px-4 py-3 text-base text-ink"
                  placeholder="Company Name"
                  placeholderTextColor="#94A3B8"
                  value={companyName}
                  onChangeText={setCompanyName}
                />
                <TextInput
                  className="mb-4 rounded-xl border border-surface-border bg-surface-card px-4 py-3 text-base text-ink"
                  placeholder="Service Category (e.g. Plumbing)"
                  placeholderTextColor="#94A3B8"
                  value={serviceCategory}
                  onChangeText={setServiceCategory}
                />
              </>
            )}

            <View className="flex-row gap-2 mb-3">
              <TextInput
                className="flex-1 rounded-xl border border-surface-border bg-surface-card px-4 py-3 text-base text-ink"
                placeholder="Shift start (e.g. 08:00)"
                placeholderTextColor="#94A3B8"
                value={shiftStart}
                onChangeText={setShiftStart}
              />
              <TextInput
                className="flex-1 rounded-xl border border-surface-border bg-surface-card px-4 py-3 text-base text-ink"
                placeholder="Shift end (e.g. 17:00)"
                placeholderTextColor="#94A3B8"
                value={shiftEnd}
                onChangeText={setShiftEnd}
              />
            </View>

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
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
      <FloatingActionBtn onPress={openCreate} icon={<Plus color="#fff" size={24} />} label="Add Staff" />
    </ScreenHeader>
  );
}

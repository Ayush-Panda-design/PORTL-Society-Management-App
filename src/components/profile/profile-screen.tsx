import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { Camera, Lock, Trash2 } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import Toast from 'react-native-toast-message';

import { InitialsAvatar } from '@/components/ui/brand';
import { ScreenHeader } from '@/components/ui/screen-header';
import { EmptyState } from '@/components/visitors/empty-state';
import { ErrorBanner } from '@/components/visitors/error-banner';
import { Brand, FontFamily, Pastels } from '@/constants/theme';
import {
  addProfileNote,
  deleteProfileNote,
  fetchPrivateProfile,
  fetchProfileNotes,
  updatePublicProfile,
  uploadProfilePhoto,
  upsertPrivateProfile,
} from '@/lib/profile-api';
import { queryKeys } from '@/lib/query-client';
import { useAuthStore } from '@/stores/authStore';

function formatNoteStamp(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  multiline,
  secureHint,
  keyboardType,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
  secureHint?: boolean;
  keyboardType?: 'default' | 'email-address' | 'phone-pad';
}) {
  return (
    <View className="mb-3">
      <View className="mb-1.5 flex-row items-center gap-1.5">
        <Text
          className="text-xs font-bold uppercase tracking-widest text-ink-muted"
          style={{ fontFamily: FontFamily.heading }}
        >
          {label}
        </Text>
        {secureHint ? <Lock color={Brand.inkMuted} size={11} strokeWidth={1.5} /> : null}
      </View>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={Brand.inkMuted}
        multiline={multiline}
        keyboardType={keyboardType}
        autoCapitalize={keyboardType === 'email-address' ? 'none' : 'sentences'}
        className="rounded-card bg-surface-card px-4 py-3 text-[15px] text-ink"
        style={{
          fontFamily: FontFamily.body,
          minHeight: multiline ? 88 : undefined,
          textAlignVertical: multiline ? 'top' : 'center',
          shadowColor: '#101512',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.04,
          shadowRadius: 4,
          elevation: 1,
        }}
      />
    </View>
  );
}

function SectionLabel({
  title,
  subtitle,
  privateSection,
}: {
  title: string;
  subtitle: string;
  privateSection?: boolean;
}) {
  return (
    <View className="mb-3 mt-2">
      <View className="flex-row items-center gap-2">
        <Text
          className="text-xs font-bold uppercase tracking-widest text-ink-muted"
          style={{ fontFamily: FontFamily.heading }}
        >
          {title}
        </Text>
        {privateSection ? (
          <View
            className="flex-row items-center gap-1 rounded-pill px-2 py-0.5"
            style={{ backgroundColor: Pastels.rose }}
          >
            <Lock color="#C0392B" size={10} strokeWidth={1.5} />
            <Text className="text-[10px] font-semibold" style={{ color: '#C0392B' }}>
              Only you
            </Text>
          </View>
        ) : (
          <View
            className="rounded-pill px-2 py-0.5"
            style={{ backgroundColor: Pastels.mint }}
          >
            <Text className="text-[10px] font-semibold" style={{ color: Brand.primary }}>
              Visible to admin
            </Text>
          </View>
        )}
      </View>
      <Text className="mt-1 text-xs leading-4 text-ink-muted">{subtitle}</Text>
    </View>
  );
}

export function ProfileScreen() {
  const profile = useAuthStore((s) => s.profile);
  const setProfile = useAuthStore((s) => s.setProfile);
  const queryClient = useQueryClient();
  const userId = profile?.id;

  const [fullName, setFullName] = useState(profile?.full_name ?? '');
  const [phone, setPhone] = useState(profile?.phone ?? '');
  const [bio, setBio] = useState(profile?.bio ?? '');
  const [occupation, setOccupation] = useState(profile?.occupation ?? '');
  const [emergencyName, setEmergencyName] = useState(profile?.emergency_contact_name ?? '');
  const [emergencyPhone, setEmergencyPhone] = useState(profile?.emergency_contact_phone ?? '');
  const [vehicle, setVehicle] = useState(profile?.vehicle_number ?? '');

  const [personalEmail, setPersonalEmail] = useState('');
  const [dob, setDob] = useState('');
  const [bloodGroup, setBloodGroup] = useState('');
  const [allergies, setAllergies] = useState('');
  const [address, setAddress] = useState('');
  const [noteDraft, setNoteDraft] = useState('');
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url ?? '');
  const [avatarBusy, setAvatarBusy] = useState(false);

  const privateQuery = useQuery({
    queryKey: queryKeys.profilePrivate(userId ?? 'none'),
    queryFn: () => fetchPrivateProfile(userId!),
    enabled: Boolean(userId),
  });

  const notesQuery = useQuery({
    queryKey: queryKeys.profileNotes(userId ?? 'none'),
    queryFn: () => fetchProfileNotes(userId!),
    enabled: Boolean(userId),
  });

  useEffect(() => {
    if (!profile) return;
    setFullName(profile.full_name ?? '');
    setPhone(profile.phone ?? '');
    setBio(profile.bio ?? '');
    setOccupation(profile.occupation ?? '');
    setEmergencyName(profile.emergency_contact_name ?? '');
    setEmergencyPhone(profile.emergency_contact_phone ?? '');
    setVehicle(profile.vehicle_number ?? '');
    setAvatarUrl(profile.avatar_url ?? '');
  }, [profile]);

  useEffect(() => {
    const row = privateQuery.data;
    if (!row) return;
    setPersonalEmail(row.personal_email ?? '');
    setDob(row.date_of_birth ?? '');
    setBloodGroup(row.blood_group ?? '');
    setAllergies(row.allergies ?? '');
    setAddress(row.permanent_address ?? '');
  }, [privateQuery.data]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error('Not signed in.');
      const updated = await updatePublicProfile(userId, {
        full_name: fullName,
        phone,
        bio,
        occupation,
        emergency_contact_name: emergencyName,
        emergency_contact_phone: emergencyPhone,
        vehicle_number: vehicle,
        avatar_url: avatarUrl,
      });
      await upsertPrivateProfile(userId, {
        personal_email: personalEmail,
        date_of_birth: dob,
        blood_group: bloodGroup,
        allergies,
        permanent_address: address,
      });
      return updated;
    },
    onSuccess: (updated) => {
      setProfile(updated);
      void queryClient.invalidateQueries({ queryKey: queryKeys.profilePrivate(userId!) });
      Toast.show({ type: 'success', text1: 'Profile saved' });
    },
    onError: (e: Error) => {
      Toast.show({ type: 'error', text1: 'Could not save', text2: e.message });
    },
  });

  const addNoteMutation = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error('Not signed in.');
      return addProfileNote(userId, noteDraft);
    },
    onSuccess: () => {
      setNoteDraft('');
      void queryClient.invalidateQueries({ queryKey: queryKeys.profileNotes(userId!) });
    },
    onError: (e: Error) => {
      Toast.show({ type: 'error', text1: 'Could not add note', text2: e.message });
    },
  });

  const deleteNoteMutation = useMutation({
    mutationFn: (noteId: string) => deleteProfileNote(noteId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.profileNotes(userId!) });
    },
    onError: (e: Error) => {
      Toast.show({ type: 'error', text1: 'Could not delete note', text2: e.message });
    },
  });

  const persistAvatar = async (nextUrl: string | null) => {
    if (!userId) return;
    setAvatarBusy(true);
    try {
      const updated = await updatePublicProfile(userId, {
        full_name: fullName,
        phone,
        bio,
        occupation,
        emergency_contact_name: emergencyName,
        emergency_contact_phone: emergencyPhone,
        vehicle_number: vehicle,
        avatar_url: nextUrl,
      });
      setAvatarUrl(updated.avatar_url ?? '');
      setProfile(updated);
      Toast.show({
        type: 'success',
        text1: nextUrl ? 'Photo updated' : 'Photo removed',
      });
    } catch (e) {
      Toast.show({
        type: 'error',
        text1: 'Could not update photo',
        text2: e instanceof Error ? e.message : 'Try again',
      });
    } finally {
      setAvatarBusy(false);
    }
  };

  const pickAvatar = async () => {
    if (!userId) return;
    if (avatarBusy) return;

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Toast.show({ type: 'error', text1: 'Photo library permission is required' });
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.75,
      allowsEditing: true,
      aspect: [1, 1],
      base64: true,
    });

    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    setAvatarBusy(true);
    try {
      const publicUrl = await uploadProfilePhoto({
        societyId: profile?.society_id,
        userId,
        uri: asset.uri,
        mimeType: asset.mimeType,
        base64: asset.base64,
      });
      const updated = await updatePublicProfile(userId!, {
        full_name: fullName,
        phone,
        bio,
        occupation,
        emergency_contact_name: emergencyName,
        emergency_contact_phone: emergencyPhone,
        vehicle_number: vehicle,
        avatar_url: publicUrl,
      });
      setAvatarUrl(updated.avatar_url ?? '');
      setProfile(updated);
      Toast.show({ type: 'success', text1: 'Photo updated' });
    } catch (e) {
      Toast.show({
        type: 'error',
        text1: 'Upload failed',
        text2: e instanceof Error ? e.message : 'Try again',
      });
    } finally {
      setAvatarBusy(false);
    }
  };

  if (!profile || !userId) {
    return (
      <ScreenHeader title="My profile" showBack>
        <EmptyState
          visual="disconnected"
          title="No profile"
          subtitle="Sign in again to edit your details."
        />
      </ScreenHeader>
    );
  }

  const roleLabel =
    profile.role === 'admin'
      ? 'Admin'
      : profile.role === 'guard'
        ? 'Security'
        : 'Resident';

  return (
    <ScreenHeader
      title="My profile"
      subtitle={`${roleLabel} · your details & private notes`}
      showBack
      right={
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Save profile"
          disabled={saveMutation.isPending}
          onPress={() => saveMutation.mutate()}
          className="mt-0.5 items-center justify-center rounded-card px-3.5 py-2.5"
          style={{ backgroundColor: Brand.primary }}
        >
          {saveMutation.isPending ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text className="text-sm text-white" style={{ fontFamily: FontFamily.heading }}>
              Save
            </Text>
          )}
        </Pressable>
      }
    >
      <KeyboardAwareScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 48 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        bottomOffset={24}
      >
        <View className="mb-5 items-center pt-1">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Change profile photo"
            disabled={avatarBusy}
            onPress={() => {
              void pickAvatar();
            }}
            className="items-center"
          >
            <View className="relative">
              <InitialsAvatar
                name={fullName || 'You'}
                seed={userId}
                size={88}
                imageUrl={avatarUrl || null}
              />
              <View
                className="absolute bottom-0 right-0 h-8 w-8 items-center justify-center rounded-full"
                style={{ backgroundColor: Brand.primary }}
              >
                {avatarBusy ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Camera color="#fff" size={14} strokeWidth={1.5} />
                )}
              </View>
            </View>
          </Pressable>
          <Text
            className="mt-3 text-xl text-ink"
            style={{ fontFamily: FontFamily.display }}
          >
            {fullName.trim() || 'Your name'}
          </Text>
          <Text className="mt-0.5 text-sm text-ink-muted">{roleLabel}</Text>
          <Text className="mt-2 text-xs text-ink-muted">
            Photo is visible to society admins
          </Text>
          <View className="mt-3 flex-row items-center gap-3">
            <Pressable
              accessibilityRole="button"
              disabled={avatarBusy}
              onPress={() => {
                void pickAvatar();
              }}
              className="rounded-card px-3.5 py-2"
              style={{ backgroundColor: Pastels.mint }}
            >
              <Text style={{ fontFamily: FontFamily.heading, color: Brand.primary }}>
                {avatarUrl ? 'Change photo' : 'Add photo'}
              </Text>
            </Pressable>
            {avatarUrl ? (
              <Pressable
                accessibilityRole="button"
                disabled={avatarBusy}
                onPress={() => {
                  void persistAvatar(null);
                }}
                className="rounded-card px-3.5 py-2"
                style={{ backgroundColor: Pastels.rose }}
              >
                <Text style={{ fontFamily: FontFamily.heading, color: '#C0392B' }}>
                  Remove
                </Text>
              </Pressable>
            ) : null}
          </View>
        </View>

        {privateQuery.error ? (
          <ErrorBanner
            message={privateQuery.error.message}
            onRetry={() => void privateQuery.refetch()}
          />
        ) : null}

        <SectionLabel
          title="Public details"
          subtitle="Photo, name, phone, bio, and emergency contacts can be seen by society admins."
        />
        <Field label="Full name" value={fullName} onChangeText={setFullName} placeholder="Your name" />
        <Field
          label="Phone"
          value={phone}
          onChangeText={setPhone}
          placeholder="+91 …"
          keyboardType="phone-pad"
        />
        <Field
          label="Bio"
          value={bio}
          onChangeText={setBio}
          placeholder="A short intro about yourself"
          multiline
        />
        <Field
          label="Occupation"
          value={occupation}
          onChangeText={setOccupation}
          placeholder="e.g. Software engineer"
        />
        <Field
          label="Emergency contact"
          value={emergencyName}
          onChangeText={setEmergencyName}
          placeholder="Contact name"
        />
        <Field
          label="Emergency phone"
          value={emergencyPhone}
          onChangeText={setEmergencyPhone}
          placeholder="Contact number"
          keyboardType="phone-pad"
        />
        <Field
          label="Vehicle number"
          value={vehicle}
          onChangeText={setVehicle}
          placeholder="Optional"
        />

        <SectionLabel
          title="Private details"
          subtitle="Only you can see these. Admins and other members cannot access them."
          privateSection
        />
        <Field
          label="Personal email"
          value={personalEmail}
          onChangeText={setPersonalEmail}
          placeholder="you@email.com"
          keyboardType="email-address"
          secureHint
        />
        <Field
          label="Date of birth"
          value={dob}
          onChangeText={setDob}
          placeholder="YYYY-MM-DD"
          secureHint
        />
        <Field
          label="Blood group"
          value={bloodGroup}
          onChangeText={setBloodGroup}
          placeholder="e.g. O+"
          secureHint
        />
        <Field
          label="Allergies / medical"
          value={allergies}
          onChangeText={setAllergies}
          placeholder="Optional medical notes"
          multiline
          secureHint
        />
        <Field
          label="Permanent address"
          value={address}
          onChangeText={setAddress}
          placeholder="Home / permanent address"
          multiline
          secureHint
        />

        <SectionLabel
          title="Notes"
          subtitle="Personal notes with date and time stamped automatically. Only you can see them."
          privateSection
        />
        <TextInput
          value={noteDraft}
          onChangeText={setNoteDraft}
          placeholder="Write a note…"
          placeholderTextColor={Brand.inkMuted}
          multiline
          className="mb-2 rounded-card bg-surface-card px-4 py-3 text-[15px] text-ink"
          style={{
            fontFamily: FontFamily.body,
            minHeight: 72,
            textAlignVertical: 'top',
          }}
        />
        <Pressable
          accessibilityRole="button"
          disabled={addNoteMutation.isPending || !noteDraft.trim()}
          onPress={() => addNoteMutation.mutate()}
          className="mb-4 items-center rounded-card py-3"
          style={{
            backgroundColor: noteDraft.trim() ? Pastels.butter : Pastels.sage,
            opacity: noteDraft.trim() ? 1 : 0.6,
          }}
        >
          {addNoteMutation.isPending ? (
            <ActivityIndicator color={Brand.primary} />
          ) : (
            <Text style={{ fontFamily: FontFamily.heading, color: Brand.primary }}>
              Add note
            </Text>
          )}
        </Pressable>

        {notesQuery.error ? (
          <ErrorBanner
            message={notesQuery.error.message}
            onRetry={() => void notesQuery.refetch()}
          />
        ) : null}

        {(notesQuery.data ?? []).length === 0 && !notesQuery.isLoading ? (
          <Text className="mb-4 text-sm text-ink-muted">No notes yet.</Text>
        ) : (
          <View className="gap-2">
            {(notesQuery.data ?? []).map((note) => (
              <View
                key={note.id}
                className="rounded-card bg-surface-card px-4 py-3"
                style={{
                  shadowColor: '#101512',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.04,
                  shadowRadius: 4,
                  elevation: 1,
                }}
              >
                <View className="mb-1.5 flex-row items-center justify-between gap-2">
                  <Text className="text-xs text-ink-muted">
                    {formatNoteStamp(note.created_at)}
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Delete note"
                    onPress={() => deleteNoteMutation.mutate(note.id)}
                    hitSlop={8}
                  >
                    <Trash2 color={Brand.inkMuted} size={14} strokeWidth={1.5} />
                  </Pressable>
                </View>
                <Text className="text-[15px] leading-5 text-ink">{note.body}</Text>
              </View>
            ))}
          </View>
        )}
      </KeyboardAwareScrollView>
    </ScreenHeader>
  );
}

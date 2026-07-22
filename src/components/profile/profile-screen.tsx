import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { Camera, ChevronDown, Lock, Trash2 } from 'lucide-react-native';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  LayoutAnimation,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  UIManager,
  View,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

import { InitialsAvatar } from '@/components/ui/brand';
import { ScreenHeader } from '@/components/ui/screen-header';
import { EmptyState } from '@/components/visitors/empty-state';
import { ErrorBanner } from '@/components/visitors/error-banner';
import { Brand, Elevation, FontFamily, Pastels, TypeScale } from '@/constants/theme';
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
import { useThemePalette } from '@/hooks/use-theme';
import { useAuthStore } from '@/stores/authStore';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

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

function isValidEmail(value: string): boolean {
  if (!value.trim()) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function isValidDob(value: string): boolean {
  if (!value.trim()) return true;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value.trim())) return false;
  const d = new Date(value.trim());
  return !Number.isNaN(d.getTime());
}

function isValidPhone(value: string): boolean {
  if (!value.trim()) return true;
  const digits = value.replace(/\D/g, '');
  return digits.length >= 8 && digits.length <= 15;
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  multiline,
  keyboardType,
  important,
  error,
  helper,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
  keyboardType?: 'default' | 'email-address' | 'phone-pad';
  important?: boolean;
  error?: string | null;
  helper?: string;
}) {
  const { isDark, muted, border, inkMuted, inkSoft, pastels } = useThemePalette();

  return (
    <View className="mb-3">
      <View className="mb-1.5 flex-row items-center gap-2">
        <Text
          className="uppercase tracking-widest"
          style={{
            fontFamily: FontFamily.heading,
            fontSize: TypeScale.label,
            color: isDark ? inkSoft : Brand.inkSoft,
          }}
        >
          {label}
        </Text>
        {important ? (
          <View
            className="rounded-pill px-1.5 py-0.5"
            style={{ backgroundColor: isDark ? pastels.butter : Pastels.butter }}
          >
            <Text
              style={{
                fontFamily: FontFamily.heading,
                fontSize: 9,
                color: isDark ? '#FCD34D' : Brand.accentDark,
              }}
            >
              Important
            </Text>
          </View>
        ) : null}
      </View>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={isDark ? inkMuted : Brand.inkMuted}
        multiline={multiline}
        keyboardType={keyboardType}
        autoCapitalize={keyboardType === 'email-address' ? 'none' : 'sentences'}
        className="rounded-card bg-surface px-4 py-3 text-[15px] text-ink"
        style={{
          fontFamily: FontFamily.body,
          minHeight: multiline ? 104 : 48,
          textAlignVertical: multiline ? 'top' : 'center',
          borderWidth: 1.5,
          borderColor: error
            ? '#DC2626'
            : isDark
              ? border
              : multiline
                ? '#E5E7EB'
                : 'transparent',
          backgroundColor: error ? '#FEF2F2' : isDark ? muted : Pastels.sage,
        }}
      />
      {error ? (
        <Text className="mt-1 text-xs" style={{ color: '#DC2626' }}>
          {error}
        </Text>
      ) : helper ? (
        <Text className="mt-1 text-xs text-ink-muted">{helper}</Text>
      ) : null}
    </View>
  );
}

function ProfileCard({
  title,
  subtitle,
  privateSection,
  open,
  onToggle,
  children,
}: {
  title: string;
  subtitle?: string;
  privateSection?: boolean;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  const { isDark, pastels, border, primarySoftText, primaryAccent, inkMuted } =
    useThemePalette();

  return (
    <View
      className="mb-4 overflow-hidden rounded-panel bg-surface-card"
      style={
        isDark
          ? {
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: border,
              elevation: 0,
            }
          : {
              shadowColor: '#0F172A',
              shadowOffset: Elevation.sm.shadowOffset,
              shadowOpacity: Elevation.sm.shadowOpacity,
              shadowRadius: Elevation.sm.shadowRadius,
              elevation: 2,
            }
      }
    >
      <Pressable
        onPress={onToggle}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        className="flex-row items-start gap-3 px-4 py-3.5"
      >
        <View className="min-w-0 flex-1">
          <View className="flex-row flex-wrap items-center gap-2">
            <Text
              className="text-ink"
              style={{ fontFamily: FontFamily.heading, fontSize: TypeScale.h3 }}
            >
              {title}
            </Text>
            {privateSection ? (
              <View
                className="flex-row items-center gap-1 rounded-pill px-2 py-0.5"
                style={{ backgroundColor: isDark ? pastels.rose : Pastels.rose }}
              >
                <Lock
                  color={isDark ? primarySoftText : '#E11D48'}
                  size={10}
                  strokeWidth={1.5}
                />
                <Text
                  className="text-[10px] font-semibold"
                  style={{ color: isDark ? primarySoftText : '#E11D48' }}
                >
                  Only you
                </Text>
              </View>
            ) : (
              <View
                className="rounded-pill px-2 py-0.5"
                style={{ backgroundColor: isDark ? pastels.mint : Pastels.mint }}
              >
                <Text
                  className="text-[10px] font-semibold"
                  style={{ color: isDark ? primaryAccent : Brand.primary }}
                >
                  Visible to admin
                </Text>
              </View>
            )}
          </View>
          {subtitle && open ? (
            <Text className="mt-1 text-xs leading-4 text-ink-muted">{subtitle}</Text>
          ) : null}
        </View>
        <ChevronDown
          color={isDark ? inkMuted : Brand.inkMuted}
          size={20}
          strokeWidth={1.5}
          style={{ transform: [{ rotate: open ? '180deg' : '0deg' }], marginTop: 2 }}
        />
      </Pressable>
      {open ? (
        <View
          className={isDark ? 'px-4 pb-4 pt-3' : 'border-t border-surface-border px-4 pb-4 pt-3'}
          style={
            isDark
              ? { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: border }
              : undefined
          }
        >
          {children}
        </View>
      ) : null}
    </View>
  );
}

export function ProfileScreen() {
  const profile = useAuthStore((s) => s.profile);
  const setProfile = useAuthStore((s) => s.setProfile);
  const queryClient = useQueryClient();
  const userId = profile?.id;
  const insets = useSafeAreaInsets();
  const { isDark, muted, border, inkMuted, inkSoft, primaryAccent } = useThemePalette();

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
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const [openBasic, setOpenBasic] = useState(true);
  const [openEmergency, setOpenEmergency] = useState(true);
  const [openPrivate, setOpenPrivate] = useState(false);
  const [openNotes, setOpenNotes] = useState(false);

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

  const emailError =
    touched.email && !isValidEmail(personalEmail) ? 'Enter a valid email address' : null;
  const dobError =
    touched.dob && !isValidDob(dob) ? 'Use YYYY-MM-DD format' : null;
  const phoneError =
    touched.phone && !isValidPhone(phone) ? 'Enter a valid phone number' : null;
  const emergencyPhoneError =
    touched.emergencyPhone && !isValidPhone(emergencyPhone)
      ? 'Enter a valid phone number'
      : null;

  const canSave = useMemo(
    () =>
      isValidEmail(personalEmail) &&
      isValidDob(dob) &&
      isValidPhone(phone) &&
      isValidPhone(emergencyPhone) &&
      Boolean(fullName.trim()),
    [personalEmail, dob, phone, emergencyPhone, fullName],
  );

  const toggle = (key: 'basic' | 'emergency' | 'private' | 'notes') => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    if (key === 'basic') setOpenBasic((v) => !v);
    if (key === 'emergency') setOpenEmergency((v) => !v);
    if (key === 'private') setOpenPrivate((v) => !v);
    if (key === 'notes') setOpenNotes((v) => !v);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error('Not signed in.');
      if (!canSave) throw new Error('Fix the highlighted fields before saving.');
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
    if (!userId || avatarBusy) return;

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

  const notes = notesQuery.data ?? [];

  return (
    <ScreenHeader
      title="My profile"
      subtitle={`${roleLabel} · your details & private notes`}
      showBack
    >
      <KeyboardAwareScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingBottom: 100 + Math.max(insets.bottom, 8),
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        bottomOffset={100}
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
          <Text className="mt-3 text-xl text-ink" style={{ fontFamily: FontFamily.display }}>
            {fullName.trim() || 'Your name'}
          </Text>
          <Text className="mt-0.5 text-sm text-ink-muted">{roleLabel}</Text>
          <View className="mt-3 flex-row items-center gap-3">
            <Pressable
              accessibilityRole="button"
              disabled={avatarBusy}
              onPress={() => {
                void pickAvatar();
              }}
              className="rounded-card px-3.5 py-2"
              style={{
                backgroundColor: isDark ? muted : Pastels.mint,
              }}
            >
              <Text
                style={{
                  fontFamily: FontFamily.heading,
                  color: isDark ? primaryAccent : Brand.primary,
                }}
              >
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
                style={
                  isDark
                    ? {
                        backgroundColor: muted,
                        borderWidth: StyleSheet.hairlineWidth,
                        borderColor: border,
                      }
                    : { backgroundColor: Pastels.rose }
                }
              >
                <Text
                  style={{
                    fontFamily: FontFamily.heading,
                    color: isDark ? primaryAccent : '#E11D48',
                  }}
                >
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

        <ProfileCard
          title="Basic info"
          subtitle="Name, phone, bio, and occupation — visible to society admins."
          open={openBasic}
          onToggle={() => toggle('basic')}
        >
          <Field
            label="Full name"
            value={fullName}
            onChangeText={setFullName}
            placeholder="Your name"
            important
          />
          <Field
            label="Phone"
            value={phone}
            onChangeText={(v) => {
              setPhone(v);
              setTouched((t) => ({ ...t, phone: true }));
            }}
            placeholder="+91 …"
            keyboardType="phone-pad"
            error={phoneError}
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
            label="Vehicle number"
            value={vehicle}
            onChangeText={setVehicle}
            placeholder="Optional"
            helper="Optional — used for parking and gate verification."
          />
        </ProfileCard>

        <ProfileCard
          title="Emergency contact"
          subtitle="Who to call in an urgent situation."
          open={openEmergency}
          onToggle={() => toggle('emergency')}
        >
          <View
            className="rounded-card px-3 py-3"
            style={{
              backgroundColor: isDark ? muted : Pastels.butter,
              borderLeftWidth: 3,
              borderLeftColor: isDark ? primaryAccent : Brand.accent,
              borderWidth: isDark ? 1 : 0,
              borderColor: isDark ? border : 'transparent',
            }}
          >
            <Text
              className="mb-3 text-xs uppercase tracking-widest"
              style={{
                fontFamily: FontFamily.heading,
                color: isDark ? primaryAccent : Brand.accentDark,
              }}
            >
              Contact person
            </Text>
            <Field
              label="Name"
              value={emergencyName}
              onChangeText={setEmergencyName}
              placeholder="Contact name"
              important
            />
            <Field
              label="Phone"
              value={emergencyPhone}
              onChangeText={(v) => {
                setEmergencyPhone(v);
                setTouched((t) => ({ ...t, emergencyPhone: true }));
              }}
              placeholder="Contact number"
              keyboardType="phone-pad"
              important
              error={emergencyPhoneError}
            />
          </View>
        </ProfileCard>

        <ProfileCard
          title="Private details"
          subtitle="Medical and personal data — only you can see these."
          privateSection
          open={openPrivate}
          onToggle={() => toggle('private')}
        >
          <Field
            label="Blood group"
            value={bloodGroup}
            onChangeText={setBloodGroup}
            placeholder="e.g. O+"
            important
            helper="Useful for medical emergencies."
          />
          <Field
            label="Allergies / medical"
            value={allergies}
            onChangeText={setAllergies}
            placeholder="Optional medical notes"
            multiline
            important
          />
          <Field
            label="Personal email"
            value={personalEmail}
            onChangeText={(v) => {
              setPersonalEmail(v);
              setTouched((t) => ({ ...t, email: true }));
            }}
            placeholder="you@email.com"
            keyboardType="email-address"
            error={emailError}
          />
          <Field
            label="Date of birth"
            value={dob}
            onChangeText={(v) => {
              setDob(v);
              setTouched((t) => ({ ...t, dob: true }));
            }}
            placeholder="YYYY-MM-DD"
            helper="Format: YYYY-MM-DD"
            error={dobError}
          />
          <Field
            label="Permanent address"
            value={address}
            onChangeText={setAddress}
            placeholder="Home / permanent address"
            multiline
          />
        </ProfileCard>

        <ProfileCard
          title="Personal notes"
          subtitle="A private timeline — stamped when you add each note."
          privateSection
          open={openNotes}
          onToggle={() => toggle('notes')}
        >
          <TextInput
            value={noteDraft}
            onChangeText={setNoteDraft}
            placeholder="Write a new note…"
            placeholderTextColor={isDark ? inkMuted : Brand.inkMuted}
            multiline
            className="mb-2 rounded-card px-4 py-3 text-[15px] text-ink"
            style={{
              fontFamily: FontFamily.body,
              minHeight: 88,
              textAlignVertical: 'top',
              backgroundColor: isDark ? muted : Pastels.sage,
              borderWidth: 1.5,
              borderColor: isDark ? border : '#E5E7EB',
            }}
          />
          <Pressable
            accessibilityRole="button"
            disabled={addNoteMutation.isPending || !noteDraft.trim()}
            onPress={() => addNoteMutation.mutate()}
            className="mb-4 items-center rounded-card py-3"
            style={{
              backgroundColor: noteDraft.trim() ? Brand.primary : isDark ? muted : Pastels.sage,
              opacity: noteDraft.trim() ? 1 : 0.7,
            }}
          >
            {addNoteMutation.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text
                style={{
                  fontFamily: FontFamily.heading,
                  color: noteDraft.trim() ? '#fff' : isDark ? inkMuted : Brand.inkMuted,
                }}
              >
                Add to timeline
              </Text>
            )}
          </Pressable>

          {notesQuery.error ? (
            <ErrorBanner
              message={notesQuery.error.message}
              onRetry={() => void notesQuery.refetch()}
            />
          ) : null}

          {notes.length === 0 && !notesQuery.isLoading ? (
            <Text className="text-sm text-ink-muted">No notes yet — add your first one above.</Text>
          ) : (
            <View>
              <Text
                className="mb-2 uppercase tracking-widest"
                style={{
                  fontFamily: FontFamily.heading,
                  fontSize: TypeScale.label,
                  color: isDark ? inkSoft : Brand.inkSoft,
                }}
              >
                Timeline · {notes.length}
              </Text>
              {notes.map((note, index) => (
                <View
                  key={note.id}
                  className="flex-row gap-3"
                  style={{ marginBottom: index === notes.length - 1 ? 0 : 12 }}
                >
                  <View className="items-center pt-1">
                    <View
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: Brand.primary }}
                    />
                    {index < notes.length - 1 ? (
                      <View
                        className="mt-1 w-0.5 flex-1"
                        style={{ backgroundColor: Brand.primarySoft, minHeight: 24 }}
                      />
                    ) : null}
                  </View>
                  <View
                    className="min-w-0 flex-1 rounded-card px-3.5 py-3"
                    style={{ backgroundColor: Pastels.sage }}
                  >
                    <View className="mb-1 flex-row items-center justify-between gap-2">
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
                </View>
              ))}
            </View>
          )}
        </ProfileCard>
      </KeyboardAwareScrollView>

      <View
        className="border-t border-surface-border bg-surface-card px-5 pt-3"
        style={{
          paddingBottom: Math.max(insets.bottom, 12),
          shadowColor: '#0F172A',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.06,
          shadowRadius: 8,
          elevation: 8,
        }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Save profile"
          disabled={saveMutation.isPending || !canSave}
          onPress={() => {
            setTouched({ email: true, dob: true, phone: true, emergencyPhone: true });
            saveMutation.mutate();
          }}
          className="items-center rounded-card py-3.5"
          style={{
            backgroundColor: canSave ? Brand.primary : '#D1D5DB',
          }}
        >
          {saveMutation.isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-white" style={{ fontFamily: FontFamily.heading }}>
              Save profile
            </Text>
          )}
        </Pressable>
      </View>
    </ScreenHeader>
  );
}

import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { Search, X, Camera, ImageIcon, ChevronRight, ChevronLeft } from 'lucide-react-native';
import { useThemePalette } from '@/hooks/use-theme';
import { type ReactNode, useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MotiView, AnimatePresence } from 'moti';

import { ChipSelector } from '@/components/ui/chip-selector';
import { VisitorSilhouette } from '@/components/illustrations';
import { EmptyState } from '@/components/visitors/empty-state';
import { ErrorBanner } from '@/components/visitors/error-banner';
import { flatTowerName, notifyResidentOfVisitor } from '@/lib/visitors';
import { uploadLocalImage } from '@/lib/storage-upload';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import type { FlatWithTower, VisitorType } from '@/types/database';
import { VISITOR_TYPES } from '@/types/database';
import { Brand, FontFamily } from '@/constants/theme';
import { Tokens } from '@/theme/tokens';

const STEPS = ['Photo', 'Details', 'Type & Submit'] as const;
const TOTAL_STEPS = STEPS.length;

// ─── Step progress bar ──────────────────────────────────────────────────────
function StepIndicator({ current }: { current: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 6, paddingHorizontal: 16, paddingBottom: 16, paddingTop: 4 }}>
      {STEPS.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <View key={label} style={{ flex: 1, gap: 4 }}>
            <MotiView
              animate={{
                backgroundColor: done || active ? Brand.primary : '#E2E8F0',
                scaleX: 1,
              }}
              transition={{ type: 'timing', duration: 300 }}
              style={{
                height: 4,
                borderRadius: 2,
                backgroundColor: done || active ? Brand.primary : '#E2E8F0',
              }}
            />
            <Text
              style={{
                fontSize: 9,
                fontFamily: FontFamily.medium,
                color: active ? Brand.primary : done ? Brand.primary : '#94A3B8',
                textAlign: 'center',
                letterSpacing: 0.3,
              }}
            >
              {label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

export default function RegisterVisitorScreen() {
  const palette = useThemePalette();
  const profile = useAuthStore((s) => s.profile);
  const user = useAuthStore((s) => s.user);

  const [step, setStep] = useState(0);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [purpose, setPurpose] = useState('');
  const [type, setType] = useState<VisitorType>('guest');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [photoMimeType, setPhotoMimeType] = useState<string | null>(null);
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [selectedFlat, setSelectedFlat] = useState<FlatWithTower | null>(null);

  const [flatQuery, setFlatQuery] = useState('');
  const [flatResults, setFlatResults] = useState<FlatWithTower[]>([]);
  const [searchingFlats, setSearchingFlats] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const searchFlats = useCallback(
    async (query: string) => {
      setFlatQuery(query);
      setSelectedFlat(null);

      if (!profile?.society_id || query.trim().length < 1) {
        setFlatResults([]);
        return;
      }

      setSearchingFlats(true);
      try {
        const { data, error: searchError } = await supabase
          .from('flats')
          .select(
            `
            id,
            tower_id,
            number,
            towers!inner (
              id,
              name,
              society_id
            )
          `,
          )
          .eq('towers.society_id', profile.society_id)
          .ilike('number', `%${query.trim()}%`)
          .limit(12);

        if (searchError) {
          setError(searchError.message);
          setFlatResults([]);
          return;
        }

        const rows = (data ?? []).map((row) => {
          const towers = Array.isArray(row.towers) ? row.towers[0] ?? null : row.towers;
          return { ...row, towers } as FlatWithTower;
        });
        setFlatResults(rows);
      } finally {
        setSearchingFlats(false);
      }
    },
    [profile?.society_id],
  );

  const pickPhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      setError('Camera permission is required to take a visitor photo.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.6,
      allowsEditing: true,
      aspect: [1, 1],
      base64: true,
    });

    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
      setPhotoMimeType(result.assets[0].mimeType ?? null);
      setPhotoBase64(result.assets[0].base64 ?? null);
    }
  };

  const pickFromLibrary = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError('Photo library permission is required.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.6,
      allowsEditing: true,
      aspect: [1, 1],
      base64: true,
    });

    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
      setPhotoMimeType(result.assets[0].mimeType ?? null);
      setPhotoBase64(result.assets[0].base64 ?? null);
    }
  };

  const uploadPhoto = async (uri: string): Promise<string | null> => {
    if (!profile?.society_id) return null;

    const { publicUrl, error: uploadError } = await uploadLocalImage({
      bucket: 'visitor-photos',
      societyId: profile.society_id,
      uri,
      mimeType: photoMimeType,
      base64: photoBase64,
    });

    if (uploadError) {
      console.warn('Photo upload failed:', uploadError);
      throw new Error(uploadError);
    }

    return publicUrl;
  };

  const resetForm = () => {
    setName('');
    setPhone('');
    setPurpose('');
    setType('guest');
    setPhotoUri(null);
    setPhotoMimeType(null);
    setPhotoBase64(null);
    setSelectedFlat(null);
    setFlatQuery('');
    setFlatResults([]);
    setStep(0);
  };

  const onSubmit = async () => {
    setError(null);
    setSuccess(null);

    if (!profile?.society_id || !user) {
      setError('Your guard profile must be linked to a society.');
      return;
    }
    if (!name.trim()) {
      setError('Visitor name is required.');
      return;
    }
    if (!selectedFlat) {
      setError('Select a flat for this visitor.');
      return;
    }

    setSubmitting(true);

    try {
      let photoUrl: string | null = null;
      if (photoUri) {
        try {
          photoUrl = await uploadPhoto(photoUri);
        } catch (uploadErr) {
          setError(
            uploadErr instanceof Error
              ? `Photo upload failed: ${uploadErr.message}`
              : 'Photo upload failed. Remove the photo or try again.',
          );
          return;
        }
      }

      const { data, error: insertError } = await supabase
        .from('visitors')
        .insert({
          name: name.trim(),
          phone: phone.trim() || null,
          photo_url: photoUrl,
          purpose: purpose.trim() || null,
          type,
          status: 'pending',
          flat_id: selectedFlat.id,
          created_by: user.id,
          society_id: profile.society_id,
        })
        .select('id')
        .single();

      if (insertError) {
        setError(insertError.message);
        return;
      }

      await notifyResidentOfVisitor({
        flatId: selectedFlat.id,
        visitorName: name.trim(),
        visitorType: type,
        societyId: profile.society_id,
        visitorId: data?.id,
        flatLabel: `${flatTowerName(selectedFlat.towers) ? `${flatTowerName(selectedFlat.towers)} · ` : ''}${selectedFlat.number}`,
      });

      setSuccess(`Request sent for ${name.trim()}. Waiting for resident approval.`);
      resetForm();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to register visitor');
    } finally {
      setSubmitting(false);
    }
  };

  if (!profile?.society_id) {
    return (
      <SafeAreaView className="flex-1 bg-surface">
        <EmptyState
          visual="disconnected"
          title="No society linked"
          subtitle="Ask an admin to assign your guard profile to a society before registering visitors."
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      {/* ── Header ── */}
      <View style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 4 }}>
        <Text style={{ ...Tokens.typography.h2, color: Tokens.color.textPrimary }}>Register visitor</Text>
        <Text style={{ ...Tokens.typography.caption, color: Tokens.color.textMuted, marginTop: 2 }}>
          Creates a pending request for the flat&apos;s resident.
        </Text>
      </View>

      {/* ── Step indicator ── */}
      <StepIndicator current={step} />

      <KeyboardAwareScrollView
        bottomOffset={32}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: 16, paddingBottom: 48 }}
      >
        {error ? <ErrorBanner message={error} onRetry={() => setError(null)} /> : null}
        {success ? (
          <View style={{ marginBottom: 12, borderRadius: 12, borderWidth: 1, borderColor: '#BBF7D0', backgroundColor: '#F0FDF4', padding: 12 }}>
            <Text style={{ fontSize: 14, color: '#15803D' }}>{success}</Text>
          </View>
        ) : null}

        {/* ── STEP 0: Photo ── */}
        <AnimatePresence exitBeforeEnter>
          {step === 0 && (
            <MotiView
              key="step-photo"
              from={{ opacity: 0, translateX: 40 }}
              animate={{ opacity: 1, translateX: 0 }}
              exit={{ opacity: 0, translateX: -40 }}
              transition={{ type: 'timing', duration: 260 }}
            >
              <Text style={{ ...Tokens.typography.h3, color: Tokens.color.textSecondary, marginBottom: 16 }}>
                Step 1 of 3 — Take or choose a photo (optional)
              </Text>

              {/* Photo preview */}
              <View style={{ alignItems: 'center', marginBottom: 24 }}>
                <View
                  style={{
                    width: 120, height: 120, borderRadius: 60,
                    overflow: 'hidden', backgroundColor: '#EFF6FF',
                    borderWidth: 3, borderColor: Brand.primary + '30',
                  }}
                >
                  {photoUri ? (
                    <Image source={{ uri: photoUri }} style={{ width: 120, height: 120 }} contentFit="cover" />
                  ) : (
                    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                      <VisitorSilhouette size={80} />
                    </View>
                  )}
                </View>
                {photoUri ? (
                  <Pressable
                    onPress={() => { setPhotoUri(null); setPhotoMimeType(null); setPhotoBase64(null); }}
                    style={{ marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 4 }}
                  >
                    <X color={Tokens.color.danger} size={14} />
                    <Text style={{ fontSize: 13, color: Tokens.color.danger }}>Remove photo</Text>
                  </Pressable>
                ) : null}
              </View>

              <View style={{ gap: 10 }}>
                <Pressable
                  onPress={pickPhoto}
                  style={{
                    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
                    backgroundColor: Brand.primary, borderRadius: 14, paddingVertical: 14,
                  }}
                >
                  <Camera color="#fff" size={18} />
                  <Text style={{ color: '#fff', fontFamily: FontFamily.heading, fontSize: 15 }}>Take photo</Text>
                </Pressable>
                <Pressable
                  onPress={pickFromLibrary}
                  style={{
                    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
                    borderRadius: 14, borderWidth: 1, borderColor: Tokens.color.borderDefault,
                    backgroundColor: Tokens.color.surfaceCard, paddingVertical: 13,
                  }}
                >
                  <ImageIcon color={Tokens.color.textSecondary} size={18} />
                  <Text style={{ color: Tokens.color.textSecondary, fontFamily: FontFamily.heading, fontSize: 15 }}>Choose from gallery</Text>
                </Pressable>
              </View>

              <NavButtons
                step={step}
                onNext={() => setStep(1)}
                showPrev={false}
                nextLabel="Next: Details →"
              />
            </MotiView>
          )}

          {/* ── STEP 1: Details ── */}
          {step === 1 && (
            <MotiView
              key="step-details"
              from={{ opacity: 0, translateX: 40 }}
              animate={{ opacity: 1, translateX: 0 }}
              exit={{ opacity: 0, translateX: -40 }}
              transition={{ type: 'timing', duration: 260 }}
            >
              <Text style={{ ...Tokens.typography.h3, color: Tokens.color.textSecondary, marginBottom: 16 }}>
                Step 2 of 3 — Visitor details
              </Text>

              <Field label="Name *">
                <TextInput
                  className="rounded-xl border border-surface-border bg-surface-card px-4 py-3 text-base text-ink"
                  placeholder="Visitor name"
                  placeholderTextColor="#94A3B8"
                  value={name}
                  onChangeText={setName}
                />
              </Field>

              <Field label="Phone">
                <TextInput
                  className="rounded-xl border border-surface-border bg-surface-card px-4 py-3 text-base text-ink"
                  placeholder="Optional"
                  placeholderTextColor="#94A3B8"
                  keyboardType="phone-pad"
                  value={phone}
                  onChangeText={setPhone}
                />
              </Field>

              <Field label="Purpose">
                <TextInput
                  className="rounded-xl border border-surface-border bg-surface-card px-4 py-3 text-base text-ink"
                  placeholder="Meeting, delivery, etc."
                  placeholderTextColor="#94A3B8"
                  value={purpose}
                  onChangeText={setPurpose}
                />
              </Field>

              <NavButtons
                step={step}
                onPrev={() => setStep(0)}
                onNext={() => {
                  if (!name.trim()) { setError('Visitor name is required.'); return; }
                  setError(null);
                  setStep(2);
                }}
                nextLabel="Next: Type →"
              />
            </MotiView>
          )}

          {/* ── STEP 2: Type & Flat & Submit ── */}
          {step === 2 && (
            <MotiView
              key="step-type"
              from={{ opacity: 0, translateX: 40 }}
              animate={{ opacity: 1, translateX: 0 }}
              exit={{ opacity: 0, translateX: -40 }}
              transition={{ type: 'timing', duration: 260 }}
            >
              <Text style={{ ...Tokens.typography.h3, color: Tokens.color.textSecondary, marginBottom: 16 }}>
                Step 3 of 3 — Type &amp; flat
              </Text>

              <Text style={{ ...Tokens.typography.label, color: Tokens.color.textSecondary, marginBottom: 8 }}>Type</Text>
              <ChipSelector
                className="mb-4"
                presentation="tiles"
                options={VISITOR_TYPES.map((t) => ({ value: t.value, label: t.label }))}
                value={type}
                onChange={setType}
              />

              <Text style={{ ...Tokens.typography.label, color: Tokens.color.textSecondary, marginBottom: 8 }}>Flat *</Text>
              {selectedFlat ? (
                <View style={{
                  marginBottom: 16, flexDirection: 'row', alignItems: 'center',
                  justifyContent: 'space-between', borderRadius: 12, borderWidth: 1,
                  borderColor: '#BBF7D0', backgroundColor: '#F0FDF4', paddingHorizontal: 16, paddingVertical: 12,
                }}>
                  <Text style={{ fontWeight: '600', color: Tokens.color.textPrimary }}>
                    {flatTowerName(selectedFlat.towers) ? `${flatTowerName(selectedFlat.towers)} · ` : ''}
                    Flat {selectedFlat.number}
                  </Text>
                  <Pressable onPress={() => setSelectedFlat(null)}>
                    <Text style={{ fontSize: 13, color: Tokens.color.textMuted }}>Change</Text>
                  </Pressable>
                </View>
              ) : (
                <View style={{ marginBottom: 16 }}>
                  <View style={{
                    marginBottom: 8, flexDirection: 'row', alignItems: 'center',
                    borderRadius: 12, borderWidth: 1, borderColor: Tokens.color.borderDefault,
                    backgroundColor: Tokens.color.surfaceCard, paddingHorizontal: 12,
                  }}>
                    <Search color="#94A3B8" size={18} />
                    <TextInput
                      style={{ marginLeft: 8, flex: 1, paddingVertical: 12, fontSize: 15, color: Tokens.color.textPrimary }}
                      placeholder="Search flat number…"
                      placeholderTextColor="#94A3B8"
                      value={flatQuery}
                      onChangeText={searchFlats}
                      autoCapitalize="characters"
                    />
                    {searchingFlats ? <ActivityIndicator color={Brand.primary} /> : null}
                  </View>
                  {flatResults.length > 0 ? (
                    <View style={{ borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: Tokens.color.borderDefault, backgroundColor: Tokens.color.surfaceCard }}>
                      <FlatList
                        data={flatResults}
                        keyExtractor={(item) => item.id}
                        scrollEnabled={false}
                        renderItem={({ item, index }) => (
                          <Pressable
                            onPress={() => {
                              setSelectedFlat(item);
                              setFlatResults([]);
                              setFlatQuery(item.number);
                            }}
                            style={{
                              paddingHorizontal: 16, paddingVertical: 12,
                              borderBottomWidth: index < flatResults.length - 1 ? 1 : 0,
                              borderBottomColor: Tokens.color.borderDefault,
                            }}
                          >
                            <Text style={{ fontWeight: '500', color: Tokens.color.textPrimary }}>
                              Flat {item.number}
                              {flatTowerName(item.towers) ? ` · ${flatTowerName(item.towers)}` : ''}
                            </Text>
                          </Pressable>
                        )}
                      />
                    </View>
                  ) : flatQuery.trim().length > 0 && !searchingFlats ? (
                    <Text style={{ fontSize: 13, color: Tokens.color.textMuted }}>
                      No flats match &ldquo;{flatQuery}&rdquo;.
                    </Text>
                  ) : null}
                </View>
              )}

              <NavButtons
                step={step}
                onPrev={() => setStep(1)}
                showNext={false}
              />

              <Pressable
                disabled={submitting}
                onPress={onSubmit}
                style={{
                  marginTop: 8, alignItems: 'center', borderRadius: 14,
                  backgroundColor: Brand.primary, paddingVertical: 14,
                  opacity: submitting ? 0.7 : 1,
                }}
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={{ color: '#fff', fontFamily: FontFamily.heading, fontSize: 15 }}>Submit for approval</Text>
                )}
              </Pressable>
            </MotiView>
          )}
        </AnimatePresence>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}

// ─── Shared field wrapper ─────────────────────────────────────────────────────
function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={{ marginBottom: 6, fontSize: 13, fontWeight: '500', color: '#64748B' }}>{label}</Text>
      {children}
    </View>
  );
}

// ─── Prev / Next navigation ───────────────────────────────────────────────────
function NavButtons({
  step,
  onPrev,
  onNext,
  showPrev = true,
  showNext = true,
  nextLabel = 'Next →',
}: {
  step: number;
  onPrev?: () => void;
  onNext?: () => void;
  showPrev?: boolean;
  showNext?: boolean;
  nextLabel?: string;
}) {
  return (
    <View style={{ flexDirection: 'row', gap: 10, marginTop: 24 }}>
      {showPrev && step > 0 ? (
        <Pressable
          onPress={onPrev}
          style={{
            flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
            borderRadius: 14, borderWidth: 1, borderColor: '#E2E8F0',
            backgroundColor: '#F8FAFC', paddingVertical: 13,
          }}
        >
          <ChevronLeft color="#64748B" size={16} />
          <Text style={{ color: '#64748B', fontWeight: '600', fontSize: 14 }}>Back</Text>
        </Pressable>
      ) : showPrev ? <View style={{ flex: 1 }} /> : null}

      {showNext ? (
        <Pressable
          onPress={onNext}
          style={{
            flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
            borderRadius: 14, backgroundColor: Brand.primary, paddingVertical: 13,
          }}
        >
          <Text style={{ color: '#fff', fontWeight: '600', fontSize: 14 }}>{nextLabel}</Text>
          <ChevronRight color="#fff" size={16} />
        </Pressable>
      ) : null}
    </View>
  );
}

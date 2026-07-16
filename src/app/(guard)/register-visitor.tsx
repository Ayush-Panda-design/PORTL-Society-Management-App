import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { Search, X } from 'lucide-react-native';
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

import { ChipSelector } from '@/components/ui/chip-selector';
import { VisitorSilhouette } from '@/components/illustrations';
import { EmptyState } from '@/components/visitors/empty-state';
import { ErrorBanner } from '@/components/visitors/error-banner';
import { flatTowerName, notifyResidentOfVisitor } from '@/lib/visitors';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import type { FlatWithTower, VisitorType } from '@/types/database';
import { VISITOR_TYPES } from '@/types/database';
import { Brand } from '@/constants/theme';

export default function RegisterVisitorScreen() {
  const profile = useAuthStore((s) => s.profile);
  const user = useAuthStore((s) => s.user);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [purpose, setPurpose] = useState('');
  const [type, setType] = useState<VisitorType>('guest');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
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
      quality: 0.7,
      allowsEditing: true,
      aspect: [1, 1],
    });

    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
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
      quality: 0.7,
      allowsEditing: true,
      aspect: [1, 1],
    });

    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const uploadPhoto = async (uri: string): Promise<string | null> => {
    try {
      const ext = uri.split('.').pop()?.toLowerCase() ?? 'jpg';
      const path = `${profile?.society_id}/${Date.now()}.${ext}`;

      const response = await fetch(uri);
      const blob = await response.blob();

      const { error: uploadError } = await supabase.storage
        .from('visitor-photos')
        .upload(path, blob, {
          contentType: blob.type || 'image/jpeg',
          upsert: false,
        });

      if (uploadError) {
        console.warn('Photo upload failed:', uploadError.message);
        return null;
      }

      const { data } = supabase.storage.from('visitor-photos').getPublicUrl(path);
      return data.publicUrl;
    } catch (e) {
      console.warn('Photo upload error:', e);
      return null;
    }
  };

  const resetForm = () => {
    setName('');
    setPhone('');
    setPurpose('');
    setType('guest');
    setPhotoUri(null);
    setSelectedFlat(null);
    setFlatQuery('');
    setFlatResults([]);
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
        photoUrl = await uploadPhoto(photoUri);
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
      });

      setSuccess(`Request sent for ${name.trim()}. Waiting for resident approval.`);
      resetForm();
      void data;
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
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      <KeyboardAwareScrollView
        bottomOffset={32}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: 16, paddingBottom: 48 }}
      >
          <Text className="mb-1 text-2xl font-bold text-slate-900">Register visitor</Text>
          <Text className="mb-6 text-sm text-slate-500">
            Creates a pending request for the flat&apos;s resident.
          </Text>

          {error ? <ErrorBanner message={error} onRetry={() => setError(null)} /> : null}
          {success ? (
            <View className="mb-3 rounded-xl border border-teal-200 bg-teal-50 px-4 py-3">
              <Text className="text-sm text-teal-800">{success}</Text>
            </View>
          ) : null}

          <Text className="mb-2 text-sm font-medium text-slate-700">Photo</Text>
          <View className="mb-4 flex-row items-center gap-3">
            <View className="h-20 w-20 overflow-hidden rounded-2xl bg-brand-50">
              {photoUri ? (
                <Image source={{ uri: photoUri }} style={{ width: 80, height: 80 }} contentFit="cover" />
              ) : (
                <View className="h-full w-full items-center justify-center">
                  <VisitorSilhouette size={64} />
                </View>
              )}
            </View>
            <View className="flex-1 gap-2">
              <Pressable
                onPress={pickPhoto}
                className="items-center rounded-xl bg-teal-700 py-2.5"
              >
                <Text className="text-sm font-semibold text-white">Take photo</Text>
              </Pressable>
              <Pressable
                onPress={pickFromLibrary}
                className="items-center rounded-xl border border-slate-200 bg-white py-2.5"
              >
                <Text className="text-sm font-semibold text-slate-700">Choose from gallery</Text>
              </Pressable>
            </View>
            {photoUri ? (
              <Pressable
                onPress={() => setPhotoUri(null)}
                className="h-9 w-9 items-center justify-center rounded-full bg-slate-200"
              >
                <X color="#475569" size={16} />
              </Pressable>
            ) : null}
          </View>

          <Field label="Name">
            <TextInput
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900"
              placeholder="Visitor name"
              placeholderTextColor="#94A3B8"
              value={name}
              onChangeText={setName}
            />
          </Field>

          <Field label="Phone">
            <TextInput
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900"
              placeholder="Optional"
              placeholderTextColor="#94A3B8"
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
            />
          </Field>

          <Field label="Purpose">
            <TextInput
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900"
              placeholder="Meeting, delivery, etc."
              placeholderTextColor="#94A3B8"
              value={purpose}
              onChangeText={setPurpose}
            />
          </Field>

          <Text className="mb-2 text-sm font-medium text-slate-700">Type</Text>
          <ChipSelector
            className="mb-4"
            presentation="tiles"
            options={VISITOR_TYPES.map((t) => ({ value: t.value, label: t.label }))}
            value={type}
            onChange={setType}
          />

          <Text className="mb-2 text-sm font-medium text-slate-700">Flat</Text>
          {selectedFlat ? (
            <View className="mb-4 flex-row items-center justify-between rounded-xl border border-teal-200 bg-teal-50 px-4 py-3">
              <Text className="font-semibold text-teal-900">
                {flatTowerName(selectedFlat.towers)
                  ? `${flatTowerName(selectedFlat.towers)} · `
                  : ''}
                Flat {selectedFlat.number}
              </Text>
              <Pressable onPress={() => setSelectedFlat(null)}>
                <Text className="text-sm font-medium text-teal-700">Change</Text>
              </Pressable>
            </View>
          ) : (
            <View className="mb-4">
              <View className="mb-2 flex-row items-center rounded-xl border border-slate-200 bg-white px-3">
                <Search color="#94A3B8" size={18} />
                <TextInput
                  className="ml-2 flex-1 py-3 text-base text-slate-900"
                  placeholder="Search flat number…"
                  placeholderTextColor="#94A3B8"
                  value={flatQuery}
                  onChangeText={searchFlats}
                  autoCapitalize="characters"
                />
                {searchingFlats ? <ActivityIndicator color={Brand.primary} /> : null}
              </View>
              {flatResults.length > 0 ? (
                <View className="overflow-hidden rounded-xl border border-slate-200 bg-white">
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
                        className={`px-4 py-3 ${
                          index < flatResults.length - 1 ? 'border-b border-slate-100' : ''
                        }`}
                      >
                        <Text className="font-medium text-slate-900">
                          Flat {item.number}
                          {flatTowerName(item.towers)
                            ? ` · ${flatTowerName(item.towers)}`
                            : ''}
                        </Text>
                      </Pressable>
                    )}
                  />
                </View>
              ) : flatQuery.trim().length > 0 && !searchingFlats ? (
                <Text className="text-sm text-slate-500">No flats match “{flatQuery}”.</Text>
              ) : null}
            </View>
          )}

          <Pressable
            disabled={submitting}
            onPress={onSubmit}
            className={`mt-2 items-center rounded-xl bg-teal-700 py-3.5 ${
              submitting ? 'opacity-70' : ''
            }`}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-base font-semibold text-white">Submit for approval</Text>
            )}
          </Pressable>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View className="mb-4">
      <Text className="mb-2 text-sm font-medium text-slate-700">{label}</Text>
      {children}
    </View>
  );
}

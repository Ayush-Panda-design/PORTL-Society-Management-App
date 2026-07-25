import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Camera } from 'lucide-react-native';
import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

import { InitialsAvatar } from '@/components/ui/brand';
import { Brand, FontFamily, Gradients } from '@/constants/theme';
import { destinationForProfile } from '@/lib/auth-routing';
import { updatePublicProfile, uploadProfilePhoto } from '@/lib/profile-api';
import { useAuthStore } from '@/stores/authStore';

export default function CompleteProfileScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);
  const setProfile = useAuthStore((s) => s.setProfile);
  const fetchProfile = useAuthStore((s) => s.fetchProfile);

  const [fullName, setFullName] = useState(profile?.full_name ?? '');
  const [phone, setPhone] = useState(profile?.phone ?? '');
  const [avatarUrl] = useState(profile?.avatar_url ?? '');
  const [localUri, setLocalUri] = useState<string | null>(null);
  const [pendingAsset, setPendingAsset] = useState<{
    uri: string;
    mimeType?: string | null;
    base64?: string | null;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [picking, setPicking] = useState(false);

  const pickPhoto = async () => {
    setPicking(true);
    setError(null);
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setError('Photo library permission is required so guards can match your face.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.8,
        allowsEditing: true,
        aspect: [1, 1],
        base64: true,
      });

      if (result.canceled || !result.assets[0]) return;

      const asset = result.assets[0];
      setLocalUri(asset.uri);
      setPendingAsset({
        uri: asset.uri,
        mimeType: asset.mimeType,
        base64: asset.base64,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not open photo library');
    } finally {
      setPicking(false);
    }
  };

  const onContinue = async () => {
    setError(null);
    if (!user?.id) {
      setError('Session expired. Sign in again.');
      return;
    }
    if (!fullName.trim()) {
      setError('Enter your full name as it appears on your ID / lease.');
      return;
    }
    if (!pendingAsset && !avatarUrl.trim()) {
      setError('Add a clear face photo so the gate can verify you.');
      return;
    }

    setSubmitting(true);
    try {
      let nextAvatar = avatarUrl.trim();
      if (pendingAsset) {
        nextAvatar = await uploadProfilePhoto({
          societyId: profile?.society_id,
          userId: user.id,
          uri: pendingAsset.uri,
          mimeType: pendingAsset.mimeType,
          base64: pendingAsset.base64,
        });
      }

      const updated = await updatePublicProfile(user.id, {
        full_name: fullName.trim(),
        phone: phone.trim() || null,
        bio: profile?.bio ?? null,
        occupation: profile?.occupation ?? null,
        emergency_contact_name: profile?.emergency_contact_name ?? null,
        emergency_contact_phone: profile?.emergency_contact_phone ?? null,
        vehicle_number: profile?.vehicle_number ?? null,
        avatar_url: nextAvatar,
      });

      setProfile(updated);
      const refreshed = await fetchProfile(user.id);
      Toast.show({ type: 'success', text1: 'Profile ready' });
      router.replace(
        destinationForProfile(
          refreshed ?? updated,
          user,
          useAuthStore.getState().isPlatformAdmin,
        ),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save profile');
    } finally {
      setSubmitting(false);
    }
  };

  const previewUri = localUri || avatarUrl || null;

  return (
    <View className="flex-1 bg-surface">
      <KeyboardAwareScrollView
        bottomOffset={24}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ flexGrow: 1 }}
        bounces={false}
      >
        <LinearGradient
          colors={[...Gradients.auth]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ paddingTop: 12, paddingBottom: 20 }}
        >
          <SafeAreaView edges={['top']}>
            <View className="px-6 pt-2">
              <Text
                className="mb-1 text-3xl text-white"
                style={{ fontFamily: FontFamily.display }}
              >
                Your face at the gate
              </Text>
              <Text className="text-sm text-white/85">
                Guards match residents visually — name and photo are required.
              </Text>
            </View>
          </SafeAreaView>
        </LinearGradient>

        <View className="-mt-4 flex-1 rounded-t-3xl bg-surface px-6 pb-10 pt-7">
          <Pressable
            onPress={() => void pickPhoto()}
            disabled={picking}
            className="mb-6 items-center"
          >
            <View className="relative">
              {previewUri ? (
                <Image
                  source={{ uri: previewUri }}
                  style={{ width: 112, height: 112, borderRadius: 56 }}
                  contentFit="cover"
                />
              ) : (
                <InitialsAvatar name={fullName || 'You'} size={112} />
              )}
              <View className="absolute bottom-0 right-0 h-9 w-9 items-center justify-center rounded-full bg-charcoal">
                {picking ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Camera color="#fff" size={16} />
                )}
              </View>
            </View>
            <Text className="mt-3 text-sm font-semibold text-brand-800">
              {previewUri ? 'Change photo' : 'Add face photo'}
            </Text>
            <Text className="mt-1 text-center text-xs text-ink-faint">
              Clear, front-facing, well lit — no group selfies
            </Text>
          </Pressable>

          <View className="mb-4 gap-2">
            <Text className="text-sm font-medium text-ink-soft">Full name</Text>
            <TextInput
              className="rounded-xl border border-surface-border bg-surface-card px-4 py-3 text-base text-ink"
              autoComplete="name"
              placeholder="Alex Kumar"
              placeholderTextColor="#94A3B8"
              value={fullName}
              onChangeText={setFullName}
            />
          </View>

          <View className="mb-6 gap-2">
            <Text className="text-sm font-medium text-ink-soft">Phone (recommended)</Text>
            <TextInput
              className="rounded-xl border border-surface-border bg-surface-card px-4 py-3 text-base text-ink"
              keyboardType="phone-pad"
              autoComplete="tel"
              placeholder="+91 98xxx xxxxx"
              placeholderTextColor="#94A3B8"
              value={phone}
              onChangeText={setPhone}
            />
            <Text className="text-xs text-ink-faint">
              Used by the office / gate to reach you. SMS OTP verification can be enabled later.
            </Text>
          </View>

          {error ? <Text className="mb-4 text-sm text-status-rejected">{error}</Text> : null}

          <Pressable
            className={`items-center rounded-bubbly bg-charcoal py-3.5 ${submitting ? 'opacity-70' : ''}`}
            disabled={submitting}
            onPress={() => void onContinue()}
            style={{
              shadowColor: Brand.charcoal,
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.22,
              shadowRadius: 12,
              elevation: 4,
            }}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-base font-semibold text-white">Save & continue</Text>
            )}
          </Pressable>
        </View>
      </KeyboardAwareScrollView>
    </View>
  );
}

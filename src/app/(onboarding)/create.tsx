import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
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

import { FontFamily, Gradients } from '@/constants/theme';
import { createSociety } from '@/lib/society-api';
import { useAuthStore } from '@/stores/authStore';

export default function CreateSocietyScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const fetchProfile = useAuthStore((s) => s.fetchProfile);

  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onCreate = async () => {
    setError(null);
    if (name.trim().length < 2) {
      setError('Enter a society name');
      return;
    }
    if (address.trim().length < 2) {
      setError('Enter the society address');
      return;
    }

    setSubmitting(true);
    try {
      const result = await createSociety({
        name: name.trim(),
        address: address.trim(),
      });
      if (user?.id) await fetchProfile(user.id);
      Toast.show({
        type: 'success',
        text1: 'Society created',
        text2: `Resident code: ${result.resident_invite_code}`,
      });
      router.replace('/(admin)/invites');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create society');
    } finally {
      setSubmitting(false);
    }
  };

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
              <Pressable onPress={() => router.back()} className="mb-4 self-start">
                <Text className="text-sm text-white/90">Back</Text>
              </Pressable>
              <Text
                className="mb-1 text-3xl text-white"
                style={{ fontFamily: FontFamily.display }}
              >
                Create society
              </Text>
              <Text className="text-sm text-white/85">
                You will be the admin. Share invite codes later.
              </Text>
            </View>
          </SafeAreaView>
        </LinearGradient>

        <View className="-mt-4 flex-1 rounded-t-3xl bg-surface px-6 pb-10 pt-7">
          <View className="mb-4 gap-2">
            <Text className="text-sm font-medium text-ink-soft">Society name</Text>
            <TextInput
              className="rounded-xl border border-surface-border bg-surface-card px-4 py-3 text-base text-ink"
              placeholder="Sunrise Heights"
              placeholderTextColor="#94A3B8"
              value={name}
              onChangeText={setName}
            />
          </View>

          <View className="mb-6 gap-2">
            <Text className="text-sm font-medium text-ink-soft">Address</Text>
            <TextInput
              className="rounded-xl border border-surface-border bg-surface-card px-4 py-3 text-base text-ink"
              placeholder="12 Palm Road, Pune"
              placeholderTextColor="#94A3B8"
              value={address}
              onChangeText={setAddress}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              style={{ minHeight: 88 }}
            />
          </View>

          {error ? <Text className="mb-4 text-sm text-status-rejected">{error}</Text> : null}

          <Pressable
            className={`items-center rounded-bubbly bg-charcoal py-3.5 ${submitting ? 'opacity-70' : ''}`}
            disabled={submitting}
            onPress={() => void onCreate()}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-base font-semibold text-white">Create & continue</Text>
            )}
          </Pressable>
        </View>
      </KeyboardAwareScrollView>
    </View>
  );
}

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

import { Brand, FontFamily } from '@/constants/theme';
import { authErrorMessage } from '@/lib/auth-errors';
import { destinationForProfile } from '@/lib/auth-routing';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';

export default function UpdatePasswordScreen() {
  const router = useRouter();
  const fetchProfile = useAuthStore((s) => s.fetchProfile);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async () => {
    setError(null);
    if (password.length < 8) {
      setError('Use at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Session expired. Open the reset link again.');

      const profile = await fetchProfile(user.id);
      const { isPlatformAdmin } = useAuthStore.getState();
      Toast.show({ type: 'success', text1: 'Password updated' });
      router.replace(destinationForProfile(profile, user, isPlatformAdmin));
    } catch (e) {
      setError(authErrorMessage(e as { message?: string }));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-surface">
      <KeyboardAwareScrollView
        contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingTop: 32 }}
        keyboardShouldPersistTaps="handled"
      >
        <Text className="text-3xl text-ink" style={{ fontFamily: FontFamily.display }}>
          Choose a new password
        </Text>
        <Text className="mt-2 text-base text-ink-muted">
          You&apos;re signed in via the reset link. Set a password to continue.
        </Text>

        <View className="mt-8">
          <Text className="mb-1 text-xs font-semibold uppercase text-ink-muted">
            New password
          </Text>
          <TextInput
            className="rounded-xl border border-surface-border bg-surface-card px-4 py-3.5 text-base text-ink"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            placeholder="At least 8 characters"
            placeholderTextColor="#94A3B8"
          />
          <Text className="mb-1 mt-3 text-xs font-semibold uppercase text-ink-muted">
            Confirm
          </Text>
          <TextInput
            className="rounded-xl border border-surface-border bg-surface-card px-4 py-3.5 text-base text-ink"
            secureTextEntry
            value={confirm}
            onChangeText={setConfirm}
            placeholder="Repeat password"
            placeholderTextColor="#94A3B8"
          />
          {error ? (
            <Text className="mt-2 text-sm text-status-rejected">{error}</Text>
          ) : null}
          <Pressable
            disabled={submitting}
            onPress={() => void onSubmit()}
            className="mt-6 items-center rounded-xl py-3.5"
            style={{ backgroundColor: Brand.primary }}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="font-semibold text-white">Save password</Text>
            )}
          </Pressable>
        </View>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}

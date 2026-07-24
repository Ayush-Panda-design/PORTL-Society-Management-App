import { Link, useRouter } from 'expo-router';
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
import { getAuthRedirectUrl } from '@/lib/auth-redirect';
import { supabase } from '@/lib/supabase';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const onSubmit = async () => {
    setError(null);
    const trimmed = email.trim();
    if (!trimmed) {
      setError('Enter the email for your Portl account.');
      return;
    }

    setSubmitting(true);
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(trimmed, {
        redirectTo: getAuthRedirectUrl(),
      });
      if (resetError) throw resetError;
      setSent(true);
      Toast.show({ type: 'success', text1: 'Check your email for a reset link' });
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
          Reset password
        </Text>
        <Text className="mt-2 text-base text-ink-muted" style={{ fontFamily: FontFamily.body }}>
          We&apos;ll email you a link to choose a new password.
        </Text>

        {sent ? (
          <View className="mt-8 rounded-2xl border border-brand-200 bg-brand-50 p-4">
            <Text className="text-base text-ink" style={{ fontFamily: FontFamily.heading }}>
              Link sent to {email.trim()}
            </Text>
            <Text className="mt-2 text-sm text-ink-muted">
              Open the email on this device, then set a new password in the app.
            </Text>
            <Pressable
              onPress={() => router.replace('/(auth)/login')}
              className="mt-4 items-center rounded-xl bg-brand-700 py-3"
            >
              <Text className="font-semibold text-white">Back to login</Text>
            </Pressable>
          </View>
        ) : (
          <View className="mt-8">
            <Text className="mb-1 text-xs font-semibold uppercase text-ink-muted">Email</Text>
            <TextInput
              className="rounded-xl border border-surface-border bg-surface-card px-4 py-3.5 text-base text-ink"
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor="#94A3B8"
            />
            {error ? (
              <Text className="mt-2 text-sm text-status-rejected">{error}</Text>
            ) : null}
            <Pressable
              disabled={submitting}
              onPress={() => void onSubmit()}
              className="mt-6 items-center rounded-xl bg-brand-700 py-3.5"
              style={{ backgroundColor: Brand.primary }}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="font-semibold text-white">Send reset link</Text>
              )}
            </Pressable>
            <Link href="/(auth)/login" asChild>
              <Pressable className="mt-4 items-center py-2">
                <Text className="text-brand-700">Back to login</Text>
              </Pressable>
            </Link>
          </View>
        )}
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}

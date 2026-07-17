import { LinearGradient } from 'expo-linear-gradient';
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

import { GateAuthIllustration } from '@/components/illustrations';
import { Brand, FontFamily, Gradients } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import type { UserRole } from '@/types/database';

export default function LoginScreen() {
  const router = useRouter();
  const fetchProfile = useAuthStore((s) => s.fetchProfile);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const redirectForRole = (role: UserRole | null) => {
    if (role === 'guard') router.replace('/(guard)');
    else if (role === 'admin') router.replace('/(admin)');
    else router.replace('/(resident)');
  };

  const onLogin = async () => {
    setError(null);
    setSubmitting(true);

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInError) {
        setError(signInError.message);
        return;
      }

      if (data.user) {
        const profile = await fetchProfile(data.user.id);
        redirectForRole(profile?.role ?? null);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to sign in');
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
          style={{ paddingTop: 12, paddingBottom: 28 }}
        >
          <SafeAreaView edges={['top']}>
            <View className="items-center px-6 pt-2">
              <Text
                className="mb-1 text-4xl text-white"
                style={{ fontFamily: FontFamily.display }}
              >
                Portl
              </Text>
              <Text className="mb-4 text-center text-sm text-teal-50/90">
                Your society gate, in your pocket
              </Text>
              <GateAuthIllustration width={260} height={150} />
            </View>
          </SafeAreaView>
        </LinearGradient>

        <View className="-mt-4 flex-1 rounded-t-3xl bg-surface px-6 pb-10 pt-8">
          <Text className="mb-6 text-base text-ink-soft">Sign in to your society account</Text>

          <View className="mb-4 gap-2">
            <Text className="text-sm font-medium text-ink-soft">Email</Text>
            <TextInput
              className="rounded-xl border border-surface-border bg-surface-card px-4 py-3 text-base text-ink"
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              placeholder="you@example.com"
              placeholderTextColor="#94A3B8"
              value={email}
              onChangeText={setEmail}
            />
          </View>

          <View className="mb-6 gap-2">
            <Text className="text-sm font-medium text-ink-soft">Password</Text>
            <TextInput
              className="rounded-xl border border-surface-border bg-surface-card px-4 py-3 text-base text-ink"
              secureTextEntry
              autoComplete="password"
              placeholder="••••••••"
              placeholderTextColor="#94A3B8"
              value={password}
              onChangeText={setPassword}
            />
          </View>

          {error ? <Text className="mb-4 text-sm text-status-rejected">{error}</Text> : null}

          <Pressable
            className={`items-center rounded-xl bg-accent-600 py-3.5 ${submitting ? 'opacity-70' : ''}`}
            disabled={submitting}
            onPress={onLogin}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-base font-semibold text-white">Sign in</Text>
            )}
          </Pressable>

          <View className="mt-6 flex-row justify-center gap-1">
            <Text className="text-ink-muted">New here?</Text>
            <Link href="/(auth)/signup" className="font-semibold" style={{ color: Brand.primary }}>
              Create account
            </Link>
          </View>
        </View>
      </KeyboardAwareScrollView>
    </View>
  );
}

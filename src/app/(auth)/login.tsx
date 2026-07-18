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
import { destinationForProfile } from '@/lib/auth-routing';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';

export default function LoginScreen() {
  const router = useRouter();
  const fetchProfile = useAuthStore((s) => s.fetchProfile);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onLogin = async () => {
    setError(null);
    setSubmitting(true);

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInError) {
        const msg = signInError.message.toLowerCase();
        if (msg.includes('email not confirmed') || msg.includes('confirm')) {
          router.replace({
            pathname: '/(auth)/verify-email',
            params: { email: email.trim() },
          });
          return;
        }
        setError(signInError.message);
        return;
      }

      if (data.user) {
        if (!data.user.email_confirmed_at) {
          router.replace({
            pathname: '/(auth)/verify-email',
            params: { email: email.trim() },
          });
          return;
        }
        const profile = await fetchProfile(data.user.id);
        router.replace(destinationForProfile(profile, data.user));
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
              <Text className="mb-4 text-center text-sm text-white/85">
                Your society gate, in your pocket
              </Text>
              <GateAuthIllustration width={260} height={150} />
            </View>
          </SafeAreaView>
        </LinearGradient>

        <View className="-mt-5 flex-1 rounded-t-[36px] bg-surface px-6 pb-10 pt-8">
          <Text
            className="mb-6 text-2xl text-ink"
            style={{ fontFamily: FontFamily.display }}
          >
            Welcome back
          </Text>

          <View className="mb-4 gap-2">
            <Text className="text-sm font-medium text-ink-soft">Email</Text>
            <TextInput
              className="rounded-soft border border-surface-border bg-surface-card px-4 py-3.5 text-base text-ink"
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              placeholder="you@example.com"
              placeholderTextColor="#9AAFA7"
              value={email}
              onChangeText={setEmail}
            />
          </View>

          <View className="mb-6 gap-2">
            <Text className="text-sm font-medium text-ink-soft">Password</Text>
            <TextInput
              className="rounded-soft border border-surface-border bg-surface-card px-4 py-3.5 text-base text-ink"
              secureTextEntry
              autoComplete="password"
              placeholder="••••••••"
              placeholderTextColor="#9AAFA7"
              value={password}
              onChangeText={setPassword}
            />
          </View>

          {error ? <Text className="mb-4 text-sm text-status-rejected">{error}</Text> : null}

          <Pressable
            className={`items-center rounded-bubbly bg-charcoal py-4 ${submitting ? 'opacity-70' : ''}`}
            disabled={submitting}
            onPress={onLogin}
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
              <Text
                className="text-base text-white"
                style={{ fontFamily: FontFamily.heading }}
              >
                Sign in
              </Text>
            )}
          </Pressable>

          <View className="mt-6 flex-row justify-center gap-1">
            <Text className="text-ink-muted">New here?</Text>
            <Link href="/(auth)/signup" className="font-semibold" style={{ color: Brand.primary }}>
              Create account
            </Link>
          </View>

          <Pressable onPress={() => router.replace('/(auth)/welcome')} className="mt-4 py-2">
            <Text className="text-center text-sm text-ink-faint">Back to welcome</Text>
          </Pressable>
        </View>
      </KeyboardAwareScrollView>
    </View>
  );
}

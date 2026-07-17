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
import { getAuthRedirectUrl } from '@/lib/auth-redirect';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import type { UserRole } from '@/types/database';

const ROLES: { value: UserRole; label: string; hint: string }[] = [
  { value: 'resident', label: 'Resident', hint: 'Flat owner / tenant' },
  { value: 'guard', label: 'Guard', hint: 'Gate & visitor checks' },
  { value: 'admin', label: 'Admin', hint: 'Society management' },
];

export default function SignupScreen() {
  const router = useRouter();
  const fetchProfile = useAuthStore((s) => s.fetchProfile);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('resident');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const redirectForRole = (nextRole: UserRole | null) => {
    if (nextRole === 'guard') router.replace('/(guard)');
    else if (nextRole === 'admin') router.replace('/(admin)');
    else router.replace('/(resident)');
  };

  const onSignup = async () => {
    setError(null);

    if (!fullName.trim()) {
      setError('Please enter your full name');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setSubmitting(true);

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: getAuthRedirectUrl(),
          data: { full_name: fullName.trim(), role },
        },
      });

      if (signUpError) {
        setError(signUpError.message);
        return;
      }

      if (data.user) {
        // Fallback if the DB trigger did not run / email confirmation is off
        if (data.session) {
          await supabase.from('profiles').upsert({
            id: data.user.id,
            role,
            full_name: fullName.trim(),
          });
          const profile = await fetchProfile(data.user.id);
          redirectForRole(profile?.role ?? role);
        } else {
          setError(
            'Check your email to confirm your account, then sign in. If the link opens localhost, update Supabase → Authentication → URL Configuration and sign up again.',
          );
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to sign up');
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
            <View className="items-center px-6 pt-2">
              <Text
                className="mb-1 text-4xl text-white"
                style={{ fontFamily: FontFamily.display }}
              >
                Portl
              </Text>
              <Text className="mb-3 text-center text-sm text-teal-50/90">
                Join your society at the gate
              </Text>
              <GateAuthIllustration width={220} height={120} />
            </View>
          </SafeAreaView>
        </LinearGradient>

        <View className="-mt-4 flex-1 rounded-t-3xl bg-surface px-6 pb-10 pt-7">
          <Text className="mb-5 text-base text-ink-soft">Create your society account</Text>

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

          <View className="mb-5 gap-2">
            <Text className="text-sm font-medium text-ink-soft">Password</Text>
            <TextInput
              className="rounded-xl border border-surface-border bg-surface-card px-4 py-3 text-base text-ink"
              secureTextEntry
              autoComplete="new-password"
              placeholder="••••••••"
              placeholderTextColor="#94A3B8"
              value={password}
              onChangeText={setPassword}
            />
          </View>

          <Text className="mb-3 text-sm font-medium text-ink-soft">I am a…</Text>
          <View className="mb-5 gap-2">
            {ROLES.map((item) => {
              const selected = role === item.value;
              return (
                <Pressable
                  key={item.value}
                  onPress={() => setRole(item.value)}
                  className={`rounded-xl border px-4 py-3 ${
                    selected
                      ? 'border-brand-700 bg-brand-50'
                      : 'border-surface-border bg-surface-card'
                  }`}
                >
                  <Text
                    className={`text-base font-semibold ${
                      selected ? 'text-brand-800' : 'text-ink'
                    }`}
                  >
                    {item.label}
                  </Text>
                  <Text className="text-sm text-ink-muted">{item.hint}</Text>
                </Pressable>
              );
            })}
          </View>

          {error ? <Text className="mb-4 text-sm text-status-rejected">{error}</Text> : null}

          <Pressable
            className={`items-center rounded-xl bg-accent-600 py-3.5 ${submitting ? 'opacity-70' : ''}`}
            disabled={submitting}
            onPress={onSignup}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-base font-semibold text-white">Create account</Text>
            )}
          </Pressable>

          <View className="mt-6 flex-row justify-center gap-1">
            <Text className="text-ink-muted">Already have an account?</Text>
            <Link href="/(auth)/login" className="font-semibold" style={{ color: Brand.primary }}>
              Sign in
            </Link>
          </View>
        </View>
      </KeyboardAwareScrollView>
    </View>
  );
}

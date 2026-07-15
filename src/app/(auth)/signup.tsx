import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { supabase } from '@/lib/supabase';
import { getAuthRedirectUrl } from '@/lib/auth-redirect';
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
          data: {
            full_name: fullName.trim(),
            role,
          },
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
    <SafeAreaView className="flex-1 bg-slate-50">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 32 }}
          keyboardShouldPersistTaps="handled"
        >
          <Text className="mb-2 text-4xl font-bold tracking-tight text-teal-800">Portl</Text>
          <Text className="mb-8 text-base text-slate-600">Create your society account</Text>

          <View className="mb-4 gap-2">
            <Text className="text-sm font-medium text-slate-700">Full name</Text>
            <TextInput
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900"
              autoComplete="name"
              placeholder="Alex Kumar"
              placeholderTextColor="#94A3B8"
              value={fullName}
              onChangeText={setFullName}
            />
          </View>

          <View className="mb-4 gap-2">
            <Text className="text-sm font-medium text-slate-700">Email</Text>
            <TextInput
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900"
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
            <Text className="text-sm font-medium text-slate-700">Password</Text>
            <TextInput
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900"
              secureTextEntry
              autoComplete="new-password"
              placeholder="••••••••"
              placeholderTextColor="#94A3B8"
              value={password}
              onChangeText={setPassword}
            />
          </View>

          <Text className="mb-3 text-sm font-medium text-slate-700">I am a…</Text>
          <View className="mb-6 gap-2">
            {ROLES.map((item) => {
              const selected = role === item.value;
              return (
                <Pressable
                  key={item.value}
                  onPress={() => setRole(item.value)}
                  className={`rounded-xl border px-4 py-3 ${
                    selected
                      ? 'border-teal-700 bg-teal-50'
                      : 'border-slate-200 bg-white'
                  }`}
                >
                  <Text
                    className={`text-base font-semibold ${
                      selected ? 'text-teal-800' : 'text-slate-800'
                    }`}
                  >
                    {item.label}
                  </Text>
                  <Text className="text-sm text-slate-500">{item.hint}</Text>
                </Pressable>
              );
            })}
          </View>

          {error ? <Text className="mb-4 text-sm text-red-600">{error}</Text> : null}

          <Pressable
            className={`items-center rounded-xl bg-teal-700 py-3.5 ${submitting ? 'opacity-70' : ''}`}
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
            <Text className="text-slate-600">Already have an account?</Text>
            <Link href="/(auth)/login" className="font-semibold text-teal-700">
              Sign in
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

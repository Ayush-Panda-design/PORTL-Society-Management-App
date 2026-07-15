import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

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
    <SafeAreaView className="flex-1 bg-slate-50">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1 justify-center px-6"
      >
        <Text className="mb-2 text-4xl font-bold tracking-tight text-teal-800">Portl</Text>
        <Text className="mb-8 text-base text-slate-600">Sign in to your society account</Text>

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
            autoComplete="password"
            placeholder="••••••••"
            placeholderTextColor="#94A3B8"
            value={password}
            onChangeText={setPassword}
          />
        </View>

        {error ? <Text className="mb-4 text-sm text-red-600">{error}</Text> : null}

        <Pressable
          className={`items-center rounded-xl bg-teal-700 py-3.5 ${submitting ? 'opacity-70' : ''}`}
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
          <Text className="text-slate-600">New here?</Text>
          <Link href="/(auth)/signup" className="font-semibold text-teal-700">
            Create account
          </Link>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

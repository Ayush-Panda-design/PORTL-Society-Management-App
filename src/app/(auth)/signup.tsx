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
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GateAuthIllustration } from '@/components/illustrations';
import { Brand, FontFamily, Gradients } from '@/constants/theme';
import { destinationForProfile } from '@/lib/auth-routing';
import { getAuthRedirectUrl } from '@/lib/auth-redirect';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';

export default function SignupScreen() {
  const router = useRouter();
  const fetchProfile = useAuthStore((s) => s.fetchProfile);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

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
          data: { full_name: fullName.trim(), role: 'resident' },
        },
      });

      if (signUpError) {
        setError(signUpError.message);
        return;
      }

      if (data.user) {
        if (data.session) {
          await supabase.from('profiles').upsert({
            id: data.user.id,
            role: 'resident',
            full_name: fullName.trim(),
            status: 'active',
          });
          const profile = await fetchProfile(data.user.id);
          router.replace(destinationForProfile(profile));
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
              <Text className="mb-3 text-center text-sm text-white/85">
                Create your account, then join or start a society
              </Text>
              <GateAuthIllustration width={220} height={120} />
            </View>
          </SafeAreaView>
        </LinearGradient>

        <View className="-mt-5 flex-1 rounded-t-[36px] bg-surface px-6 pb-10 pt-7">
          <Text
            className="mb-5 text-2xl text-ink"
            style={{ fontFamily: FontFamily.display }}
          >
            Create account
          </Text>

          <View className="mb-4 gap-2">
            <Text className="text-sm font-medium text-ink-soft">Full name</Text>
            <TextInput
              className="rounded-soft border border-surface-border bg-surface-card px-4 py-3.5 text-base text-ink"
              autoComplete="name"
              placeholder="Alex Kumar"
              placeholderTextColor="#9AAFA7"
              value={fullName}
              onChangeText={setFullName}
            />
          </View>

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
              autoComplete="new-password"
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
            onPress={() => void onSignup()}
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
                Create account
              </Text>
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

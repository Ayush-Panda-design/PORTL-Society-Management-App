import type { User } from '@supabase/supabase-js';
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
import Toast from 'react-native-toast-message';

import { GateAuthIllustration } from '@/components/illustrations';
import { Brand, FontFamily, Gradients } from '@/constants/theme';
import { authErrorMessage } from '@/lib/auth-errors';
import { destinationForProfile } from '@/lib/auth-routing';
import { getAuthRedirectUrl } from '@/lib/auth-redirect';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';

type AuthMethod = 'password' | 'otp';

export default function LoginScreen() {
  const router = useRouter();
  const fetchProfile = useAuthStore((s) => s.fetchProfile);
  const [method, setMethod] = useState<AuthMethod>('password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const trimmedEmail = email.trim();

  const finishSignIn = async (user: User) => {
    if (!user.email_confirmed_at) {
      router.replace({
        pathname: '/(auth)/verify-email',
        params: { email: trimmedEmail },
      });
      return;
    }
    const profile = await fetchProfile(user.id);
    router.replace(destinationForProfile(profile, user));
  };

  const onPasswordLogin = async () => {
    setError(null);
    setSubmitting(true);

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password,
      });

      if (signInError) {
        const msg = signInError.message.toLowerCase();
        if (msg.includes('email not confirmed') || msg.includes('confirm')) {
          router.replace({
            pathname: '/(auth)/verify-email',
            params: { email: trimmedEmail },
          });
          return;
        }
        setError(authErrorMessage(signInError));
        return;
      }

      if (data.user) {
        await finishSignIn(data.user);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to sign in');
    } finally {
      setSubmitting(false);
    }
  };

  const onSendOtp = async () => {
    setError(null);
    if (!trimmedEmail) {
      setError('Enter your email address');
      return;
    }

    setSubmitting(true);
    try {
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: trimmedEmail,
        options: {
          shouldCreateUser: false,
          emailRedirectTo: getAuthRedirectUrl(),
        },
      });

      if (otpError) {
        setError(authErrorMessage(otpError));
        return;
      }

      setOtpSent(true);
      setOtp('');
      Toast.show({
        type: 'success',
        text1: 'Code sent',
        text2: 'Check your inbox for a 6-digit code.',
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to send code');
    } finally {
      setSubmitting(false);
    }
  };

  const onVerifyOtp = async () => {
    setError(null);
    const token = otp.trim();
    if (token.length < 6) {
      setError('Enter the 6-digit code from your email');
      return;
    }

    setSubmitting(true);
    try {
      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        email: trimmedEmail,
        token,
        type: 'email',
      });

      if (verifyError) {
        setError(authErrorMessage(verifyError));
        return;
      }

      if (data.user) {
        await finishSignIn(data.user);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to verify code');
    } finally {
      setSubmitting(false);
    }
  };

  const switchMethod = (next: AuthMethod) => {
    setMethod(next);
    setError(null);
    setOtp('');
    setOtpSent(false);
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

          <View className="mb-5 flex-row rounded-soft border border-surface-border bg-surface-card p-1">
            <Pressable
              className={`flex-1 items-center rounded-soft py-2.5 ${
                method === 'password' ? 'bg-charcoal' : ''
              }`}
              onPress={() => switchMethod('password')}
            >
              <Text
                className={`text-sm font-semibold ${
                  method === 'password' ? 'text-white' : 'text-ink-muted'
                }`}
              >
                Password
              </Text>
            </Pressable>
            <Pressable
              className={`flex-1 items-center rounded-soft py-2.5 ${
                method === 'otp' ? 'bg-charcoal' : ''
              }`}
              onPress={() => switchMethod('otp')}
            >
              <Text
                className={`text-sm font-semibold ${
                  method === 'otp' ? 'text-white' : 'text-ink-muted'
                }`}
              >
                Email code
              </Text>
            </Pressable>
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
              editable={!otpSent || method === 'password'}
              onChangeText={setEmail}
            />
          </View>

          {method === 'password' ? (
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
          ) : otpSent ? (
            <View className="mb-6 gap-2">
              <Text className="text-sm font-medium text-ink-soft">6-digit code</Text>
              <TextInput
                className="rounded-soft border border-surface-border bg-surface-card px-4 py-3.5 text-center text-xl text-ink"
                style={{ letterSpacing: 8 }}
                autoComplete="one-time-code"
                keyboardType="number-pad"
                maxLength={8}
                placeholder="000000"
                placeholderTextColor="#9AAFA7"
                value={otp}
                onChangeText={setOtp}
              />
              <Text className="text-xs text-ink-muted">
                Sent to {trimmedEmail}. Codes expire after a few minutes.
              </Text>
            </View>
          ) : (
            <Text className="mb-6 text-sm leading-5 text-ink-muted">
              We&apos;ll email you a one-time code — no password needed.
            </Text>
          )}

          {error ? <Text className="mb-4 text-sm text-status-rejected">{error}</Text> : null}

          {method === 'password' ? (
            <Pressable
              className={`items-center rounded-bubbly bg-charcoal py-4 ${submitting ? 'opacity-70' : ''}`}
              disabled={submitting}
              onPress={() => void onPasswordLogin()}
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
          ) : (
            <>
              <Pressable
                className={`items-center rounded-bubbly bg-charcoal py-4 ${submitting ? 'opacity-70' : ''}`}
                disabled={submitting}
                onPress={() => void (otpSent ? onVerifyOtp() : onSendOtp())}
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
                    {otpSent ? 'Verify & sign in' : 'Send code'}
                  </Text>
                )}
              </Pressable>

              {otpSent ? (
                <View className="mt-4 flex-row justify-center gap-4">
                  <Pressable
                    disabled={submitting}
                    onPress={() => {
                      setOtpSent(false);
                      setOtp('');
                      setError(null);
                    }}
                  >
                    <Text className="text-sm font-semibold" style={{ color: Brand.primary }}>
                      Change email
                    </Text>
                  </Pressable>
                  <Pressable disabled={submitting} onPress={() => void onSendOtp()}>
                    <Text className="text-sm font-semibold" style={{ color: Brand.primary }}>
                      Resend code
                    </Text>
                  </Pressable>
                </View>
              ) : null}
            </>
          )}

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
